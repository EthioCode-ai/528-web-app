// Draft rule runner — §6. Consumes a normalized draft context and
// emits a list of rule violations. Callers decide UI treatment; the
// validator only classifies severity per rule.

import { rulesById } from "../rules.js";
import { renderMessage } from "../messages.js";
import { tokenize, phraseIsContiguousSubsequence, findCopiedEvidenceSpan } from "./tokenize.js";
import { classifyDraft } from "./draftClassifier.js";

const PLACEHOLDER_PHRASES = [
  ["the", "applicant"],
  ["fictional", "applicant"],
  ["applicant", "name"],
  ["tbd"],
];

const BRACKET_PLACEHOLDER_RE = /\[[^\]]{1,80}\]/;

/**
 * @typedef {Object} Draft
 * @property {string} draftId
 * @property {string} draftText
 * @property {number} wordCount
 * @property {number} charCount
 * @property {"applicant"|"agent"|"mixed"} authorType
 * @property {string[]} evidenceCitations
 * @property {string[]} schoolCitations
 * @property {"in-progress"|"ready-for-review"|"applicant-approved"} draftStatus
 * @property {Array<{ sentenceId: string, spanStart: number, spanEnd: number, classifiedAs: string, authorType: string, linkedEvidenceIds: string[], linkedCitationIds: string[] }>} [sentenceIndex]
 */

/**
 * @typedef {Object} ValidationContext
 * @property {{ wordLimit?: number|null, charLimit?: number|null }} prompt
 * @property {Array<{ evidenceId: string, confirmed: boolean, sensitivityTags: string[], narrative: string }>} evidenceItems
 * @property {Array<{ citationId: string, schoolScopeId: string|null }>} citations
 * @property {Array<{ topicKey: string, matchPhrases: string[] }>} doNotUseTopics
 * @property {{ evidenceUsage: Record<string, string[]> }} [cycleContext]
 * @property {"drafting"|"export"|"approval"} phase
 * @property {string} [linkedSchoolId]
 * @property {string} [schoolName]
 * @property {string[]} [keyPrograms]
 * @property {string[]} [facultyNames]
 */

/**
 * @param {Draft} draft
 * @param {ValidationContext} context
 * @returns {Array<ReturnType<typeof renderMessage> & { metadata?: Record<string, unknown> }>}
 */
export function validateDraft(draft, context) {
  const out = [];
  const push = (ruleId, metadata) => {
    const rule = rulesById[ruleId];
    if (!rule) return;
    if (rule.phase && rule.phase !== context.phase && !phaseSubsumes(rule.phase, context.phase)) {
      return;
    }
    out.push({ ...renderMessage(ruleId, metadata), metadata });
  };

  // ── length rules ────────────────────────────────────────────────
  if (context.prompt?.wordLimit && draft.wordCount > context.prompt.wordLimit) {
    push("draft.wordLimit.exceeded", {
      n: draft.wordCount - context.prompt.wordLimit,
      limit: context.prompt.wordLimit,
    });
  }
  if (context.prompt?.charLimit && draft.charCount > context.prompt.charLimit) {
    push("draft.charLimit.exceeded", {
      n: draft.charCount - context.prompt.charLimit,
      limit: context.prompt.charLimit,
    });
  }
  if (context.prompt?.wordLimit) {
    const pct = Math.round((draft.wordCount / context.prompt.wordLimit) * 100);
    if (draft.wordCount < 0.6 * context.prompt.wordLimit) push("draft.underfilled", { pct });
  }

  // ── citation rules ──────────────────────────────────────────────
  if (draft.evidenceCitations.length === 0) push("draft.evidence.missing", {});

  const evidenceById = new Map(context.evidenceItems.map((e) => [e.evidenceId, e]));
  for (const evid of draft.evidenceCitations) {
    const item = evidenceById.get(evid);
    if (!item) { push("draft.evidence.orphan", { evidenceId: evid }); continue; }
    if (!item.confirmed) push("draft.evidence.unconfirmed", { evidenceId: evid });
  }
  const citationSet = new Set(context.citations.map((c) => c.citationId));
  for (const cid of draft.schoolCitations) {
    if (!citationSet.has(cid)) push("draft.citation.orphan", { citationId: cid });
  }

  // ── forbidden content: doNotUseTopics ───────────────────────────
  const draftTokens = tokenize(draft.draftText);
  for (const topic of context.doNotUseTopics) {
    for (const phrase of topic.matchPhrases) {
      const phraseTokens = tokenize(phrase);
      if (phraseTokens.length && phraseIsContiguousSubsequence(phraseTokens, draftTokens)) {
        push("draft.doNotUseTopics.hit", { topicKey: topic.topicKey });
        break;
      }
    }
  }

  // ── placeholder / third-person ──────────────────────────────────
  for (const phrase of PLACEHOLDER_PHRASES) {
    if (phraseIsContiguousSubsequence(phrase, draftTokens)) {
      push("draft.placeholder.third-person", {});
      break;
    }
  }
  if (BRACKET_PLACEHOLDER_RE.test(draft.draftText)) {
    push("draft.placeholder.third-person", {});
  }

  // ── copied evidence ─────────────────────────────────────────────
  const copied = findCopiedEvidenceSpan(draft.draftText, context.evidenceItems, 15);
  if (copied) {
    if (context.phase === "approval") {
      push("draft.copied-evidence.export-block", { evidenceId: copied.evidenceId });
    } else {
      push("draft.copied-evidence", { evidenceId: copied.evidenceId });
    }
  }

  // ── sentence-scoped rules ───────────────────────────────────────
  const sentences = draft.sentenceIndex && draft.sentenceIndex.length
    ? draft.sentenceIndex.map((s) => ({
        classifiedAs: s.classifiedAs,
        authorType: s.authorType,
        linkedEvidenceIds: s.linkedEvidenceIds || [],
        linkedCitationIds: s.linkedCitationIds || [],
      }))
    : classifyDraft(draft.draftText, {
        authorType: draft.authorType,
        schoolName: context.schoolName,
        keyPrograms: context.keyPrograms,
        facultyNames: context.facultyNames,
      }).map((s) => ({
        classifiedAs: s.classifiedAs,
        authorType: s.authorType,
        linkedEvidenceIds: [],
        linkedCitationIds: [],
      }));

  for (const s of sentences) {
    if (s.classifiedAs === "applicant-claim") {
      if (s.linkedEvidenceIds.length === 0) push("draft.claim.uncited", {});
      // interview-defensibility split
      const linkedItems = s.linkedEvidenceIds
        .map((id) => evidenceById.get(id))
        .filter(Boolean);
      const badItems = linkedItems.filter(
        (e) => !e.confirmed || (e.sensitivityTags || []).some((t) => t !== "none")
      );
      if (linkedItems.length && badItems.length) {
        push("draft.interview-defensibility.unconfirmed-sensitive", {});
      } else if (linkedItems.length && linkedItems.every((e) => (e.narrative || "").length < 200)) {
        push("draft.interview-defensibility.thin", {});
      }
    } else if (s.classifiedAs === "school-claim") {
      if (s.linkedCitationIds.length === 0) {
        if (s.authorType === "agent") {
          push("draft.school-claim.agent-uncited", {});
        } else {
          push("draft.school-claim.applicant-uncited", {});
        }
      }
    }
  }

  // ── repeated story ──────────────────────────────────────────────
  if (context.cycleContext?.evidenceUsage) {
    for (const evid of draft.evidenceCitations) {
      const others = (context.cycleContext.evidenceUsage[evid] || []).filter(
        (d) => d !== draft.draftId
      );
      if (others.length >= 2) push("draft.repeated-story", { n: others.length });
    }
  }

  return out;
}

function phaseSubsumes(rulePhase, contextPhase) {
  // A rule tagged "export" also fires during "approval" (approval is
  // strictly stricter than export in this pipeline).
  if (rulePhase === "export" && contextPhase === "approval") return true;
  return false;
}
