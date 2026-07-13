// Shared Zod fragments used across entity schemas. Sensitive fields
// carry a metadata marker so the fixture-discipline test (§7.5) can
// refuse any fixture that populates them with real-looking data.

import { z } from "zod";

export const zUuid = z.string().uuid();

export const zIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date YYYY-MM-DD");

export const zIsoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    "must be an ISO UTC timestamp YYYY-MM-DDTHH:MM:SSZ"
  );

export const zIsoYearMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "must be an ISO year-month YYYY-MM");

export const zApplicationCycle = z
  .string()
  .regex(/^\d{4}-\d{4}$/, "must be YYYY-YYYY");

export const zEntityVersion = z.string().min(1);

export const SENSITIVE_MARKER = Symbol.for("admissions.field.sensitive");

// zSensitive(inner) — wraps an optional field and tags it sensitive:true.
// The tag is exposed via `.meta({ sensitive: true })` for the discipline test.
export function zSensitive(inner) {
  return inner.optional().meta({ sensitive: true, deferredUntilPhase: "gate4-or-later" });
}
