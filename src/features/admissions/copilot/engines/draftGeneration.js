// Engine 4 — deterministic draft generation.
//
// Cody verdict: rewrite. Gate 4 supports ONE prompt category only:
// mission-fit. Per locked v0.2 decision 6, other categories are
// future work.
//
// Locked v0.2 decision 5: target 6–8 sentences at ~70–90% of the
// prompt limit. This engine emits 8 sentences and interleaves
// primary/secondary evidence and the primary/second fit statement.
//
// Locked v0.2 decision 7: no verbatim fallback. If an evidenceType
// has no curated paraphrase in EVIDENCE_ROLE_PHRASE, the engine
// throws — never copies from evidence.narrative.

import { v5 as uuidv5 } from "uuid";
import { draftSchema } from "../../validation/entities/drafts.js";
import {
  EVIDENCE_ROLE_PHRASE,
  DEFAULT_MISSION_FIT_TEMPLATE_ID,
  GATE4_TEMPLATE_NAMESPACE_UUID,
} from "../constants.js";

function getEvidenceRolePhrase(evidenceItem) {
  const phrase = EVIDENCE_ROLE_PHRASE[evidenceItem.evidenceType];
  if (!phrase) {
    // Locked v0.2 decision 7: warn/block rather than paraphrase
    // awkwardly or copy verbatim.
    throw new Error(
      "draftGeneration: no curated paraphrase for evidenceType " +
        `"${evidenceItem.evidenceType}" (${evidenceItem.evidenceId}). ` +
        "Add an entry to EVIDENCE_ROLE_PHRASE before this evidence " +
        "can be cited in a draft."
    );
  }
  return phrase;
}

function buildMissionFitSentences({
  schoolName, programName, primary, secondary, primaryCitationId,
}) {
  const primaryPhrase = getEvidenceRolePhrase(primary);
  const secondaryPhrase = getEvidenceRolePhrase(secondary);
  return [
    {
      raw:
        `I chose to pursue medicine after ${primaryPhrase}, ` +
        `where I learned that community health is built one careful encounter at a time.`,
      classifiedAs: "applicant-claim",
      authorType: "agent",
      linkedEvidenceIds: [primary.evidenceId],
      linkedCitationIds: [],
    },
    {
      raw: `At ${schoolName}, the ${programName} would extend that work.`,
      classifiedAs: "school-claim",
      authorType: "agent",
      linkedEvidenceIds: [],
      linkedCitationIds: [primaryCitationId],
    },
    {
      raw:
        `I have ${secondaryPhrase}, ` +
        `a role that taught me how to hold high standards while creating room for questions.`,
      classifiedAs: "applicant-claim",
      authorType: "agent",
      linkedEvidenceIds: [secondary.evidenceId],
      linkedCitationIds: [],
    },
    {
      raw:
        `That experience keeps returning me to the same commitment: ` +
        `to build long relationships with the people I serve.`,
      classifiedAs: "narrative",
      authorType: "agent",
      linkedEvidenceIds: [],
      linkedCitationIds: [],
    },
    {
      raw: `The ${programName} at ${schoolName} makes that possible in the way it structures the clinical year.`,
      classifiedAs: "school-claim",
      authorType: "agent",
      linkedEvidenceIds: [],
      linkedCitationIds: [primaryCitationId],
    },
    {
      raw:
        `I have learned to slow the room down when a peer is stuck, to summarize what we covered, ` +
        `and to end each session with a small win the group can carry into the week.`,
      classifiedAs: "applicant-claim",
      authorType: "agent",
      linkedEvidenceIds: [secondary.evidenceId],
      linkedCitationIds: [],
    },
    {
      raw:
        `Together those habits are why I feel prepared to meet the pace ${schoolName} expects.`,
      classifiedAs: "school-claim",
      authorType: "agent",
      linkedEvidenceIds: [],
      linkedCitationIds: [primaryCitationId],
    },
    {
      raw: `I am ready to bring that patience and rigor to the classes I would join at ${schoolName}.`,
      classifiedAs: "school-claim",
      authorType: "agent",
      linkedEvidenceIds: [],
      linkedCitationIds: [primaryCitationId],
    },
  ];
}

function assembleDraft({ promptId, templateId, sentences, seed }) {
  let cursor = 0;
  const sentenceIndex = sentences.map((s, i) => {
    const spanStart = cursor;
    const spanEnd = spanStart + s.raw.length;
    cursor = spanEnd + 1; // account for joining space
    return {
      sentenceId: uuidv5(
        `${templateId}::${promptId}::${i}::${seed}`,
        GATE4_TEMPLATE_NAMESPACE_UUID
      ),
      spanStart,
      spanEnd,
      classifiedAs: s.classifiedAs,
      authorType: s.authorType,
      linkedEvidenceIds: [...s.linkedEvidenceIds],
      linkedCitationIds: [...s.linkedCitationIds],
    };
  });
  const draftText = sentences.map((s) => s.raw).join(" ");
  const wordCount = draftText.trim().split(/\s+/).filter(Boolean).length;
  return {
    draftText,
    wordCount,
    charCount: draftText.length,
    sentenceIndex,
  };
}

/**
 * @param {object} inputs
 * @param {object} inputs.prompt validated secondaryPrompt
 * @param {object} inputs.schoolListEntry
 * @param {object[]} inputs.evidenceItems
 * @param {object} inputs.matches ranked matches from storyMatch
 * @param {object} inputs.fitBrief SchoolFitBrief from schoolFit
 * @param {number} inputs.seed
 * @returns validated draft
 */
export function runDraftGeneration(inputs) {
  const { prompt, schoolListEntry, evidenceItems, matches, fitBrief, seed } = inputs;
  if (prompt.category !== "mission-fit") {
    throw new Error(
      `draftGeneration: Gate 4 supports only mission-fit; got "${prompt.category}".`
    );
  }
  if (!matches || !Array.isArray(matches.matches) || matches.matches.length < 2) {
    throw new Error("draftGeneration: need ≥ 2 story matches");
  }
  if (!fitBrief || fitBrief.fitStatements.length === 0) {
    throw new Error("draftGeneration: fitBrief has no statements");
  }
  const evidenceById = new Map(evidenceItems.map((e) => [e.evidenceId, e]));
  const primary = evidenceById.get(matches.matches[0].evidenceId);
  const secondary = evidenceById.get(matches.matches[1].evidenceId);
  if (!primary || !secondary) {
    throw new Error("draftGeneration: story matches reference unknown evidence");
  }
  const primaryFit = fitBrief.fitStatements[0];
  const primaryCitationId = primaryFit.citationRefs[0];
  const sentences = buildMissionFitSentences({
    schoolName: schoolListEntry.officialSchoolName,
    programName: primaryFit.programName,
    primary,
    secondary,
    primaryCitationId,
  });
  const assembled = assembleDraft({
    promptId: prompt.promptId,
    templateId: DEFAULT_MISSION_FIT_TEMPLATE_ID,
    sentences,
    seed,
  });

  // Aggregate evidence + citation IDs from sentenceIndex.
  const evidenceCitations = Array.from(
    new Set(assembled.sentenceIndex.flatMap((s) => s.linkedEvidenceIds))
  );
  const schoolCitations = Array.from(
    new Set(assembled.sentenceIndex.flatMap((s) => s.linkedCitationIds))
  );

  const draftId = uuidv5(
    `draft::${prompt.promptId}::${seed}`,
    GATE4_TEMPLATE_NAMESPACE_UUID
  );

  const draft = {
    draftId,
    promptId: prompt.promptId,
    entityVersion: "v1",
    draftText: assembled.draftText,
    wordCount: assembled.wordCount,
    charCount: assembled.charCount,
    authorType: "agent",
    evidenceCitations,
    schoolCitations,
    draftStatus: "in-progress",
    versionNumber: 1,
    sentenceIndex: assembled.sentenceIndex,
  };

  return draftSchema.parse(draft);
}
