// Rule-based sentence classifier. See §6.5.
// No external LLM, no external API.

import policy from "../admissionsPolicySnapshot.js";
import { normalize, } from "./normalize.js";
import { tokenize } from "./tokenize.js";

const CLAIM_VERBS_SET = new Set(policy.claimVerbs.map((v) => v.toLowerCase()));
const FIRST_PERSON_SUBJECTS = new Set(["i", "my", "mine", "me", "we", "our", "ours"]);

const QUANTITY_UNIT_RE =
  /\b\d+\s*(hours?|patients?|clients?|students?|residents?|publications?|papers?|posters?|presentations?|sessions?|shifts?|visits?|volunteers?)\b/;

/**
 * Split a normalized text into simple sentences on `.!?` boundaries.
 * We keep the original spans so the validator can point back at the
 * source text.
 *
 * @param {string} rawText
 * @returns {Array<{ raw: string, spanStart: number, spanEnd: number }>}
 */
export function splitIntoSentences(rawText) {
  if (typeof rawText !== "string") return [];
  const out = [];
  let start = 0;
  const re = /([.!?])(\s+|$)/g;
  let m;
  while ((m = re.exec(rawText)) !== null) {
    const end = m.index + 1;
    const raw = rawText.slice(start, end).trim();
    if (raw) out.push({ raw, spanStart: start, spanEnd: end });
    start = re.lastIndex;
  }
  if (start < rawText.length) {
    const raw = rawText.slice(start).trim();
    if (raw) out.push({ raw, spanStart: start, spanEnd: rawText.length });
  }
  return out;
}

/**
 * Classify a single sentence. Never labels a non-claim as a claim; but
 * intentionally over-recall (false positives acceptable, false negatives
 * are not).
 *
 * @param {string} sentence
 * @param {Object} [context]
 * @param {string} [context.schoolName]
 * @param {string[]} [context.keyPrograms]
 * @param {string[]} [context.facultyNames]
 * @returns {"applicant-claim"|"school-claim"|"narrative"|"connector"}
 */
export function classifySentence(sentence, context) {
  const normalized = normalize(sentence);
  const tokens = tokenize(sentence);

  const isSchoolClaim = looksLikeSchoolClaim(normalized, context);
  if (isSchoolClaim) return "school-claim";

  const isApplicantClaim = looksLikeApplicantClaim(tokens, normalized);
  if (isApplicantClaim) return "applicant-claim";

  if (tokens.length < 4) return "connector";
  return "narrative";
}

function looksLikeApplicantClaim(tokens, normalized) {
  const hasFirstPerson = tokens.some((t) => FIRST_PERSON_SUBJECTS.has(t));
  if (!hasFirstPerson) return false;
  const hasClaimVerb = tokens.some((t) => CLAIM_VERBS_SET.has(t));
  const hasQuantity = QUANTITY_UNIT_RE.test(normalized);
  return hasClaimVerb || hasQuantity;
}

function looksLikeSchoolClaim(normalized, context) {
  if (!context) return false;
  const { schoolName, keyPrograms, facultyNames } = context;
  if (schoolName && normalized.includes(normalize(schoolName))) return true;
  if (keyPrograms) {
    for (const p of keyPrograms) if (p && normalized.includes(normalize(p))) return true;
  }
  if (facultyNames) {
    for (const f of facultyNames) if (f && normalized.includes(normalize(f))) return true;
  }
  return false;
}

/**
 * Build a sentence index for a whole draft. Callers supply the
 * school-level context so school claims can be detected.
 *
 * @param {string} draftText
 * @param {Object} context
 * @param {"applicant"|"agent"|"mixed"} [context.authorType="applicant"]
 * @param {string} [context.schoolName]
 * @param {string[]} [context.keyPrograms]
 * @param {string[]} [context.facultyNames]
 * @returns {Array<{ raw: string, spanStart: number, spanEnd: number, classifiedAs: string, authorType: string }>}
 */
export function classifyDraft(draftText, context) {
  const authorType = context?.authorType || "applicant";
  return splitIntoSentences(draftText).map((s) => ({
    ...s,
    classifiedAs: classifySentence(s.raw, context),
    authorType,
  }));
}
