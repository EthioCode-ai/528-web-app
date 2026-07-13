// §1.16 key decision points

import { z } from "zod";
import { zUuid, zIsoDateTime, zEntityVersion } from "./_shared.js";

export const DECISION_PHASES = [
  "school-list-selection",
  "secondary-strategy",
  "draft-approach",
  "interview-strategy",
  "final-decision",
];

export const keyDecisionSchema = z.object({
  decisionId: zUuid,
  applicantId: zUuid,
  entityVersion: zEntityVersion,
  phase: z.enum(DECISION_PHASES),
  decisionSummary: z.string().min(20).max(1000),
  rationale: z.string().min(20).max(2000),
  linkedEvidence: z.array(zUuid).default([]),
  linkedCitations: z.array(zUuid).default([]),
  revisitedFromDecisionId: zUuid.nullable(),
  decidedAt: zIsoDateTime,
});
