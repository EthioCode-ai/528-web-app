// §7.1 numeric-range tests for MCAT.

import { describe, test, expect } from "vitest";
import { mcatAttemptSchema } from "../entities/mcatScores.js";
import { validMcatAttempt } from "../fixtures/synthetic/index.js";

function withScores(overrides) {
  return { ...validMcatAttempt, ...overrides };
}

describe("MCAT total range [472, 528]", () => {
  test("total = 471 → rejected", () => {
    expect(() =>
      mcatAttemptSchema.parse(
        withScores({ totalScore: 471, cpbsScore: 118, carsScore: 118, bbfnScore: 118, psbbScore: 117 })
      )
    ).toThrow();
  });
  test("total = 529 → rejected", () => {
    expect(() =>
      mcatAttemptSchema.parse(
        withScores({ totalScore: 529, cpbsScore: 132, carsScore: 132, bbfnScore: 132, psbbScore: 133 })
      )
    ).toThrow();
  });
  test("total = 472 boundary → accepted", () => {
    expect(() =>
      mcatAttemptSchema.parse(
        withScores({ totalScore: 472, cpbsScore: 118, carsScore: 118, bbfnScore: 118, psbbScore: 118 })
      )
    ).not.toThrow();
  });
  test("total = 528 boundary → accepted", () => {
    expect(() =>
      mcatAttemptSchema.parse(
        withScores({ totalScore: 528, cpbsScore: 132, carsScore: 132, bbfnScore: 132, psbbScore: 132 })
      )
    ).not.toThrow();
  });
});

describe("MCAT section range [118, 132]", () => {
  test("section = 117 → rejected", () => {
    expect(() =>
      mcatAttemptSchema.parse(withScores({ cpbsScore: 117 }))
    ).toThrow();
  });
  test("section = 133 → rejected", () => {
    expect(() =>
      mcatAttemptSchema.parse(withScores({ cpbsScore: 133 }))
    ).toThrow();
  });
});

describe("MCAT sum-mismatch", () => {
  test("total=500 with sections summing to 490 → rejected", () => {
    expect(() =>
      mcatAttemptSchema.parse(
        withScores({ totalScore: 500, cpbsScore: 120, carsScore: 122, bbfnScore: 124, psbbScore: 124 })
      )
    ).toThrow(/sum of the four section scores/);
  });
});

describe("MCAT voided contradiction", () => {
  test("voided=true with scores → rejected", () => {
    expect(() =>
      mcatAttemptSchema.parse(withScores({ voided: true }))
    ).toThrow();
  });
  test("voided=true with all-null scores → accepted", () => {
    expect(() =>
      mcatAttemptSchema.parse(
        withScores({
          voided: true,
          totalScore: null,
          cpbsScore: null,
          carsScore: null,
          bbfnScore: null,
          psbbScore: null,
        })
      )
    ).not.toThrow();
  });
});
