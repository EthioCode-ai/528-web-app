// §1.3 MCAT scores. All ranges come from admissionsPolicySnapshot.

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import { zUuid, zIsoDate, zEntityVersion } from "./_shared.js";

const zSection = z
  .number()
  .int()
  .min(policy.mcat.sectionMin)
  .max(policy.mcat.sectionMax);

export const mcatAttemptSchema = z
  .object({
    mcatAttemptId: zUuid,
    applicantId: zUuid,
    entityVersion: zEntityVersion,
    testDate: zIsoDate,
    totalScore: z
      .number()
      .int()
      .min(policy.mcat.totalMin)
      .max(policy.mcat.totalMax)
      .nullable(),
    cpbsScore: zSection.nullable(),
    carsScore: zSection.nullable(),
    bbfnScore: zSection.nullable(),
    psbbScore: zSection.nullable(),
    voided: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.voided) {
      for (const k of ["totalScore", "cpbsScore", "carsScore", "bbfnScore", "psbbScore"]) {
        if (val[k] !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [k],
            message: "voided attempt cannot carry scores",
            params: { ruleId: "mcat.voided.contradiction" },
          });
        }
      }
      return;
    }
    for (const k of ["totalScore", "cpbsScore", "carsScore", "bbfnScore", "psbbScore"]) {
      if (val[k] === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [k],
          message: `${k} is required for non-voided attempts`,
        });
      }
    }
    if (
      val.totalScore !== null &&
      val.cpbsScore !== null &&
      val.carsScore !== null &&
      val.bbfnScore !== null &&
      val.psbbScore !== null
    ) {
      const sum = val.cpbsScore + val.carsScore + val.bbfnScore + val.psbbScore;
      if (sum !== val.totalScore) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalScore"],
          message: `MCAT total (${val.totalScore}) must equal the sum of the four section scores (${sum})`,
          params: { ruleId: "mcat.sum-mismatch", total: val.totalScore, sum },
        });
      }
    }
  });

export const applicantMcatAttemptsSchema = z
  .array(mcatAttemptSchema)
  .max(policy.mcat.lifetimeAttemptCap, {
    message: `AAMC lifetime cap is ${policy.mcat.lifetimeAttemptCap} attempts.`,
  });
