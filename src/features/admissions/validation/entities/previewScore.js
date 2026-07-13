// §1.4 AAMC PREview score

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import { zUuid, zIsoDate, zApplicationCycle, zEntityVersion } from "./_shared.js";

export const previewScoreSchema = z.object({
  previewId: zUuid,
  applicantId: zUuid,
  entityVersion: zEntityVersion,
  score: z
    .number()
    .int()
    .min(policy.preview.min)
    .max(policy.preview.max),
  testDate: zIsoDate,
  applicationCycle: zApplicationCycle,
});
