// §7.1 numeric-range tests for PREview and GPA.

import { describe, test, expect } from "vitest";
import { previewScoreSchema } from "../entities/previewScore.js";
import { academicMetricsSchema } from "../entities/academicMetrics.js";
import { validPreview, validAcademicMetrics } from "../fixtures/synthetic/index.js";

describe("PREview range [1, 9]", () => {
  test("0 rejected", () => {
    expect(() => previewScoreSchema.parse({ ...validPreview, score: 0 })).toThrow();
  });
  test("10 rejected", () => {
    expect(() => previewScoreSchema.parse({ ...validPreview, score: 10 })).toThrow();
  });
  test("1 accepted (boundary)", () => {
    expect(() => previewScoreSchema.parse({ ...validPreview, score: 1 })).not.toThrow();
  });
  test("9 accepted (boundary)", () => {
    expect(() => previewScoreSchema.parse({ ...validPreview, score: 9 })).not.toThrow();
  });
});

describe("GPA range [0.0, 4.0]", () => {
  test("cumulative -0.01 rejected", () => {
    expect(() =>
      academicMetricsSchema.parse({ ...validAcademicMetrics, cumulativeGPA: -0.01 })
    ).toThrow();
  });
  test("cumulative 4.01 rejected", () => {
    expect(() =>
      academicMetricsSchema.parse({ ...validAcademicMetrics, cumulativeGPA: 4.01 })
    ).toThrow();
  });
  test("cumulative 0.00 accepted (boundary)", () => {
    expect(() =>
      academicMetricsSchema.parse({ ...validAcademicMetrics, cumulativeGPA: 0.0 })
    ).not.toThrow();
  });
  test("cumulative 4.00 accepted (boundary)", () => {
    expect(() =>
      academicMetricsSchema.parse({ ...validAcademicMetrics, cumulativeGPA: 4.0 })
    ).not.toThrow();
  });
  test("scienceGPA (sGPA) 4.01 rejected", () => {
    expect(() =>
      academicMetricsSchema.parse({ ...validAcademicMetrics, scienceGPA: 4.01 })
    ).toThrow();
  });
});
