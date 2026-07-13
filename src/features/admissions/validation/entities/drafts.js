// §1.13 drafts. Includes sentenceIndex for output-validator (§6).

import { z } from "zod";
import { zUuid, zEntityVersion } from "./_shared.js";

export const DRAFT_STATUSES = ["in-progress", "ready-for-review", "applicant-approved"];
export const DRAFT_AUTHOR_TYPES = ["applicant", "agent", "mixed"];

const zSentence = z.object({
  sentenceId: zUuid,
  spanStart: z.number().int().min(0),
  spanEnd: z.number().int().min(0),
  classifiedAs: z.enum(["applicant-claim", "school-claim", "narrative", "connector"]),
  authorType: z.enum(DRAFT_AUTHOR_TYPES),
  linkedEvidenceIds: z.array(zUuid).default([]),
  linkedCitationIds: z.array(zUuid).default([]),
});

export const draftSchema = z.object({
  draftId: zUuid,
  promptId: zUuid,
  entityVersion: zEntityVersion,
  draftText: z.string(),
  wordCount: z.number().int().min(0),
  charCount: z.number().int().min(0),
  authorType: z.enum(DRAFT_AUTHOR_TYPES),
  evidenceCitations: z.array(zUuid),
  schoolCitations: z.array(zUuid),
  draftStatus: z.enum(DRAFT_STATUSES),
  versionNumber: z.number().int().min(1),
  sentenceIndex: z.array(zSentence).default([]),
});
