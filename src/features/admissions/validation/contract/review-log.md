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

## gate3-2026-07.1 (MCAT attempt-cap correction + fixture rename)

- **Contract version:** `gate3-2026-07.1`
- **Policy snapshot version:** `2026-07-gate3.1`
- **Snapshot SHA-256:** `98cf56bdc3f2012e54d38eb358609935517136ce9696b15973a5ef69b93c871e`
- **Reviewer:** Admissions Copilot review chain (Gate 3 policy correction)
- **Date:** 2026-07-13
- **Change 1 — MCAT attempt-cap policy correction.** The previous
  snapshot used `lifetimeAttemptCap: 4` and a single rule
  `mcat.attempts.exceeded` whose message claimed "AAMC lifetime cap
  is 4 attempts." That was factually incorrect. AAMC's actual limits
  (verified against
  https://students-residents.aamc.org/taking-mcat-exam/limits-mcat-attempts)
  are:
    - **3** attempts per single testing year
    - **4** attempts over two consecutive testing years
    - **7** attempts lifetime
  Split into three distinct rules with correctly named IDs:
    - `mcat.attempts.lifetime-cap` — **blocking**, cap 7. Enforced at
      the `applicantMcatAttemptsSchema` array-max layer.
    - `mcat.attempts.two-year-cap` — **warning**, cap 4. Registered
      but NOT enforced by a runner yet (deferred until Gate 4
      attempt-date-window logic exists).
    - `mcat.attempts.testing-year-cap` — **warning**, cap 3.
      Registered but NOT enforced yet, same rationale.
- **Change 2 — Fixture naming discipline.** Fixture-side identifiers
  that could plausibly read as a real place were replaced with
  clearly synthetic labels: `Northern State University` →
  `Synthetic University Alpha`; `Northern Community Clinic` →
  `Synthetic Community Clinic Alpha`.
- **Severity movement:** No loosening. `mcat.attempts.exceeded` was
  a misnamed rule and is retired; the new `lifetime-cap` rule
  preserves the blocking severity for the correct threshold.

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
