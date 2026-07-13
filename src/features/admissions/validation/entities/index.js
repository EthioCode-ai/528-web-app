// Entity barrel. `ENTITIES` is a metadata map used by the contract
// parity test to verify the snapshot's entity summaries.

import {
  applicantProfileSchema,
  applicantProfileMvpRequiredKeys,
  applicantProfileSensitiveKeys,
} from "./applicantProfile.js";
import { academicMetricsSchema } from "./academicMetrics.js";
import { mcatAttemptSchema, applicantMcatAttemptsSchema } from "./mcatScores.js";
import { previewScoreSchema } from "./previewScore.js";
import { experienceHoursSchema } from "./experienceHours.js";
import { activitySchema, applicantActivitiesSchema } from "./activities.js";
import {
  evidenceItemSchema,
  SENSITIVITY_TAGS,
  EVIDENCE_TYPES,
  EVIDENCE_SOURCE_TYPES,
} from "./evidenceBank.js";
import {
  schoolListEntrySchema,
  applicantSchoolListSchema,
} from "./schoolList.js";
import { schoolResearchSchema, FIT_AXIS_KEYS } from "./schoolResearch.js";
import { citationSchema, CITATION_SOURCE_TYPES } from "./citations.js";
import { secondaryPromptSchema, PROMPT_CATEGORIES } from "./secondaryPrompts.js";
import { promptInterpretationSchema } from "./promptInterpretations.js";
import { draftSchema, DRAFT_STATUSES, DRAFT_AUTHOR_TYPES } from "./drafts.js";
import { interviewPrepInputsSchema, INTERVIEW_FORMATS } from "./interviewPrep.js";
import { doNotUseTopicSchema } from "./doNotUseTopics.js";
import { keyDecisionSchema, DECISION_PHASES } from "./keyDecisions.js";

export const ENTITIES = Object.freeze({
  applicantProfile: {
    schema: applicantProfileSchema,
    mvpRequiredKeys: applicantProfileMvpRequiredKeys,
    sensitiveKeys: applicantProfileSensitiveKeys,
  },
  academicMetrics: {
    schema: academicMetricsSchema,
    mvpRequiredKeys: ["cumulativeGPA", "scienceGPA", "gpaTrend", "transcriptCount"],
    sensitiveKeys: [],
  },
  mcatAttempt: {
    schema: mcatAttemptSchema,
    mvpRequiredKeys: ["mcatAttemptId", "applicantId", "testDate", "voided"],
    sensitiveKeys: [],
  },
  applicantMcatAttempts: {
    schema: applicantMcatAttemptsSchema,
    mvpRequiredKeys: [],
    sensitiveKeys: [],
  },
  previewScore: {
    schema: previewScoreSchema,
    mvpRequiredKeys: ["score", "testDate", "applicationCycle"],
    sensitiveKeys: [],
  },
  experienceHours: {
    schema: experienceHoursSchema,
    mvpRequiredKeys: ["hoursTotal", "startDate", "endDate", "hoursByYear", "frequency"],
    sensitiveKeys: [],
  },
  activity: {
    schema: activitySchema,
    mvpRequiredKeys: [
      "experienceType",
      "title",
      "organization",
      "description",
      "isMostMeaningful",
    ],
    sensitiveKeys: [],
  },
  applicantActivities: {
    schema: applicantActivitiesSchema,
    mvpRequiredKeys: [],
    sensitiveKeys: [],
  },
  evidenceItem: {
    schema: evidenceItemSchema,
    mvpRequiredKeys: [
      "title",
      "narrative",
      "evidenceType",
      "sourceType",
      "confirmed",
      "sensitivityTags",
    ],
    sensitiveKeys: [],
  },
  schoolListEntry: {
    schema: schoolListEntrySchema,
    mvpRequiredKeys: [
      "schoolId",
      "officialSchoolName",
      "programType",
      "location",
      "applicationType",
      "tier",
    ],
    sensitiveKeys: ["aamcSchoolId"],
  },
  applicantSchoolList: {
    schema: applicantSchoolListSchema,
    mvpRequiredKeys: [],
    sensitiveKeys: [],
  },
  schoolResearch: {
    schema: schoolResearchSchema,
    mvpRequiredKeys: ["fitAxes", "citationRefs", "updatedAt"],
    sensitiveKeys: [],
  },
  citation: {
    schema: citationSchema,
    mvpRequiredKeys: ["sourceType", "retrievedAt", "verifierNote"],
    sensitiveKeys: [],
  },
  secondaryPrompt: {
    schema: secondaryPromptSchema,
    mvpRequiredKeys: [
      "promptText",
      "category",
      "sourceCitationId",
      "retrievedAt",
    ],
    sensitiveKeys: [],
  },
  promptInterpretation: {
    schema: promptInterpretationSchema,
    mvpRequiredKeys: ["interpretation", "keyAxes", "expectedThemes", "confirmed"],
    sensitiveKeys: [],
  },
  draft: {
    schema: draftSchema,
    mvpRequiredKeys: [
      "draftText",
      "wordCount",
      "charCount",
      "authorType",
      "evidenceCitations",
      "schoolCitations",
      "draftStatus",
      "versionNumber",
    ],
    sensitiveKeys: [],
  },
  interviewPrepInputs: {
    schema: interviewPrepInputsSchema,
    mvpRequiredKeys: ["interviewFormat", "storyIds"],
    sensitiveKeys: [],
  },
  doNotUseTopic: {
    schema: doNotUseTopicSchema,
    mvpRequiredKeys: ["topicKey", "description", "rationale", "matchPhrases", "scope"],
    sensitiveKeys: [],
  },
  keyDecision: {
    schema: keyDecisionSchema,
    mvpRequiredKeys: ["phase", "decisionSummary", "rationale", "decidedAt"],
    sensitiveKeys: [],
  },
});

export const ENUMS = Object.freeze({
  SENSITIVITY_TAGS,
  EVIDENCE_TYPES,
  EVIDENCE_SOURCE_TYPES,
  FIT_AXIS_KEYS,
  CITATION_SOURCE_TYPES,
  PROMPT_CATEGORIES,
  DRAFT_STATUSES,
  DRAFT_AUTHOR_TYPES,
  INTERVIEW_FORMATS,
  DECISION_PHASES,
});
