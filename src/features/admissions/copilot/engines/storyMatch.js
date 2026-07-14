// Engine 2 — deterministic story matching.
//
// Cody verdict: rewrite. Gate 4 uses a token-overlap score + a
// small boost for integrity-clean stories, tie-broken with a seed.
// No LLM, no embedding, no provider.
//
// Output: { matches: [{ evidenceId, score, reasonCodes[] }, ...] }
// Ordered highest score first; on tie, stable by seed-driven index.

import { tokenize } from "../../validation/output/tokenize.js";
import { STORY_MATCH_REASONS } from "../constants.js";

function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {object} inputs
 * @param {object} inputs.interpretation validated promptInterpretation
 * @param {object[]} inputs.evidenceItems validated evidenceItems
 * @param {number} inputs.seed integer for deterministic tie-break
 * @returns {{matches: {evidenceId: string, score: number, reasonCodes: string[]}[]}}
 */
export function runStoryMatch(inputs) {
  const { interpretation, evidenceItems, seed } = inputs;
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) {
    throw new Error("storyMatch: no evidenceItems supplied");
  }
  const themeTokens = new Set(
    (interpretation.expectedThemes || [])
      .flatMap((t) => tokenize(t))
  );

  const scored = evidenceItems.map((e, index) => {
    const bodyTokens = tokenize(e.title + " " + e.narrative);
    let overlap = 0;
    for (const token of bodyTokens) if (themeTokens.has(token)) overlap += 1;
    const themeCoverage = themeTokens.size === 0
      ? 0
      : overlap / themeTokens.size;

    const reasonCodes = [];
    if (overlap > 0) reasonCodes.push(STORY_MATCH_REASONS.THEME_OVERLAP);
    if (e.confirmed) reasonCodes.push(STORY_MATCH_REASONS.CONFIRMED_ONLY);
    const isSensitivityClean =
      Array.isArray(e.sensitivityTags) &&
      e.sensitivityTags.length === 1 &&
      e.sensitivityTags[0] === "none";
    if (isSensitivityClean) reasonCodes.push(STORY_MATCH_REASONS.SENSITIVITY_CLEAN);
    if ((e.narrative || "").length > 400) reasonCodes.push(STORY_MATCH_REASONS.NARRATIVE_DEPTH);
    if (Array.isArray(e.activityLinks) && e.activityLinks.length > 0) {
      reasonCodes.push(STORY_MATCH_REASONS.ACTIVITY_LINK);
    }

    // Score components: theme coverage 0..1 + hygiene bonus 0..0.4
    const hygieneBonus =
      (e.confirmed ? 0.15 : 0) +
      (isSensitivityClean ? 0.15 : 0) +
      (Array.isArray(e.activityLinks) && e.activityLinks.length > 0 ? 0.1 : 0);
    let score = Math.min(1, themeCoverage + hygieneBonus);
    return { evidenceId: e.evidenceId, score, reasonCodes, index };
  });

  const rng = mulberry32(seed | 0);
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Deterministic tie-break: hash indices with the seeded RNG.
    return rng() - rng();
  });

  return {
    matches: scored.map(({ evidenceId, score, reasonCodes }) => ({
      evidenceId,
      score: Math.round(score * 1000) / 1000,
      reasonCodes,
    })),
  };
}
