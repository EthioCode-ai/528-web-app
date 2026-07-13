// Entity schema smoke — each Zod schema parses its valid synthetic
// fixture without errors. Deeper per-rule tests live in the
// dedicated files (mcatRanges, previewGpa, etc.).

import { describe, test, expect } from "vitest";
import { ENTITIES } from "../entities/index.js";
import * as F from "../fixtures/synthetic/index.js";

describe("entity schemas — valid fixtures parse", () => {
  test("applicantProfile", () => {
    expect(ENTITIES.applicantProfile.schema.parse(F.validApplicantProfile))
      .toBeTruthy();
  });
  test("academicMetrics", () => {
    expect(ENTITIES.academicMetrics.schema.parse(F.validAcademicMetrics))
      .toBeTruthy();
  });
  test("mcatAttempt", () => {
    expect(ENTITIES.mcatAttempt.schema.parse(F.validMcatAttempt))
      .toBeTruthy();
  });
  test("previewScore", () => {
    expect(ENTITIES.previewScore.schema.parse(F.validPreview)).toBeTruthy();
  });
  test("experienceHours", () => {
    expect(ENTITIES.experienceHours.schema.parse(F.validExperienceHours))
      .toBeTruthy();
  });
  test("activity", () => {
    expect(ENTITIES.activity.schema.parse(F.validActivity)).toBeTruthy();
  });
  test("evidenceItem (confirmed)", () => {
    expect(ENTITIES.evidenceItem.schema.parse(F.validEvidenceConfirmed))
      .toBeTruthy();
  });
  test("evidenceItem (unconfirmed)", () => {
    expect(ENTITIES.evidenceItem.schema.parse(F.validEvidenceUnconfirmed))
      .toBeTruthy();
  });
  test("schoolListEntry", () => {
    expect(ENTITIES.schoolListEntry.schema.parse(F.validSchoolListEntry))
      .toBeTruthy();
  });
  test("citation", () => {
    expect(ENTITIES.citation.schema.parse(F.validCitation)).toBeTruthy();
  });
  test("secondaryPrompt", () => {
    expect(ENTITIES.secondaryPrompt.schema.parse(F.validSecondaryPrompt))
      .toBeTruthy();
  });
  test("doNotUseTopic", () => {
    expect(ENTITIES.doNotUseTopic.schema.parse(F.validDoNotUseTopic))
      .toBeTruthy();
  });
  test("draft", () => {
    expect(ENTITIES.draft.schema.parse(F.validDraftReadyForReview))
      .toBeTruthy();
  });
});

describe("applicantProfile — sensitive fields", () => {
  test("MVP fields alone are accepted", () => {
    expect(() =>
      ENTITIES.applicantProfile.schema.parse(F.validApplicantProfile)
    ).not.toThrow();
  });

  test("applicationCycle outside supported cycles is rejected", () => {
    expect(() =>
      ENTITIES.applicantProfile.schema.parse({
        ...F.validApplicantProfile,
        applicationCycle: "1999-2000",
      })
    ).toThrow();
  });

  test("sensitive keys are marked in the entity registry", () => {
    expect(ENTITIES.applicantProfile.sensitiveKeys).toContain("legalNameFirst");
    expect(ENTITIES.applicantProfile.sensitiveKeys).toContain("contactEmail");
    expect(ENTITIES.applicantProfile.sensitiveKeys).toContain("demographics");
  });
});
