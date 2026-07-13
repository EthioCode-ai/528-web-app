// Node script — regenerates admissions.contract.json from the
// current rules.js registry + entities/index.js. Not run in tests;
// run manually via `node .../generateSnapshot.js` when the reviewer
// approves a contract change. The freeze test asserts the snapshot
// is byte-identical to what this script would produce.

import { rules } from "../rules.js";
import { ENTITIES } from "../entities/index.js";
import policy from "../admissionsPolicySnapshot.js";

export function buildSnapshot() {
  const entities = {};
  for (const [key, meta] of Object.entries(ENTITIES)) {
    entities[key] = {
      mvpRequiredKeys: [...meta.mvpRequiredKeys],
      sensitiveKeys: [...meta.sensitiveKeys],
    };
  }
  return {
    contractVersion: "gate3-2026-07.1",
    policySnapshotVersion: policy.snapshotVersion,
    entities,
    rules: rules.map((r) => ({
      ruleId: r.ruleId,
      severity: r.severity,
      scope: r.scope,
      target: [...r.target],
      messageTemplate: r.messageTemplate,
      metadataTemplate: { ...r.metadataTemplate },
      phase: r.phase,
    })),
  };
}

export function serializeSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2) + "\n";
}
