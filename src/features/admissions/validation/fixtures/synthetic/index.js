// Synthetic fixture root — every file under this directory MUST
// export `SYNTHETIC_FIXTURE = true`. The fixture-discipline test
// walks this directory tree and fails on any violation.
//
// All UUIDs, names, and free-text values below are made-up. No real
// applicant data may live here.

export const SYNTHETIC_FIXTURE = true;

export const SCHOOL_A_ID = "00000000-0000-4000-8000-0000000000a1";
export const SCHOOL_B_ID = "00000000-0000-4000-8000-0000000000a2";
export const APPLICANT_ID = "00000000-0000-4000-8000-000000000001";
export const ACTIVITY_A_ID = "00000000-0000-4000-8000-000000000011";
export const EVIDENCE_A_ID = "00000000-0000-4000-8000-000000000021";
export const EVIDENCE_B_ID = "00000000-0000-4000-8000-000000000022";
export const CITATION_A_ID = "00000000-0000-4000-8000-000000000031";
export const CITATION_B_ID = "00000000-0000-4000-8000-000000000032";
export const PROMPT_A_ID = "00000000-0000-4000-8000-000000000041";
export const DRAFT_A_ID = "00000000-0000-4000-8000-000000000051";
export const TOPIC_A_ID = "00000000-0000-4000-8000-000000000061";

export const validApplicantProfile = {
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  applicantLabel: "Synthetic Applicant Alpha",
  applicationCycle: "2026-2027",
  stateResidency: "MA",
  college: "Northern State University",
  major: "Molecular Biology",
  graduationDate: "2025-05",
};

export const validAcademicMetrics = {
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  cumulativeGPA: 3.72,
  scienceGPA: 3.65,
  gpaTrend: "upward",
  transcriptCount: 2,
};

export const validMcatAttempt = {
  mcatAttemptId: "00000000-0000-4000-8000-000000000071",
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  testDate: "2024-08-14",
  totalScore: 512,
  cpbsScore: 128,
  carsScore: 128,
  bbfnScore: 128,
  psbbScore: 128,
  voided: false,
};

export const validPreview = {
  previewId: "00000000-0000-4000-8000-000000000081",
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  score: 7,
  testDate: "2024-06-01",
  applicationCycle: "2026-2027",
};

export const validExperienceHours = {
  activityId: ACTIVITY_A_ID,
  entityVersion: "v1",
  hoursTotal: 300,
  startDate: "2023-01-15",
  endDate: "2024-05-30",
  hoursByYear: { "2023": 150, "2024": 150 },
  frequency: "weekly",
};

export const validActivity = {
  activityId: ACTIVITY_A_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  experienceType: "volunteer-medical-clinical",
  title: "Free clinic volunteer",
  organization: "Northern Community Clinic",
  description:
    "Volunteered weekly at a free clinic. Rooming, vitals, patient education. Kept encounters focused, took feedback from residents each shift.",
  isMostMeaningful: false,
  linkedEvidenceIds: [EVIDENCE_A_ID],
};

export const validEvidenceConfirmed = {
  evidenceId: EVIDENCE_A_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  title: "Free clinic evening — first pediatric encounter",
  narrative:
    "During my second month at the clinic I roomed a five-year-old with a rash. I asked the parent about the exposure history, took vitals, and walked the resident through what I observed. The resident later invited me to co-write a short protocol note. This was the encounter where I decided to pursue medicine directly.",
  evidenceType: "clinical-encounter",
  sourceType: "applicant-authored",
  confirmed: true,
  sensitivityTags: ["none"],
  activityLinks: [ACTIVITY_A_ID],
  dateRange: { startDate: "2023-04-10", endDate: "2023-04-10" },
};

export const validEvidenceUnconfirmed = {
  ...validEvidenceConfirmed,
  evidenceId: EVIDENCE_B_ID,
  title: "Personal reflection on family illness",
  narrative:
    "During the semester I supported a family member through a serious illness. I learned to sit with silence and to defer to the clinician's judgment. This experience shaped my approach to bedside interactions.",
  evidenceType: "personal-inflection",
  confirmed: false,
  sensitivityTags: ["family-medical"],
  activityLinks: [],
  dateRange: "ongoing",
};

export const validSchoolListEntry = {
  schoolId: SCHOOL_A_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  officialSchoolName: "Placeholder Medical School",
  programType: "MD",
  location: { city: "Placeholderville", stateOrRegion: "MA", country: "US" },
  applicationType: "primary",
  tier: "target",
  secondaryReceived: false,
};

export const validCitation = {
  citationId: CITATION_A_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  sourceType: "school-website",
  url: "https://placeholder-med.example.edu/mission",
  retrievedAt: "2026-06-01T00:00:00Z",
  verifierNote:
    "Cites the school's stated mission of urban-underserved primary care emphasis; verified against the About page footer.",
  schoolScopeId: SCHOOL_A_ID,
  usedForCurrentCycleRequirement: true,
};

export const validSecondaryPrompt = {
  promptId: PROMPT_A_ID,
  schoolId: SCHOOL_A_ID,
  entityVersion: "v1",
  promptText: "How will you contribute to our mission?",
  wordLimit: 300,
  charLimit: null,
  category: "mission-fit",
  sourceCitationId: CITATION_A_ID,
  retrievedAt: "2026-06-01T00:00:00Z",
};

export const validDoNotUseTopic = {
  topicId: TOPIC_A_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  topicKey: "family-medical-history",
  description: "Details of a family member's medical history.",
  rationale:
    "Applicant prefers not to discuss family medical history in application materials.",
  matchPhrases: ["family medical history", "my mother's illness"],
  scope: "all-schools",
  scopedSchoolIds: [],
};

export const validDraftReadyForReview = {
  draftId: DRAFT_A_ID,
  promptId: PROMPT_A_ID,
  entityVersion: "v1",
  draftText:
    "I volunteered at a free clinic for over a year. I roomed patients, took vitals, and worked alongside residents. In one memorable evening I helped a resident evaluate a child with a rash and later co-authored a short protocol note.",
  wordCount: 41,
  charCount: 232,
  authorType: "applicant",
  evidenceCitations: [EVIDENCE_A_ID],
  schoolCitations: [CITATION_A_ID],
  draftStatus: "ready-for-review",
  versionNumber: 1,
  sentenceIndex: [],
};
