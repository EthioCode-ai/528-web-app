// §1.12 prompt interpretations

import { z } from "zod";
import { zUuid, zEntityVersion } from "./_shared.js";
import { FIT_AXIS_KEYS } from "./schoolResearch.js";

export const promptInterpretationSchema = z.object({
  interpretationId: zUuid,
  promptId: zUuid,
  entityVersion: zEntityVersion,
  interpretation: z.string().min(50).max(1500),
  keyAxes: z.array(z.enum(FIT_AXIS_KEYS)).min(1),
  expectedThemes: z.array(z.string().min(1).max(60)).min(1),
  confirmed: z.boolean(),
});
