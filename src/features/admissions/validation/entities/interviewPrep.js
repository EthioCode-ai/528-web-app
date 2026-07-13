// §1.14 interview-prep inputs

import { z } from "zod";
import { zUuid, zEntityVersion } from "./_shared.js";

export const INTERVIEW_FORMATS = ["MMI", "traditional", "panel", "hybrid", "unknown"];

const zPredictedQuestion = z.object({
  questionText: z.string().min(1).max(1000),
  sourceCitationId: zUuid.nullable(),
  expectedThemes: z.array(z.string().min(1).max(60)).default([]),
});

export const interviewPrepInputsSchema = z.object({
  interviewPrepId: zUuid,
  schoolId: zUuid,
  entityVersion: zEntityVersion,
  interviewFormat: z.enum(INTERVIEW_FORMATS),
  storyIds: z.array(zUuid),
  predictedQuestions: z.array(zPredictedQuestion).default([]),
  personalAntiExamples: z.array(zUuid).default([]),
});
