// §1.15 doNotUseTopics. Phrase-only matching — no user regex.

import { z } from "zod";
import { zUuid, zEntityVersion } from "./_shared.js";

export const doNotUseTopicSchema = z
  .object({
    topicId: zUuid,
    applicantId: zUuid,
    entityVersion: zEntityVersion,
    topicKey: z.string().regex(/^[a-z0-9-]{1,60}$/, "topicKey must be kebab-case, 1–60 chars"),
    description: z.string().min(5).max(500),
    rationale: z.string().min(5).max(500),
    matchPhrases: z
      .array(z.string().min(1).max(200))
      .min(1),
    scope: z.enum(["all-schools", "specific-school-list"]),
    scopedSchoolIds: z.array(zUuid).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "specific-school-list" && val.scopedSchoolIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scopedSchoolIds"],
        message: "scopedSchoolIds is required when scope=specific-school-list",
      });
    }
    for (const [i, phrase] of val.matchPhrases.entries()) {
      if (/[\\^$*+?()[\]{}|/]/.test(phrase)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["matchPhrases", i],
          message: "matchPhrases are literal phrases; regex metacharacters are not allowed",
        });
      }
    }
  });
