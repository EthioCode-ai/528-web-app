// Tokenization + phrase-subsequence matching. Used by
// doNotUseTopics matcher and by copied-evidence detection.
// See ADMISSIONS_COPILOT_GATE3_VALIDATION_CONTRACT_PLAN.md §6.2.

import { normalize } from "./normalize.js";

const TOKEN_SPLIT_RE = /[^\p{L}\p{N}']+/u;

/**
 * Normalize + split into alphanumeric-plus-apostrophe tokens.
 * Empty tokens are dropped.
 *
 * @param {string} input
 * @returns {string[]}
 */
export function tokenize(input) {
  return normalize(input).split(TOKEN_SPLIT_RE).filter(Boolean);
}

/**
 * Return true iff `phraseTokens` appears as a contiguous subsequence
 * of `haystackTokens`.
 *
 * @param {string[]} phraseTokens
 * @param {string[]} haystackTokens
 * @returns {boolean}
 */
export function phraseIsContiguousSubsequence(phraseTokens, haystackTokens) {
  const p = phraseTokens.length;
  const h = haystackTokens.length;
  if (p === 0 || h < p) return false;
  outer: for (let i = 0; i <= h - p; i++) {
    for (let j = 0; j < p; j++) {
      if (haystackTokens[i + j] !== phraseTokens[j]) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Find the FIRST contiguous span of length `spanLen` in `text`
 * matching any of the evidence narratives (post-tokenize). Returns
 * the match info or null.
 *
 * @param {string} draftText
 * @param {Array<{ evidenceId: string, narrative: string }>} evidenceItems
 * @param {number} [spanLen=15]
 * @returns {{ evidenceId: string, matchedTokens: string[] }|null}
 */
export function findCopiedEvidenceSpan(draftText, evidenceItems, spanLen = 15) {
  const draftTokens = tokenize(draftText);
  if (draftTokens.length < spanLen) return null;
  for (const item of evidenceItems) {
    const nt = tokenize(item.narrative);
    if (nt.length < spanLen) continue;
    for (let i = 0; i <= nt.length - spanLen; i++) {
      const span = nt.slice(i, i + spanLen);
      if (phraseIsContiguousSubsequence(span, draftTokens)) {
        return { evidenceId: item.evidenceId, matchedTokens: span };
      }
    }
  }
  return null;
}
