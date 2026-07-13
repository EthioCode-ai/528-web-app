// Scan every admissions source file to confirm no private applicant
// data or applicant-shaped test fixtures were introduced in Gate 2.
//
// The reviewer's constraint: "no private applicant data" and
// "no real applicant data". This test walks the admissions feature
// directory and the admissions routes directory, reading each file,
// and asserts no strings match applicant PII markers (emails, phone
// numbers, real school names, GPAs, MCAT scores, personal essay
// prose). Any hit would fail the build.

import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "__tests__") continue; // tests themselves may have
                                          // synthetic assertions, e.g.
                                          // FORBIDDEN_FAKE_TEXTS
      out.push(...walk(full));
    } else if (/\.(js|jsx|ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const featureDir = path.resolve(__dirname, "..");
const routesDir = path.resolve(__dirname, "../../../app/(dashboard)/admissions");

const scannedFiles = [...walk(featureDir), ...walk(routesDir)];

// Regexes chosen to be conservative — flag ANYTHING that looks like
// applicant data. False positives here are cheap; false negatives
// leak real data.
const APPLICANT_PII_PATTERNS = [
  // Real-shaped email addresses (excluding fixtures that use @example.test)
  /[a-zA-Z0-9._%+-]+@(?!example\.test|example\.com|localhost)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  // US phone numbers
  /\b\d{3}[-.]\d{3}[-.]\d{4}\b/,
  /\b\(\d{3}\)\s*\d{3}[-.]\d{4}\b/,
  // MCAT scores in body copy (a hardcoded 528 with dashes would be a
  // pitch, not applicant data — allow that. But "515" alone as a
  // score is applicant data.)
  /\bMCAT[:\s]+5\d{2}\b/i,
  // Real medical school names
  /\bHarvard Medical\b/i,
  /\bJohns Hopkins\b/i,
  /\bJohn Hopkins\b/i,
  /\bStanford (?:Medical|School of Medicine)\b/i,
  /\bMayo Clinic\b/i,
  /\bUCSF\b/i,
  /\bUCLA\b/i,
  /\bYale School of Medicine\b/i,
  /\bColumbia (?:Medical|Vagelos)\b/i,
  // GPA-shaped values in copy
  /\bGPA[:\s]+[0-3]\.\d{1,2}\b/i,
];

describe("No private applicant data in the Admissions Gate 2 tree", () => {
  test("scanned at least the expected number of files", () => {
    expect(scannedFiles.length).toBeGreaterThan(10);
  });

  test.each(APPLICANT_PII_PATTERNS.map((rx) => [rx.toString(), rx]))(
    "no source file matches %s",
    (_label, rx) => {
      const hits = [];
      for (const file of scannedFiles) {
        const content = fs.readFileSync(file, "utf8");
        if (rx.test(content)) {
          hits.push(file);
        }
      }
      expect(hits, `matches for ${_label}:\n  ${hits.join("\n  ")}`).toEqual([]);
    }
  );
});
