// Versioned snapshot of externally governed admissions policy.
//
// This file is the ONLY place per-cycle external limits live. Every
// entity schema and every validator imports from here. Bumps require
// a matching entry in contract/review-log.md and a new
// snapshotVersion string. See ADMISSIONS_COPILOT_GATE3_VALIDATION_CONTRACT_PLAN.md §1.17.

const SUPPORTED_CYCLES = ["2024-2025", "2025-2026", "2026-2027"];

const AMCAS_EXPERIENCE_TYPES = [
  "artistic-endeavors",
  "community-service-medical",
  "community-service-non-medical",
  "conferences-attended",
  "hobbies",
  "honors-awards-recognitions",
  "intercollegiate-athletics",
  "leadership",
  "military-service",
  "other-employment",
  "paid-employment-medical-clinical",
  "paid-employment-non-medical-clinical",
  "physician-shadowing-clinical-observation",
  "presentations-posters",
  "publications",
  "research-lab",
  "teaching-tutoring-teaching-assistant",
  "volunteer-medical-clinical",
];

const CLAIM_VERBS = [
  "led", "founded", "co-founded", "researched", "presented", "authored",
  "co-authored", "published", "designed", "built", "created", "organized",
  "coordinated", "mentored", "tutored", "shadowed", "volunteered",
  "interned", "served", "treated", "assisted", "diagnosed", "counseled",
  "taught", "trained", "supervised", "directed", "managed", "developed",
  "implemented", "launched", "established", "engineered", "analyzed",
  "investigated", "discovered", "advocated", "campaigned", "fundraised",
];

const admissionsPolicySnapshot = Object.freeze({
  snapshotVersion: "2026-07-gate3.1",
  retrievedAt: "2026-07-13T00:00:00Z",
  notes:
    "Snapshot of externally governed limits at Gate 3. Changes require " +
    "a new snapshotVersion string and a matching entry in " +
    "src/features/admissions/validation/contract/review-log.md. " +
    "gate3.1 corrects the MCAT attempt-cap policy: AAMC's real caps are " +
    "3 per testing year, 4 over two consecutive testing years, and 7 " +
    "lifetime. Only the lifetime cap is enforced blocking at this stage; " +
    "testing-year / two-year window enforcement is deferred until Gate 4 " +
    "attempt-date-history logic exists.",
  sourceUrls: Object.freeze({
    mcat: "https://students-residents.aamc.org/mcat-scoring-and-score-reports",
    mcatAttemptLimits: "https://students-residents.aamc.org/taking-mcat-exam/limits-mcat-attempts",
    amcas: "https://students-residents.aamc.org/amcas",
    preview: "https://students-residents.aamc.org/aamc-preview",
  }),
  supportedCycles: Object.freeze([...SUPPORTED_CYCLES]),
  mcat: Object.freeze({
    totalMin: 472,
    totalMax: 528,
    sectionMin: 118,
    sectionMax: 132,
    attemptsPerTestingYearCap: 3,
    attemptsOverTwoConsecutiveYearsCap: 4,
    lifetimeAttemptCap: 7,
    validityYears: 4,
  }),
  amcas: Object.freeze({
    activityCap: 15,
    mostMeaningfulCap: 3,
    descriptionCharLimit: 700,
    mostMeaningfulEssayCharLimit: 1325,
    experienceTypes: Object.freeze([...AMCAS_EXPERIENCE_TYPES]),
  }),
  preview: Object.freeze({ min: 1, max: 9 }),
  gpa: Object.freeze({ min: 0.0, max: 4.0 }),
  experience: Object.freeze({ hoursCeiling: 100000 }),
  schoolList: Object.freeze({ maxSchools: 40 }),
  freshness: Object.freeze({
    researchStaleDays: 90,
    promptStaleDays: 60,
    citationInformationalDays: 365,
  }),
  claimVerbs: Object.freeze([...CLAIM_VERBS]),
});

export default admissionsPolicySnapshot;
