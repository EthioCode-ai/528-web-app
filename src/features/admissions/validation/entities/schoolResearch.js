// §1.9 school research

import { z } from "zod";
import { zUuid, zIsoDateTime, zEntityVersion } from "./_shared.js";

export const FIT_AXIS_KEYS = [
  "curriculum-integration",
  "clinical-exposure-early",
  "research-strength",
  "mission-service",
  "urban-underserved",
  "rural-underserved",
  "primary-care-emphasis",
  "specialty-track",
  "dual-degree",
  "small-cohort",
  "geographic-fit",
  "financial-fit",
  "diversity-culture",
  "wellness-support",
  "other",
];

const zFitAxis = z.object({
  axisKey: z.enum(FIT_AXIS_KEYS),
  axisNotes: z.string().min(1).max(1000),
});

export const schoolResearchSchema = z.object({
  schoolResearchId: zUuid,
  schoolId: zUuid,
  entityVersion: zEntityVersion,
  fitAxes: z.array(zFitAxis).min(1),
  keyPrograms: z.array(z.string().min(1).max(200)).default([]),
  citationRefs: z.array(zUuid),
  updatedAt: zIsoDateTime,
});
