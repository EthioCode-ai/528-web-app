// §1.11 secondary prompts

import { z } from "zod";
import { zUuid, zIsoDateTime, zEntityVersion } from "./_shared.js";

export const PROMPT_CATEGORIES = [
  "why-us",
  "diversity",
  "challenge",
  "mission-fit",
  "leadership",
  "research",
  "service",
  "covid",
  "pandemic-impact",
  "optional-additional",
  "other",
];

export const secondaryPromptSchema = z
  .object({
    promptId: zUuid,
    schoolId: zUuid,
    entityVersion: zEntityVersion,
    promptText: z.string().min(1).max(2000),
    wordLimit: z.number().int().min(25).nullable(),
    charLimit: z.number().int().min(100).nullable(),
    category: z.enum(PROMPT_CATEGORIES),
    sourceCitationId: zUuid,
    retrievedAt: zIsoDateTime,
  })
  .superRefine((val, ctx) => {
    if (val.wordLimit === null && val.charLimit === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wordLimit"],
        message: "at least one of wordLimit or charLimit must be present",
      });
    }
  });
