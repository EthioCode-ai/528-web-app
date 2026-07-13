// §1.7 evidence / story bank

import { z } from "zod";
import { zUuid, zIsoDate, zEntityVersion } from "./_shared.js";

export const SENSITIVITY_TAGS = [
  "patient-info",
  "mental-health-self",
  "mental-health-other",
  "legal",
  "family-medical",
  "identity-first-person",
  "none",
];

export const EVIDENCE_TYPES = [
  "clinical-encounter",
  "research-outcome",
  "community-impact",
  "leadership-decision",
  "personal-inflection",
  "academic-achievement",
  "mentorship-given",
  "mentorship-received",
  "service-hours",
  "other",
];

export const EVIDENCE_SOURCE_TYPES = [
  "applicant-authored",
  "letter-of-recommendation",
  "transcript",
  "publication",
  "award-doc",
  "other",
];

const zDateRange = z.union([
  z.object({ startDate: zIsoDate, endDate: zIsoDate }),
  z.literal("ongoing"),
]);

export const evidenceItemSchema = z.object({
  evidenceId: zUuid,
  applicantId: zUuid,
  entityVersion: zEntityVersion,
  title: z.string().min(1).max(150),
  narrative: z.string().min(1).max(3000),
  evidenceType: z.enum(EVIDENCE_TYPES),
  sourceType: z.enum(EVIDENCE_SOURCE_TYPES),
  confirmed: z.boolean(),
  sensitivityTags: z.array(z.enum(SENSITIVITY_TAGS)).min(1),
  activityLinks: z.array(zUuid).default([]),
  dateRange: zDateRange,
});
