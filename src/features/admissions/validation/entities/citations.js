// §1.10 citations

import { z } from "zod";
import { zUuid, zIsoDateTime, zEntityVersion } from "./_shared.js";

export const CITATION_SOURCE_TYPES = [
  "school-website",
  "school-viewbook",
  "school-publication",
  "podcast",
  "news-article",
  "journal-article",
  "msar",
  "other",
];

export const citationSchema = z
  .object({
    citationId: zUuid,
    applicantId: zUuid,
    entityVersion: zEntityVersion,
    sourceType: z.enum(CITATION_SOURCE_TYPES),
    url: z.string().url().optional(),
    offlineDoc: z.boolean().default(false),
    docTitle: z.string().min(1).max(300).optional(),
    retrievedAt: zIsoDateTime,
    verifierNote: z.string().min(1).max(2000),
    schoolScopeId: zUuid.nullable(),
    usedForCurrentCycleRequirement: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (!val.offlineDoc && !val.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "citation must have a url unless offlineDoc=true",
      });
    }
    if (val.offlineDoc && !val.docTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["docTitle"],
        message: "docTitle is required when offlineDoc=true",
      });
    }
    if (val.url && !val.url.startsWith("https:")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "url must be https:",
      });
    }
  });
