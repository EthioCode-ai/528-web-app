// Locked v0.2 decision — synthetic-name discipline extended.
// Word-boundary matched against every fixture file so a `stateResidency:
// "MA"` does not collide with `"Mayo"`.

import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const FIXTURE_DIR = path.resolve(__dirname, "../../validation/fixtures/synthetic");

function listFixtureFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? listFixtureFiles(path.join(dir, d.name)) : [path.join(dir, d.name)]
    );
}

const DENYLIST = [
  "Harvard", "Stanford", "Yale", "MIT", "Johns Hopkins", "Duke", "Columbia",
  "Cornell", "UCSF", "UCLA", "Penn",
  "Mayo", "NYU", "WashU", "Vanderbilt", "Northwestern", "Emory", "Baylor",
  "Mount Sinai", "Michigan", "Washington University", "Case Western",
  "Pitt", "UVA", "UNC", "UT Southwestern",
];

const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = DENYLIST.map((name) => new RegExp(`\\b${escaped(name)}\\b`, "i"));

describe("synthetic-name discipline — extended denylist", () => {
  const files = listFixtureFiles(FIXTURE_DIR);
  test.each(files)("%s does NOT contain any denylisted real-institution name", (f) => {
    const raw = fs.readFileSync(f, "utf8");
    for (let i = 0; i < patterns.length; i++) {
      expect(raw, `file ${f} contains "${DENYLIST[i]}"`).not.toMatch(patterns[i]);
    }
  });
});
