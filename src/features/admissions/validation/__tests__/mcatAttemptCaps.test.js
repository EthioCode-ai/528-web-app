// Attempt-cap regression suite. Guards against re-introducing the
// incorrect "AAMC lifetime cap is 4 attempts" wording and confirms
// the three distinct caps (per-year 3, two-year 4, lifetime 7).

import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import policy from "../admissionsPolicySnapshot.js";
import { rules, rulesById } from "../rules.js";
import { renderMessage } from "../messages.js";
import { applicantMcatAttemptsSchema } from "../entities/mcatScores.js";
import { validMcatAttempt } from "../fixtures/synthetic/index.js";

function makeAttempts(n) {
  return Array.from({ length: n }, (_, i) => ({
    ...validMcatAttempt,
    mcatAttemptId: `00000000-0000-4000-8000-0000000000${(70 + i).toString(16).padStart(2, "0")}`,
    testDate: `2024-08-${String(i + 1).padStart(2, "0")}`,
  }));
}

describe("MCAT attempt caps — schema-layer enforcement", () => {
  test("7 attempts (lifetime cap boundary) is accepted", () => {
    expect(() => applicantMcatAttemptsSchema.parse(makeAttempts(7))).not.toThrow();
  });

  test("8 attempts is rejected (over lifetime cap)", () => {
    expect(() => applicantMcatAttemptsSchema.parse(makeAttempts(8))).toThrow(
      /AAMC lifetime cap is 7 attempts/
    );
  });
});

describe("MCAT attempt caps — policy snapshot", () => {
  test("policy snapshot contains all three distinct caps", () => {
    expect(policy.mcat.attemptsPerTestingYearCap).toBe(3);
    expect(policy.mcat.attemptsOverTwoConsecutiveYearsCap).toBe(4);
    expect(policy.mcat.lifetimeAttemptCap).toBe(7);
  });

  test("caps are three distinct integers", () => {
    const caps = new Set([
      policy.mcat.attemptsPerTestingYearCap,
      policy.mcat.attemptsOverTwoConsecutiveYearsCap,
      policy.mcat.lifetimeAttemptCap,
    ]);
    expect(caps.size).toBe(3);
  });
});

describe("MCAT attempt caps — rule registry", () => {
  test("mcat.attempts.exceeded is retired", () => {
    expect(rulesById["mcat.attempts.exceeded"]).toBeUndefined();
  });

  test("mcat.attempts.lifetime-cap exists and is blocking with cap 7", () => {
    const r = rulesById["mcat.attempts.lifetime-cap"];
    expect(r).toBeTruthy();
    expect(r.severity).toBe("blocking");
    expect(r.metadataTemplate.lifetimeAttemptCap).toBe(7);
    expect(renderMessage("mcat.attempts.lifetime-cap", {}).message).toMatch(
      /lifetime cap is 7 attempts/
    );
  });

  test("mcat.attempts.two-year-cap exists and is warning with cap 4", () => {
    const r = rulesById["mcat.attempts.two-year-cap"];
    expect(r).toBeTruthy();
    expect(r.severity).toBe("warning");
    expect(r.metadataTemplate.cap).toBe(4);
    const m = renderMessage("mcat.attempts.two-year-cap", {}).message;
    expect(m).toMatch(/two consecutive testing years/);
    expect(m).not.toMatch(/lifetime/);
  });

  test("mcat.attempts.testing-year-cap exists and is warning with cap 3", () => {
    const r = rulesById["mcat.attempts.testing-year-cap"];
    expect(r).toBeTruthy();
    expect(r.severity).toBe("warning");
    expect(r.metadataTemplate.cap).toBe(3);
    const m = renderMessage("mcat.attempts.testing-year-cap", {}).message;
    expect(m).toMatch(/single testing year/);
    expect(m).not.toMatch(/lifetime/);
  });
});

describe("MCAT attempt caps — no message says lifetime cap is 4", () => {
  test("no rule messageTemplate claims lifetime cap of 4", () => {
    for (const r of rules) {
      const rendered = renderMessage(r.ruleId, {}).message;
      const looksLikeLifetime4 =
        /lifetime[^.]{0,40}\b4\b/i.test(rendered) ||
        /\b4\b[^.]{0,40}lifetime/i.test(rendered);
      expect(looksLikeLifetime4, `rule ${r.ruleId}: "${rendered}"`).toBe(false);
    }
  });

  test("snapshot JSON does not contain 'lifetime cap is 4'", () => {
    const snapshotPath = path.resolve(
      __dirname,
      "../contract/admissions.contract.json"
    );
    const raw = fs.readFileSync(snapshotPath, "utf8");
    expect(raw).not.toMatch(/lifetime cap is 4/i);
    expect(raw).toMatch(/lifetime cap is \{lifetimeAttemptCap\} attempts/);
  });
});
