// Engine 1 — deterministic prompt interpretation.
//
// Cody verdict: rewrite (Cody used an LLM; Gate 4 uses a fixed
// mapping). See Gate 4 salvage audit §2.1.
//
// Given a Zod-valid secondaryPrompt + schoolResearch, this engine
// emits a promptInterpretation whose keyAxes intersect the school's
// fitAxes AND whose category-shaped interpretation string is
// assembled from a frozen template.
//
// No LLM, no provider, no fetch, no Math.random, no Date.now.

import { v5 as uuidv5 } from "uuid";
import { promptInterpretationSchema } from "../../validation/entities/promptInterpretations.js";
import { GATE4_RUN_NAMESPACE_UUID } from "../constants.js";

const CATEGORY_TO_INTERPRETATION = Object.freeze({
  "mission-fit":
    "The prompt asks how the applicant will contribute to the school's mission " +
    "through service and integrated learning.",
  "diversity":
    "The prompt asks about the applicant's identity and lived experience and " +
    "how it will shape the community they enter.",
  "challenge":
    "The prompt asks about a specific challenge the applicant faced and the " +
    "concrete outcome they produced.",
  "mission-fit-service":
    "The prompt asks how the applicant will contribute to the school's " +
    "community-service mission.",
  "leadership":
    "The prompt asks about a decision the applicant led and what it cost them.",
  "research":
    "The prompt asks about the applicant's research trajectory and where they " +
    "want it to go at this school.",
  "service":
    "The prompt asks about a service commitment the applicant sustained.",
  "covid":
    "The prompt asks how the pandemic reshaped the applicant's approach to " +
    "medicine.",
  "pandemic-impact":
    "The prompt asks about a concrete change the applicant made because of the pandemic.",
  "optional-additional":
    "The prompt asks for anything material not covered elsewhere.",
  "why-us":
    "The prompt asks why this school specifically, cited to specific programs and features.",
  "other":
    "The prompt asks the applicant to reflect on a matter the reader will want documented.",
});

const CATEGORY_TO_THEMES = Object.freeze({
  "mission-fit": ["community-service", "underserved-populations", "primary-care-emphasis"],
  "diversity": ["identity-first-person", "community-service"],
  "challenge": ["leadership", "personal-inflection"],
  "leadership": ["leadership", "mentorship-given"],
  "research": ["research-strength"],
  "service": ["community-service", "service-hours"],
  "covid": ["pandemic-impact"],
  "pandemic-impact": ["pandemic-impact"],
  "optional-additional": ["other"],
  "why-us": ["mission-service", "curriculum-integration"],
  "other": ["other"],
});

function pickKeyAxes(category, schoolFitAxes) {
  const known = new Set(schoolFitAxes.map((a) => a.axisKey));
  const preferred = {
    "mission-fit": ["mission-service", "curriculum-integration"],
    "why-us": ["mission-service", "curriculum-integration"],
    "diversity": ["diversity-culture"],
    "research": ["research-strength"],
    "leadership": ["mission-service"],
    "service": ["mission-service"],
  }[category] || ["mission-service"];
  const filtered = preferred.filter((k) => known.has(k));
  if (filtered.length > 0) return filtered;
  return schoolFitAxes.slice(0, 2).map((a) => a.axisKey);
}

/**
 * @param {object} inputs
 * @param {object} inputs.prompt         validated secondaryPrompt
 * @param {object} inputs.schoolResearch validated schoolResearch
 * @returns {object} promptInterpretation
 */
export function runPromptInterpretation(inputs) {
  const { prompt, schoolResearch } = inputs;
  const category = prompt.category;
  const interpretation = CATEGORY_TO_INTERPRETATION[category];
  if (!interpretation) {
    throw new Error(
      `promptInterpretation: unsupported prompt.category "${category}". ` +
        "Only mission-fit is guaranteed for Gate 4; extend " +
        "CATEGORY_TO_INTERPRETATION to cover others."
    );
  }
  const keyAxes = pickKeyAxes(category, schoolResearch.fitAxes);
  const expectedThemes = CATEGORY_TO_THEMES[category] || CATEGORY_TO_THEMES["other"];
  const interpretationId = uuidv5(
    `promptInterpretation::${prompt.promptId}`,
    GATE4_RUN_NAMESPACE_UUID
  );
  const out = {
    interpretationId,
    promptId: prompt.promptId,
    entityVersion: "v1",
    interpretation,
    keyAxes,
    expectedThemes,
    confirmed: true,
  };
  return promptInterpretationSchema.parse(out);
}
