// §7.2 reference / integrity tests. These validate cross-entity
// rules that live outside a single Zod schema (schoolId lookup,
// duplicate evidence IDs, etc.) — implemented as pure predicates
// on top of the fixture data.

import { describe, test, expect } from "vitest";
import policy from "../admissionsPolicySnapshot.js";
import { applicantMcatAttemptsSchema } from "../entities/mcatScores.js";
import { validMcatAttempt } from "../fixtures/synthetic/index.js";

function hasDuplicateEvidenceIds(evidenceItems) {
  const seen = new Set();
  for (const e of evidenceItems) {
    if (seen.has(e.evidenceId)) return true;
    seen.add(e.evidenceId);
  }
  return false;
}

function promptSchoolInList(prompt, schoolList) {
  return schoolList.some((s) => s.schoolId === prompt.schoolId);
}

function interpretationAxesSubsetOf(interpretation, schoolResearch) {
  const known = new Set(schoolResearch.fitAxes.map((a) => a.axisKey));
  return interpretation.keyAxes.every((k) => known.has(k));
}

describe("§7.2 reference / integrity", () => {
  test("duplicate evidence IDs on same applicant → detected", () => {
    const items = [
      { evidenceId: "id-1" },
      { evidenceId: "id-1" },
    ];
    expect(hasDuplicateEvidenceIds(items)).toBe(true);
  });

  test("distinct evidence IDs → passes", () => {
    const items = [
      { evidenceId: "id-1" },
      { evidenceId: "id-2" },
    ];
    expect(hasDuplicateEvidenceIds(items)).toBe(false);
  });

  test("prompt.school.orphan — prompt schoolId not in list", () => {
    const prompt = { schoolId: "missing-id" };
    const list = [{ schoolId: "known-id" }];
    expect(promptSchoolInList(prompt, list)).toBe(false);
  });

  test("prompt in list → passes", () => {
    const prompt = { schoolId: "known-id" };
    const list = [{ schoolId: "known-id" }];
    expect(promptSchoolInList(prompt, list)).toBe(true);
  });

  test("interpretation.axis.mismatch — keyAxes not subset of research axes", () => {
    const interp = { keyAxes: ["curriculum-integration", "not-a-real-axis"] };
    const research = { fitAxes: [{ axisKey: "curriculum-integration" }] };
    expect(interpretationAxesSubsetOf(interp, research)).toBe(false);
  });

  test("axes subset → passes", () => {
    const interp = { keyAxes: ["curriculum-integration"] };
    const research = { fitAxes: [{ axisKey: "curriculum-integration" }] };
    expect(interpretationAxesSubsetOf(interp, research)).toBe(true);
  });

  test("MCAT attempts cap enforced", () => {
    const attempts = Array.from({ length: policy.mcat.lifetimeAttemptCap + 1 }, () => ({
      ...validMcatAttempt,
    }));
    expect(() => applicantMcatAttemptsSchema.parse(attempts)).toThrow();
  });
});
