// §1.2 academic metrics

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import { zUuid, zEntityVersion } from "./_shared.js";

const zGpa = z.number().min(policy.gpa.min).max(policy.gpa.max);

export const academicMetricsSchema = z.object({
  applicantId: zUuid,
  entityVersion: zEntityVersion,
  cumulativeGPA: zGpa,
  scienceGPA: zGpa,
  postbacGPA: zGpa.optional(),
  gpaTrend: z.enum(["upward", "flat", "downward", "insufficient-data"]),
  transcriptCount: z.number().int().min(1),
});
