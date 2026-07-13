// §1.8 school list. Portal-generated schoolId; MSAR ID deferred.

import { z } from "zod";
import policy from "../admissionsPolicySnapshot.js";
import { zUuid, zEntityVersion, zSensitive } from "./_shared.js";

const zLocation = z.object({
  city: z.string().min(1).max(100),
  stateOrRegion: z.string().min(1).max(100),
  country: z.string().regex(/^[A-Z]{2}$/, "ISO-3166 alpha-2, e.g. US, CA"),
});

export const schoolListEntrySchema = z.object({
  schoolId: zUuid,
  applicantId: zUuid,
  entityVersion: zEntityVersion,
  officialSchoolName: z.string().min(1).max(200),
  programType: z.enum(["MD", "MD-PhD", "DO"]),
  location: zLocation,
  applicationType: z.enum(["primary", "secondary-only", "research-track", "other"]),
  tier: z.enum(["reach", "target", "likely", "safety"]),
  secondaryReceived: z.boolean().default(false),
  aamcSchoolId: zSensitive(z.number().int().positive()),
});

export const applicantSchoolListSchema = z
  .array(schoolListEntrySchema)
  .min(1)
  .max(policy.schoolList.maxSchools, {
    message: `School list has too many entries — please reduce to at most ${policy.schoolList.maxSchools}.`,
  });
