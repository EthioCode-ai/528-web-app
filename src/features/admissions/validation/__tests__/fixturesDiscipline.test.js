// §7.5 fixture-discipline test. Every file under fixtures/synthetic
// must export SYNTHETIC_FIXTURE=true and must not populate any
// sensitive field with real-looking PII (email, SSN, MRN, DOB, etc.).

import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as F from "../fixtures/synthetic/index.js";
import { ENTITIES } from "../entities/index.js";

const FIXTURE_DIR = path.resolve(__dirname, "../fixtures/synthetic");

function listFixtureFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory()
        ? listFixtureFiles(path.join(dir, d.name))
        : [path.join(dir, d.name)]
    );
}

const PII_PATTERNS = [
  /\bSSN\b/i,
  /\bMRN\b/i,
  /\bDOB\s*[:=]/i,
  /patient_name\s*[:=]/i,
  /social_security/i,
  /medical_record_number/i,
];

describe("fixture-discipline — every fixture file", () => {
  const files = listFixtureFiles(FIXTURE_DIR);
  test.each(files)("%s carries SYNTHETIC_FIXTURE=true", (f) => {
    const raw = fs.readFileSync(f, "utf8");
    expect(raw, `${f} must export SYNTHETIC_FIXTURE = true`).toMatch(
      /export\s+const\s+SYNTHETIC_FIXTURE\s*=\s*true/
    );
  });

  test.each(files)("%s does not contain real-looking PII patterns", (f) => {
    const raw = fs.readFileSync(f, "utf8");
    for (const p of PII_PATTERNS) {
      expect(raw, `${f} contains PII-shaped pattern ${p}`).not.toMatch(p);
    }
  });
});

describe("applicant profile fixture — no sensitive fields populated", () => {
  test("only MVP fields present", () => {
    const keys = Object.keys(F.validApplicantProfile);
    for (const sensitive of ENTITIES.applicantProfile.sensitiveKeys) {
      expect(keys, `sensitive field ${sensitive} must not be populated in fixture`)
        .not.toContain(sensitive);
    }
  });
});
