// Gate 4 fixture extensions — one complete synthetic run.
//
// SYNTHETIC_FIXTURE=true marker + no real applicant data. Every ID
// is a made-up UUID. Every name is clearly synthetic per Gate 3.1
// discipline (Synthetic *, Placeholder *).

import {
  APPLICANT_ID,
  ACTIVITY_A_ID,
  EVIDENCE_A_ID,
  CITATION_A_ID,
  PROMPT_A_ID,
  SCHOOL_A_ID,
  TOPIC_A_ID,
  validApplicantProfile,
  validSchoolListEntry,
  validCitation,
  validSecondaryPrompt,
  validEvidenceConfirmed,
  validDoNotUseTopic,
} from "./index.js";

export const SYNTHETIC_FIXTURE = true;

// New Gate 4 IDs — extending the Gate 3 series without collision.
export const EVIDENCE_C_ID = "00000000-0000-4000-8000-000000000023";
export const CITATION_C_ID = "00000000-0000-4000-8000-000000000033";
export const SCHOOL_RESEARCH_ID = "00000000-0000-4000-8000-000000000091";
export const INTERPRETATION_A_ID = "00000000-0000-4000-8000-0000000000a3";
export const INTERVIEW_PREP_A_ID = "00000000-0000-4000-8000-0000000000a4";

// §2.5 secondary confirmed evidence — long enough narrative that
// draft.interview-defensibility.thin does not fire.
export const validEvidenceConfirmedSecondary = {
  evidenceId: EVIDENCE_C_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  title: "Peer tutoring across two academic years",
  narrative:
    "For two years I organized weekly premed tutoring sessions for peers in " +
    "organic chemistry and molecular biology. I built a rotating problem-set " +
    "review schedule with the honors college and paired newer students with " +
    "returning tutors. The role taught me how to hold a high bar while " +
    "keeping the door open to questions. I learned to slow the room down when " +
    "someone was stuck, to summarize what we had covered before moving on, " +
    "and to end each session with a small win the group could carry into the " +
    "week. The pattern of returning to the same students week after week is " +
    "what convinced me that longitudinal relationships are the shape of care " +
    "I want to practice.",
  evidenceType: "mentorship-given",
  sourceType: "applicant-authored",
  confirmed: true,
  sensitivityTags: ["none"],
  activityLinks: [ACTIVITY_A_ID],
  dateRange: { startDate: "2023-09-01", endDate: "2025-05-01" },
};

// §2.6 second citation — school curriculum page.
export const validCitationCurriculum = {
  citationId: CITATION_C_ID,
  applicantId: APPLICANT_ID,
  entityVersion: "v1",
  sourceType: "school-website",
  url: "https://placeholder-med.example.edu/curriculum",
  offlineDoc: false,
  retrievedAt: "2026-06-15T00:00:00Z",
  verifierNote:
    "Cites the Longitudinal Community Clinic Track curriculum page; " +
    "verified against the school's Academics section.",
  schoolScopeId: SCHOOL_A_ID,
  usedForCurrentCycleRequirement: true,
};

// §2.3 schoolResearch — recent enough that research.stale does NOT fire.
export const validSchoolResearch = {
  schoolResearchId: SCHOOL_RESEARCH_ID,
  schoolId: SCHOOL_A_ID,
  entityVersion: "v1",
  fitAxes: [
    {
      axisKey: "mission-service",
      axisNotes:
        "The school's stated mission emphasizes community-based primary care.",
    },
    {
      axisKey: "curriculum-integration",
      axisNotes:
        "Integrated curriculum with clinical exposure starting in the first year.",
    },
  ],
  keyPrograms: [
    "Longitudinal Community Clinic Track",
    "Health-Systems Science thread",
  ],
  citationRefs: [CITATION_A_ID, CITATION_C_ID],
  updatedAt: "2026-06-20T00:00:00Z",
};

// §2.4 prompt interpretation — subset of schoolResearch.fitAxes.
export const validPromptInterpretation = {
  interpretationId: INTERPRETATION_A_ID,
  promptId: PROMPT_A_ID,
  entityVersion: "v1",
  interpretation:
    "The prompt asks how the applicant will contribute to the school's mission " +
    "of community-based primary care through service and integrated learning.",
  keyAxes: ["mission-service", "curriculum-integration"],
  expectedThemes: [
    "community-service",
    "underserved-populations",
    "primary-care-emphasis",
  ],
  confirmed: true,
};

// §2.8 interview-prep inputs — two confirmed stories, MMI format.
export const validInterviewPrepInputs = {
  interviewPrepId: INTERVIEW_PREP_A_ID,
  schoolId: SCHOOL_A_ID,
  entityVersion: "v1",
  interviewFormat: "MMI",
  storyIds: [EVIDENCE_A_ID, EVIDENCE_C_ID],
  predictedQuestions: [],
  personalAntiExamples: [],
};

// One convenience bundle for the orchestrator/tests.
export const GATE4_FIXTURE_BUNDLE = Object.freeze({
  applicant: validApplicantProfile,
  schoolListEntry: validSchoolListEntry,
  schoolResearch: validSchoolResearch,
  prompt: validSecondaryPrompt,
  interpretation: validPromptInterpretation,
  evidenceItems: [validEvidenceConfirmed, validEvidenceConfirmedSecondary],
  citations: [validCitation, validCitationCurriculum],
  doNotUseTopics: [validDoNotUseTopic],
  interviewPrepInputs: validInterviewPrepInputs,
});
