// §1.1 applicant profile — MVP fields only. Sensitive fields are
// deferred and clearly labeled per reviewer v0.2.

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import {
  zUuid,
  zIsoYearMonth,
  zApplicationCycle,
  zEntityVersion,
  zSensitive,
} from "./_shared.js";

const US_STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","PR","GU","VI","AS","MP",
  "international","unknown",
];

const zStateResidency = z.enum(US_STATE_CODES);

export const applicantProfileSchema = z.object({
  applicantId: zUuid,
  entityVersion: zEntityVersion,
  applicantLabel: z.string().min(1).max(60),
  applicationCycle: zApplicationCycle.refine(
    (c) => policy.supportedCycles.includes(c),
    { message: `applicationCycle must be one of ${policy.supportedCycles.join(", ")}` }
  ),
  stateResidency: zStateResidency,
  college: z.string().min(1).max(200),
  major: z.string().min(1).max(120),
  graduationDate: zIsoYearMonth,

  legalNameFirst: zSensitive(z.string().min(1).max(100)),
  legalNameLast: zSensitive(z.string().min(1).max(100)),
  pronouns: zSensitive(z.string().min(1).max(60)),
  contactEmail: zSensitive(z.string().email().max(254)),
  citizenshipStatus: zSensitive(z.string().min(1).max(60)),
  disadvantagedNarrative: zSensitive(z.string().min(1).max(5000)),
  demographics: zSensitive(z.record(z.string(), z.unknown())),
  institutionalActionNarrative: zSensitive(z.string().min(1).max(5000)),
});

export const applicantProfileMvpRequiredKeys = Object.freeze([
  "applicantLabel",
  "applicationCycle",
  "stateResidency",
  "college",
  "major",
  "graduationDate",
]);

export const applicantProfileSensitiveKeys = Object.freeze([
  "legalNameFirst",
  "legalNameLast",
  "pronouns",
  "contactEmail",
  "citizenshipStatus",
  "disadvantagedNarrative",
  "demographics",
  "institutionalActionNarrative",
]);
