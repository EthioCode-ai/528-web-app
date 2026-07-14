// Deterministic flow / template constants for the Gate 4 fictional
// end-to-end run.
//
// Discipline (locked v0.2 decision 4):
//   • THIS file holds flow constants and template phrasing tables.
//   • Externally governed policy (MCAT ranges, AAMC caps, etc.) lives
//     in src/features/admissions/validation/admissionsPolicySnapshot.js.
//   • True validation rule metadata lives in
//     src/features/admissions/validation/rules.js.
//
// Nothing in this file is user-authored applicant data.

import { EVIDENCE_TYPES } from "../validation/entities/evidenceBank.js";

export const GATE4_RUN_SEED = 528;

export const GATE4_TEMPLATE_NAMESPACE_UUID =
  "cd7e4d0b-528a-4b12-9c1e-0da49cf2c4c0";

export const GATE4_RUN_NAMESPACE_UUID =
  "d5b7a13e-ea28-4b5a-b0a2-c31c4c2a5e2f";

export const DEFAULT_MISSION_FIT_TEMPLATE_ID =
  "gate4.draftTemplate.missionFit@v1";

// Deterministic short paraphrase per evidence type. Each phrase is
// intentionally short, first-person-role-shaped, and semantically
// distant from any narrative in the synthetic fixtures so Gate 3's
// draft.copied-evidence (15-token contiguous span match) cannot fire.
//
// Per locked v0.2 decision 7: an evidenceType with no curated phrase
// MUST warn/block — no verbatim fallback. See engines/draftGeneration.js
// getEvidenceRolePhrase() for the enforcement point.
export const EVIDENCE_ROLE_PHRASE = Object.freeze({
  "clinical-encounter":
    "supporting a resident through a pediatric encounter",
  "research-outcome":
    "helping author a lab protocol under a mentor's review",
  "community-impact":
    "volunteering with a local outreach team on weekends",
  "leadership-decision":
    "leading a small team through a hard call one summer",
  "personal-inflection":
    "learning from a difficult moment early in college",
  "academic-achievement":
    "chasing a stubborn statistics problem across an entire semester",
  "mentorship-given":
    "tutoring premed peers for two years",
  "mentorship-received":
    "training under a physician who taught me to slow down",
  "service-hours":
    "showing up weekly at a community service site for a full year",
  "other":
    "working in a role that shaped my sense of medicine",
});

// Sanity check at module load: every EVIDENCE_TYPES key has a phrase.
// If someone extends EVIDENCE_TYPES without updating this map, the
// module refuses to load rather than silently falling back to prose.
{
  const missing = EVIDENCE_TYPES.filter((t) => !EVIDENCE_ROLE_PHRASE[t]);
  if (missing.length > 0) {
    throw new Error(
      "EVIDENCE_ROLE_PHRASE is missing entries for evidenceType(s): " +
        missing.join(", ") +
        ". Add a curated first-person phrase to " +
        "src/features/admissions/copilot/constants.js before merging."
    );
  }
}

// Frozen fit-axis → brief-sentence template. Used by the school-fit
// engine to produce a short, cite-attached statement per axis.
// {schoolName} and {programName} are interpolated at emission time.
export const AXIS_TO_BRIEF_TEMPLATE = Object.freeze({
  "curriculum-integration":
    "{schoolName} integrates clinical exposure early through the {programName}.",
  "clinical-exposure-early":
    "The {programName} places students in patient-facing settings from the first year.",
  "research-strength":
    "The {programName} at {schoolName} offers a route into translational research.",
  "mission-service":
    "{schoolName}'s stated mission around community service is served by the {programName}.",
  "urban-underserved":
    "The {programName} places students at urban-underserved sites.",
  "rural-underserved":
    "The {programName} places students at rural-underserved sites.",
  "primary-care-emphasis":
    "{schoolName} emphasizes primary care preparation through the {programName}.",
  "specialty-track":
    "The {programName} exposes students to specialty tracks earlier than most.",
  "dual-degree":
    "The {programName} supports dual-degree pathways.",
  "small-cohort":
    "{schoolName}'s cohort size supports the mentorship style described in the {programName}.",
  "geographic-fit":
    "{schoolName} anchors the applicant to a region they already know.",
  "financial-fit":
    "{schoolName}'s financial-aid structure supports the applicant's plan.",
  "diversity-culture":
    "The {programName} contributes to the diversity culture described by {schoolName}.",
  "wellness-support":
    "{schoolName}'s wellness supports are consistent with the applicant's needs.",
  "other":
    "The {programName} at {schoolName} matches an axis the applicant values.",
});

// Interview-format-specific question stems for each fit axis.
// Every generated question carries a citation from the school and
// an expected-themes list.
export const AXIS_TO_QUESTION_TEMPLATE = Object.freeze({
  "curriculum-integration": {
    stem: "How would you use the {programName} to shape your first two years?",
    themes: ["curriculum-integration", "clinical-exposure-early"],
  },
  "mission-service": {
    stem: "Tell us about a time you served a community and what you learned.",
    themes: ["mission-service", "community-service"],
  },
  "research-strength": {
    stem: "What research question would you pursue in the {programName}?",
    themes: ["research-strength"],
  },
  "primary-care-emphasis": {
    stem: "How does {schoolName}'s primary care emphasis fit your goals?",
    themes: ["primary-care-emphasis"],
  },
  "urban-underserved": {
    stem: "Describe your exposure to urban-underserved care.",
    themes: ["urban-underserved"],
  },
  "rural-underserved": {
    stem: "Describe your exposure to rural-underserved care.",
    themes: ["rural-underserved"],
  },
  "clinical-exposure-early": {
    stem: "What kind of early clinical exposure has shaped you so far?",
    themes: ["clinical-exposure-early"],
  },
  "specialty-track": {
    stem: "Which specialty tracks in the {programName} interest you and why?",
    themes: ["specialty-track"],
  },
  "dual-degree": {
    stem: "Would you pursue a dual degree at {schoolName}? Which?",
    themes: ["dual-degree"],
  },
  "small-cohort": {
    stem: "What draws you to a smaller cohort at {schoolName}?",
    themes: ["small-cohort"],
  },
  "geographic-fit": {
    stem: "How does the region around {schoolName} fit your plan?",
    themes: ["geographic-fit"],
  },
  "financial-fit": {
    stem: "Have you considered how you would fund medical education at {schoolName}?",
    themes: ["financial-fit"],
  },
  "diversity-culture": {
    stem: "How would you contribute to the diversity culture at {schoolName}?",
    themes: ["diversity-culture"],
  },
  "wellness-support": {
    stem: "How do you think about wellness during a demanding first year?",
    themes: ["wellness-support"],
  },
  "other":
    { stem: "Tell us more about an aspect of {schoolName} you value.", themes: ["other"] },
});

// Story-match reason codes — small enum surfaced in the story-match panel.
export const STORY_MATCH_REASONS = Object.freeze({
  THEME_OVERLAP: "theme-overlap",
  CONFIRMED_ONLY: "confirmed-only",
  SENSITIVITY_CLEAN: "sensitivity-clean",
  NARRATIVE_DEPTH: "narrative-depth",
  ACTIVITY_LINK: "activity-link",
});

export const RUN_PHASE = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  INTERPRETING: "interpreting",
  MATCHING: "matching",
  FITTING: "fitting",
  DRAFTING: "drafting",
  CHECKING: "checking",
  INTERVIEWING: "interviewing",
  DONE: "done",
  ERROR: "error",
});
