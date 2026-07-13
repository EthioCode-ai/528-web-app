// §1.5 experience hours

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import { zUuid, zIsoDate, zEntityVersion } from "./_shared.js";

export const experienceHoursSchema = z
  .object({
    activityId: zUuid,
    entityVersion: zEntityVersion,
    hoursTotal: z
      .number()
      .int()
      .min(0)
      .max(policy.experience.hoursCeiling),
    startDate: zIsoDate,
    endDate: zIsoDate,
    hoursByYear: z.record(
      z.string().regex(/^\d{4}$/, "year key must be YYYY"),
      z.number().int().min(0)
    ),
    frequency: z.enum(["weekly", "monthly", "sporadic", "one-time"]),
  })
  .superRefine((val, ctx) => {
    if (val.endDate < val.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate cannot precede startDate",
      });
    }
    const sum = Object.values(val.hoursByYear).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - val.hoursTotal) > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hoursByYear"],
        message: `Yearly hours (${sum}) do not match total (${val.hoursTotal})`,
        params: { ruleId: "experience.hours.year-sum", sum, total: val.hoursTotal },
      });
    }
  });
