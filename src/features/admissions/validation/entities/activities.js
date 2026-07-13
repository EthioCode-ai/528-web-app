// §1.6 applicant activities. AMCAS caps come from admissionsPolicySnapshot.

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import { zUuid, zEntityVersion } from "./_shared.js";

export const activitySchema = z
  .object({
    activityId: zUuid,
    applicantId: zUuid,
    entityVersion: zEntityVersion,
    experienceType: z.enum(policy.amcas.experienceTypes),
    title: z.string().min(1).max(100),
    organization: z.string().min(1).max(200),
    description: z.string().min(1).max(policy.amcas.descriptionCharLimit),
    isMostMeaningful: z.boolean(),
    mostMeaningfulEssay: z
      .string()
      .max(policy.amcas.mostMeaningfulEssayCharLimit)
      .optional(),
    linkedEvidenceIds: z.array(zUuid).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.isMostMeaningful && !val.mostMeaningfulEssay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mostMeaningfulEssay"],
        message: "Most-meaningful essay is required when isMostMeaningful=true",
      });
    }
    if (!val.isMostMeaningful && val.mostMeaningfulEssay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mostMeaningfulEssay"],
        message: "mostMeaningfulEssay is only allowed when isMostMeaningful=true",
      });
    }
  });

export const applicantActivitiesSchema = z
  .array(activitySchema)
  .max(policy.amcas.activityCap, {
    message: `AMCAS allows at most ${policy.amcas.activityCap} activities.`,
  })
  .superRefine((val, ctx) => {
    const mmCount = val.filter((a) => a.isMostMeaningful).length;
    if (mmCount > policy.amcas.mostMeaningfulCap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: `You may mark at most ${policy.amcas.mostMeaningfulCap} activities as most meaningful.`,
        params: { ruleId: "activity.mostMeaningful.cap", count: mmCount },
      });
    }
  });
