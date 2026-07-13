# Admissions Copilot Validation Contract — Review Log

Every change to `admissions.contract.json` requires a matching entry
here AND a paired change to `expectedSnapshotHash.js`. The freeze
test in `__tests__/contractFreeze.test.js` refuses any drift.

Severity may only tighten between versions (informational → warning
→ blocking). Loosening a rule requires a reviewer note stating the
justification and the compensating control that replaces the tighter
severity.

Contract version format: `gate{N}-{YYYY}-{MM}` (with tie-break tag if needed).

---

## gate3-2026-07 (initial)

- **Contract version:** `gate3-2026-07`
- **Policy snapshot version:** `2026-07-gate3`
- **Snapshot SHA-256:** `2198496cca3fb5cc755e63c77c066504c4ca8e9f15c6070d031f805d60d3b4be`
- **Reviewer:** Admissions Copilot review chain (Gate 3 acceptance)
- **Date:** 2026-07-13
- **Rules:** 50 (all rules per Gate 3 v0.2 §3 with the final severity
  assignments — see plan doc §9.3 for the resolution table)
- **Entities:** 19 (all §1 entities plus barreled aggregates)
- **Notes:** Establishes the baseline. Backend mirror (Gate 4) will
  publish its own snapshot mirror; parity across the two is enforced
  by the backend's `contract.parity.test` and by the portal-side
  freeze test. No fields on production applicant records are read
  or written by this contract at this stage.
