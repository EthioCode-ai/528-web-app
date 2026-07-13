// §7.4 contract parity + freeze tests. Guards drift between the
// portal's rules/entities and the checked-in
// admissions.contract.json snapshot.

import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { rules } from "../rules.js";
import { ENTITIES } from "../entities/index.js";
import policy from "../admissionsPolicySnapshot.js";
import { buildSnapshot, serializeSnapshot } from "../contract/generateSnapshot.js";
import {
  EXPECTED_SNAPSHOT_SHA256,
  EXPECTED_CONTRACT_VERSION,
  EXPECTED_POLICY_SNAPSHOT_VERSION,
} from "../contract/expectedSnapshotHash.js";

const CONTRACT_PATH = path.resolve(
  __dirname,
  "../contract/admissions.contract.json"
);

function readContract() {
  return fs.readFileSync(CONTRACT_PATH, "utf8");
}

function contractHash() {
  return crypto.createHash("sha256").update(readContract()).digest("hex");
}

describe("contract snapshot — parity with rules.js", () => {
  const raw = readContract();
  const snap = JSON.parse(raw);

  test("every portal rule is in the snapshot", () => {
    const snapIds = new Set(snap.rules.map((r) => r.ruleId));
    for (const r of rules) {
      expect(snapIds.has(r.ruleId), `missing in snapshot: ${r.ruleId}`).toBe(true);
    }
  });

  test("every snapshot rule is in the portal registry", () => {
    const portalIds = new Set(rules.map((r) => r.ruleId));
    for (const r of snap.rules) {
      expect(portalIds.has(r.ruleId), `missing in portal registry: ${r.ruleId}`).toBe(true);
    }
  });

  test("severity, scope, messageTemplate, phase match per rule", () => {
    const byId = Object.fromEntries(snap.rules.map((r) => [r.ruleId, r]));
    for (const r of rules) {
      const s = byId[r.ruleId];
      expect(s.severity, `severity mismatch on ${r.ruleId}`).toBe(r.severity);
      expect(s.scope, `scope mismatch on ${r.ruleId}`).toBe(r.scope);
      expect(s.messageTemplate, `messageTemplate mismatch on ${r.ruleId}`).toBe(r.messageTemplate);
      expect(s.phase, `phase mismatch on ${r.ruleId}`).toBe(r.phase);
      expect(s.target, `target mismatch on ${r.ruleId}`).toEqual(r.target);
    }
  });

  test("entity mvpRequiredKeys and sensitiveKeys match snapshot", () => {
    for (const [key, meta] of Object.entries(ENTITIES)) {
      const snapEntity = snap.entities[key];
      expect(snapEntity, `snapshot missing entity ${key}`).toBeTruthy();
      expect(new Set(snapEntity.mvpRequiredKeys)).toEqual(
        new Set(meta.mvpRequiredKeys)
      );
      expect(new Set(snapEntity.sensitiveKeys)).toEqual(
        new Set(meta.sensitiveKeys)
      );
    }
  });

  test("policySnapshotVersion pinned", () => {
    expect(snap.policySnapshotVersion).toBe(policy.snapshotVersion);
    expect(snap.policySnapshotVersion).toBe(EXPECTED_POLICY_SNAPSHOT_VERSION);
  });

  test("contractVersion pinned", () => {
    expect(snap.contractVersion).toBe(EXPECTED_CONTRACT_VERSION);
  });
});

describe("contract snapshot — freeze", () => {
  test("SHA-256 matches expectedSnapshotHash.js", () => {
    expect(contractHash()).toBe(EXPECTED_SNAPSHOT_SHA256);
  });

  test("regenerating from registry produces byte-identical snapshot", () => {
    const rebuilt = serializeSnapshot(buildSnapshot());
    expect(rebuilt).toBe(readContract());
  });
});
