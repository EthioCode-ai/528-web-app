# Admissions Copilot — Gate 5 Phase 2 Plan (v0.1)

**Status:** Draft — awaiting reviewer approval before implementation.
**Scope:** Plan the first narrow UAT persistence + API slice on top
of the merged Gate 5 Phase 1 foundation. **12 endpoints only** —
one health confirmation + one profile pair + one metrics pair +
one MCAT-attempts pair + one PREview pair + evidence list/add/update.
Not the full 37-endpoint surface from plan v0.4 §4.1.1 — the
remaining 25 endpoints are deferred to Phase 3+.
**Non-scope:** Real applicant trial; UAT migration until this plan
is approved; production enablement; external providers / LLMs;
document upload; delete/export/reconcile; Growth Engine, mobile,
billing/Stripe, backend entitlement grant flow; Phase 6 / Gate 6
work; cleanup of pre-existing production `admissions.documents`.

Phase 1 landed on `main` at:
- **Backend** `mcat-study-app-backend`: `7466bd146eb7397ebbfaf060e247656616dca268` (PR #2 merged 2026-07-21)
- **Portal** `528-web-app`: `5f99af292128173f8a29c3a3897f1f5dd36adb66` (PR #4 merged 2026-07-21)

Phase 2 keeps every Phase 1 discipline intact:
- Strict `ADMISSIONS_COPILOT_ENABLED === "1"` mount gate (unmounted in prod, global 404)
- Runtime app-role `DATABASE_URL` only; migration-role URL never in runtime env
- Surgical Gate-5-only table cleanup in CI (no DROP SCHEMA)
- Gate 5 migrations live in `domains/admissions/migrations/gate5/`
- Vendored contract + freeze parity
- Session-only portal `runStore.acknowledgements[]`
- Backend router at `/api/admissions/gate5/*` (intermediate path from Phase 1)

This is a **planning gate**. Nothing is implemented until the
reviewer signs off on this plan.

---

## Table of contents

1. [Backend endpoints (the narrow slice)](#1-backend-endpoints-the-narrow-slice)
2. [Portal integration](#2-portal-integration)
3. [Validation](#3-validation)
4. [Audit](#4-audit)
5. [Security](#5-security)
6. [UAT migration](#6-uat-migration)
7. [Tests](#7-tests)
8. [Explicit non-goals](#8-explicit-non-goals)
9. [Deliverable summary + open questions](#9-deliverable-summary--open-questions)

---

## 1. Backend endpoints (the narrow slice)

Twelve endpoints total. All Phase 2 endpoints ship behind the Phase 1
mount gate (`isGate5Enabled(env)` → strict `"1"` check), so they are
**not mounted in production**.

### 1.1 Endpoint list

Mount path proposal: `/api/admissions/gate5` (kept from Phase 1 to
avoid re-parenting the router in this phase — see §9.3 open
question). Route table below uses that mount.

| # | Method + Path | Handler | Gate 3 entity |
|---|---|---|---|
| 1 | `GET /api/admissions/gate5/health` | Phase 1 (`gate5/routes/health.js`) — unchanged | n/a |
| 2 | `GET /api/admissions/gate5/me/profile` | new — Phase 2 | applicant profile |
| 3 | `PUT /api/admissions/gate5/me/profile` | new — Phase 2 | applicant profile |
| 4 | `GET /api/admissions/gate5/me/academic-metrics` | new — Phase 2 | academic metrics |
| 5 | `PUT /api/admissions/gate5/me/academic-metrics` | new — Phase 2 | academic metrics |
| 6 | `GET /api/admissions/gate5/me/mcat-attempts` | new — Phase 2 | MCAT attempts |
| 7 | `PUT /api/admissions/gate5/me/mcat-attempts` | new — Phase 2 | MCAT attempts (replace list) |
| 8 | `GET /api/admissions/gate5/me/preview-scores` | new — Phase 2 | PREview scores |
| 9 | `PUT /api/admissions/gate5/me/preview-scores` | new — Phase 2 | PREview scores (replace list) |
| 10 | `GET /api/admissions/gate5/me/evidence` | new — Phase 2 | evidence items (list) |
| 11 | `POST /api/admissions/gate5/me/evidence` | new — Phase 2 | evidence items (add) |
| 12 | `PUT /api/admissions/gate5/me/evidence/:id` | new — Phase 2 | evidence item (update) |

**No `DELETE` routes in Phase 2** (deferred per plan v0.4 §4.1.2 /
§4.5). Deletion of any Gate 5 record remains runbook-scripted.

### 1.2 Auth / entitlement / ownership discipline (unchanged from Phase 1)

Every route (except `GET /health`) passes through, in order:
1. `assignRequestId` — attaches a per-request UUID
2. `extractIfMatch` — reads the `If-Match: <version>` header
3. `extractIdempotencyKey` — reads the `Idempotency-Key` header
4. `requireGate5Auth` — JWT verification; 401 on failure
5. `requireGate5Entitlement` — `subscription_tier ∈ {elite, vip}`; 403 on failure
6. `makeLimiter({ kind: 'read' | 'mutation' | 'draft_mutation' })` — 60/20/10 req/min/user
7. Route handler:
   - Read handlers: `SELECT ... FROM admissions.<table> WHERE user_id = $auth_uid` via a shared query builder (no way to bypass the ownership predicate)
   - Write handlers: `assertIfMatch(currentVersion, req, res)` → parse Zod → INSERT/UPDATE → audit_log INSERT → return updated shape

### 1.3 One-per-user vs list-per-user semantics

The Gate 3 contract is clear about cardinality per applicant. Phase 2
maps it as:

| Entity | Cardinality | GET returns | PUT semantics |
|---|---|---|---|
| applicant_profiles | 1:1 with user | single object or `null` if none | upsert (create-or-update) |
| academic_metrics | 1:1 | single or `null` | upsert |
| mcat_attempts | 1:many (up to 7 lifetime cap) | array | replace-list (server validates cap) |
| preview_scores | 1:many (per cycle) | array | replace-list |
| evidence_items | 1:many | array (paginated by cursor once > 50 items) | POST=add-one, PUT /:id = update-one |

Rationale:
- `PUT` on 1:1 entities is upsert — simpler client, natural HTTP shape.
- `PUT` on list entities (`mcat-attempts`, `preview-scores`) is
  replace-list because these are small (≤ 7 MCAT / ≤ few PREview),
  the applicant edits them as a unit, and server-side upsert-with-diff
  would leak surprising per-row versioning to the client.
- Evidence is different because it can grow to dozens of entries.
  `POST /evidence` adds one, `PUT /evidence/:id` updates one, list
  `GET /evidence` is cursor-paginated (page size 50).

### 1.4 Request / response shapes

- **Request bodies** for PUT / POST: Zod schemas from
  `src/features/admissions/validation/entities/*.js` (portal) mirrored
  by the backend's parity-tested rules registry. Backend parses;
  422 on failure with the standard `{ error, violations, requestId }`
  envelope from `gate5/lib/errors.js`.
- **Response bodies**:
  - `2xx` success:
    ```json
    {
      "data": { ...entity shape... },
      "version": 42,
      "requestId": "uuid"
    }
    ```
    or for lists:
    ```json
    {
      "data": [ ... ],
      "cursor": { "next": "opaque_string" | null },
      "requestId": "uuid"
    }
    ```
  - `4xx` / `5xx`: standard error envelope from Phase 1
    (`{ error, violations?, requestId }`).

### 1.5 Optimistic concurrency

Every `PUT` requires `If-Match: <version>` per plan v0.4 §4.5.
- Missing header → `409 Conflict`.
- Version mismatch → `409 Conflict`.
- Success → response `version` increments; the client uses that
  value for the next PUT.
- Insert paths (POST /evidence) do not require `If-Match` (no
  version yet); they return the initial `version: 1`.

### 1.6 Idempotency

Every `PUT` / `POST` accepts an optional `Idempotency-Key` header.
Server caches the response body keyed by `(user_id, idempotency_key)`
for 24h (Phase 1 `middleware/idempotency.js` in-memory cache). Same
key → same body returned; version does not double-increment.
Persistence of the cache to a DB table is deferred to Phase 3+.

### 1.7 Cursor pagination (evidence list only)

`GET /evidence` returns page size 50 by default, sorted by
`created_at DESC, evidence_id DESC`. Cursor is an opaque
base64url-encoded string containing `{ created_at, evidence_id }` —
the last row of the current page. Cursor is signed with the auth
user id so a caller cannot tamper it.

---

## 2. Portal integration

### 2.1 Files produced (portal)

```
src/features/admissions/persistence/
├── apiClient.js          (Phase 1 — unchanged)
├── errors.js             (new — ApiClientError already exists; add helpers)
├── cursor.js             (new — opaque cursor decode helper)
├── adapters/
│   ├── profileAdapter.js
│   ├── metricsAdapter.js
│   ├── mcatAdapter.js
│   ├── previewAdapter.js
│   ├── evidenceAdapter.js
│   └── index.js          (barrel)
├── hooks/
│   ├── useAdmissionsProfile.js
│   ├── useAdmissionsMetrics.js
│   ├── useAdmissionsMcatAttempts.js
│   ├── useAdmissionsPreviewScores.js
│   └── useAdmissionsEvidence.js
└── __tests__/
    ├── apiClient.test.js               (Phase 1 — unchanged)
    └── adapters/
        ├── profileAdapter.test.js
        ├── metricsAdapter.test.js
        ├── mcatAdapter.test.js
        ├── previewAdapter.test.js
        └── evidenceAdapter.test.js
```

- Each adapter is a thin function around `apiClient` that:
  1. Builds the correct path (e.g. `/gate5/me/profile`)
  2. Parses the response through the matching Zod schema
  3. Surfaces `ApiClientError` (Phase 1) on non-2xx
  4. Never accepts a `user_id` from the caller — the backend infers it from auth

- Hooks (`useAdmissionsProfile()` etc.) wrap adapters with a small
  cache + `If-Match` version-tracking so components can call
  `updateProfile({ ...patch, version })` without threading versions
  manually.

### 2.2 What Phase 2 does NOT do in the portal

- **No real applicant workflow wiring.** Adapters exist but are not
  yet invoked from any user-facing page. Gate 4's fictional flow
  keeps rendering from `GATE4_FIXTURE_BUNDLE`.
- **No document upload.**
- **No export / delete / reconcile** endpoints.
- **No external provider** SDK.
- **No LLM.**
- **No billing / entitlement UI changes** — the existing entitlement
  gate remains authoritative.

### 2.3 UAT-only adapter enablement

Adapters honor a small `isAdmissionsPersistenceEnabled()` predicate:

```js
function isAdmissionsPersistenceEnabled() {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED === '1' &&
    typeof process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE === 'string' &&
    process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE.length > 0
  );
}
```

- Production: false (portal flag unset).
- UAT dev: true (all three set).
- CI: true only in test-runner env; test suite mocks `fetch` per Gate 4 discipline.

If the predicate returns false, adapters throw a distinctive
`ApiClientError({ status: 0, body: { error: 'persistence_disabled' } })`
so a caller can fall back to fixture data (or refuse to render).

### 2.4 Runtime `runGuard` — unchanged from Gate 4.1

Persistence calls happen at page mount / user click, **outside**
the Gate 4 `runOrchestrator`'s `runGuard` scope. The runGuard from
Gate 4.1 remains untouched — it only fires during the deterministic
orchestrator run, not during persistence calls.

### 2.5 runStore integration is optional in Phase 2

Adapters return data directly. Whether the returned data hydrates
`useAdmissionsRunStore.fixtures` is a Phase 3 concern — Phase 2
proves the adapter shape works end-to-end without changing the
Gate 4 flow.

---

## 3. Validation

### 3.1 Contract source of truth (unchanged)

Portal's `src/features/admissions/validation/contract/admissions.contract.json`
remains the frozen source of truth. Backend vendored copy at
`domains/admissions/gate5/contract/admissions.contract.json` continues
to be SHA-256-frozen by `expectedSnapshotHash.js`. Phase 2 does NOT
bump the contract version.

### 3.2 Request validation (backend)

For every mutating route (PUT/POST):
1. Extract JSON body via `express.json()`.
2. Parse through the appropriate Zod schema from
   `src/features/admissions/validation/entities/*.js`
   (or the backend's parity-tested mirror).
3. On failure, map every `ZodError.issues[]` entry to a
   `{ ruleId, target, message, metadata }` shape referencing the
   Gate 3 rule registry. Return `422` with the standard envelope.

The mapping table (`zod-issue → ruleId`) lives at
`domains/admissions/gate5/lib/zodMapping.js` (new — Phase 2). It
turns Zod's internal `code`/`path`/`params` into a Gate 3 rule
identifier so the wire response is contract-aligned.

### 3.3 Response validation (defensive)

For every GET/PUT/POST response body (before sending):
- Backend re-parses the outgoing object through its own Zod schema.
  Any mismatch is an internal invariant failure — return `500` with
  `error: server_error` and a logged (redacted) trace. This catches
  drift between the DB shape and the Gate 3 contract during Phase 2
  development.
- Response validation is behind a flag `GATE5_STRICT_RESPONSE=1`
  that defaults on in UAT and CI but can be disabled in a future
  hot-path where the perf cost isn't warranted.

### 3.4 Structured 422 violations

Every violation surfaces as:
```json
{
  "error": "validation",
  "violations": [
    {
      "ruleId": "gpa.range",
      "target": ["metrics.cumulativeGPA"],
      "message": "GPA must be between 0.00 and 4.00.",
      "metadata": { "min": 0.0, "max": 4.0, "actual": 4.5 }
    }
  ],
  "requestId": "..."
}
```

`ruleId` values come straight from the vendored contract JSON.

---

## 4. Audit

### 4.1 Append discipline

Every successful mutation (PUT/POST) inserts one row into
`admissions.audit_log` inside the same transaction as the entity
write. If audit_log insert fails, the entity write rolls back:

```
BEGIN;
  UPDATE admissions.applicant_profiles SET ... WHERE user_id = $1 RETURNING *;
  INSERT INTO admissions.audit_log (...) VALUES (...);
COMMIT;
```

### 4.2 Redaction (from Phase 1)

`audit/redact.js` (Phase 1) is reused unchanged. For each mutation:
- `before_payload` = redacted snapshot of the row pre-update (null on INSERT).
- `after_payload` = redacted snapshot of the row post-update.
- Sensitive fields (`legalNameFirst`, `contactEmail`, `pronouns`,
  `citizenshipStatus`, `demographics`, etc.) → `[REDACTED-sensitive]`.
- Free-text content fields (`narrative` on evidence,
  `mostMeaningfulEssay` on activities, `interpretation` on
  interpretations, etc.) → `{ len, sha256 }` shape stub.
- Any string > 200 chars → same shape stub.

### 4.3 Backend role privileges (from Phase 1)

- `INSERT ON admissions.audit_log` — granted (via 003_gate5_schema_grants.sql).
- `SELECT / UPDATE / DELETE ON admissions.audit_log` — revoked (via 018_gate5_audit_log.sql).
- **Phase 2 must NOT grant SELECT to the backend role** — read access
  remains via a separate ops runbook per plan v0.4 §13.3 row 8.

### 4.4 Audit-append test (Phase 2)

`tests/admissions/gate5/audit.append.test.js` — for each mutation
endpoint, exercise:
1. Send valid PUT/POST.
2. Assert response is 2xx.
3. Connect via an ops-role URL and `SELECT` from `audit_log` where
   `user_id = <test user>` — assert exactly one new row per mutation,
   with the right `action`, `entity_kind`, `entity_id`, `request_id`,
   and redacted `before_payload` / `after_payload`.

The ops-role URL is CI-only, gated by a new
`ADMISSIONS_TEST_AUDIT_READER_URL` secret (see §7.4). Never exposed
to the backend runtime.

---

## 5. Security

### 5.1 Ownership (from Phase 1)

- Every query built via a shared helper that appends
  `WHERE user_id = $auth_uid`. The helper lives at
  `domains/admissions/gate5/lib/query.js` (new — Phase 2) so route
  code cannot bypass it.
- Every mutation's returning row also passes through
  `assertOwnership(record, req, res)` from Phase 1 before returning.

### 5.2 No enumeration

- UUID-only primary keys (already Gate 3 discipline).
- Cursor pagination on `evidence` (§1.7); cursor is signed with the
  auth user id so tampering rejects with `400`.
- Rate limits per user (Phase 1): 60/min reads, 20/min mutations,
  10/min draft-mutations. Draft-mutation category is unused in Phase
  2 (no draft endpoints yet) but the limiter is registered.

### 5.3 Uniform 404 on non-existent records

For entities that may or may not exist for a given user
(applicant_profile, academic_metrics, mcat_attempts as an array of
zero, preview_scores similarly):

- `GET /me/profile` returns `{ data: null, requestId: ... }` with
  `200` when the row doesn't exist. Rationale: the client legitimately
  needs to distinguish "no profile yet" from "auth failed" or
  "server error" — 200 with null is the cleanest boundary.
- `PUT /me/evidence/:id` for a non-existent OR not-your-evidence ID
  returns `404 not_found` **without leaking existence**. The response
  body is identical regardless of whether the ID exists on a
  different user's account.

### 5.4 Backend production flag remains off

`ADMISSIONS_COPILOT_ENABLED` unset in production → whole Phase 1 +
Phase 2 router unmounted. Production `/api/admissions/gate5/*`
continues to hit the Express global 404.

### 5.5 Fail-closed on middleware error

Every middleware that throws returns `500 server_error` (with
requestId). No middleware ever bypasses auth on internal error.
The `assignRequestId → extractIfMatch → extractIdempotencyKey →
requireGate5Auth → requireGate5Entitlement → rateLimit` chain is
strictly ordered; each middleware only advances via `next()` after
its check passes.

### 5.6 No credential leakage (from Phase 1)

- Backend runtime never sees the migration-role URL.
- CI workflow reports only lengths, never URL text (Phase 1.1).
- Every catch block that logs a DB error wraps through
  `redactDbErrorForLog(err)` (planned Phase 2 helper —
  `domains/admissions/gate5/lib/logSafe.js`).

---

## 6. UAT migration

### 6.1 Planning-only in Phase 2

The Gate 5 CI workflow continues to run migrations against the
Render test DB `mcat-admissions-test` on every PR-triggered CI
run — this is already working (Phase 1.3).

The UAT database `mcat-admissions-uat` (identifier confirmed by
reviewer at preflight) has **NOT been migrated** and **will NOT be
migrated during Phase 2** until this plan is approved AND a
separate reviewer sign-off explicitly authorizes the UAT migration
step.

### 6.2 Proposed UAT migration flow (after this plan is approved)

Runbook (to be written as `docs/uat-deploy-runbook.md` at Phase 2
implementation time):

1. Reviewer manually runs
   `psql "$ADMISSIONS_UAT_MIGRATION_ROLE_URL" -c "SELECT current_database();"`
   to confirm connectivity — value is masked; only success/failure
   is reported.
2. Reviewer runs the same schema-grants + surgical-table sequence
   the CI workflow does, against UAT:
   `CREATE SCHEMA IF NOT EXISTS admissions;` + `DROP TABLE IF EXISTS admissions.<15 tables> CASCADE;` +
   apply `003_gate5_*.sql` … `018_gate5_*.sql` in order via
   `PGOPTIONS="-c gate5.backend_role=<UAT app-role name>"`.
3. Reviewer runs the same 10 `has_table_privilege` checks + live
   audit_log SELECT-denial check against the UAT app-role URL.
4. Reviewer flips the Render UAT service's
   `ADMISSIONS_COPILOT_ENABLED` env var to `"1"` (via Render
   dashboard) and redeploys.
5. Reviewer verifies `GET https://uat.<host>/api/admissions/gate5/health`
   returns `200`.

No automation writes UAT env vars. No automation runs UAT
migrations. Every step above is a manual runbook operation.

### 6.3 Production DB remains untouched

Zero migrations against production Render Postgres in Phase 2. The
production `ADMISSIONS_COPILOT_ENABLED` env var stays unset. The
production admissions schema retains the pre-existing
`applications` / `documents` / `_migrations` / `document_audit` /
`entitlements_audit` tables **untouched** (per your standing "no
cleanup of admissions.documents" rule).

---

## 7. Tests

### 7.1 Render test DB CI (from Phase 1.3)

`.github/workflows/admissions-gate5-ci.yml` is extended to run
Phase 2's contract tests against the freshly migrated test DB.
Steps:

1. Existing Phase 1.3 reset + migrate-up + privilege-verify sequence.
2. NEW: **seed a single synthetic test user** into `public.users`
   (via a small test-only helper) and grant it the
   `admissions_copilot` entitlement. This user's `user_id` is what
   the tests authenticate as.
3. Run Jest suites — including the new Phase 2 contract tests.
4. Existing migrate-down.

Seeding lives at `tests/admissions/gate5/support/testUsers.js`. The
seed function refuses to run against a DB name matching
`production` / any known prod name.

### 7.2 API contract tests

One test file per endpoint from §1.1 (excluding health which is
Phase 1). Each test covers:

- `401` without auth token
- `403` when entitlement missing
- `403` when acting on another user's record (ownership check)
- `422` on every blocking Gate 3 rule that applies to that entity
- `2xx` on happy path (with matching response shape)
- `409` on `If-Match` mismatch (mutations only)
- `429` on rate-limit exceeded (list endpoint only)
- **No `DELETE` / `204` contract tests** (deferred per plan v0.4)

Backend test files (under `tests/admissions/gate5/routes/`):
- `profile.test.js`
- `academic-metrics.test.js`
- `mcat-attempts.test.js`
- `preview-scores.test.js`
- `evidence.list.test.js`
- `evidence.create.test.js`
- `evidence.update.test.js`

### 7.3 Ownership tests

`tests/admissions/gate5/ownership.test.js` — creates two synthetic
users A and B, seeds records for each, then for every endpoint:

- User A's token accessing user A's record → 200
- User A's token accessing user B's record → **404 or 403** (uniform,
  no existence leak — see §5.3)
- No test user's cursor can be tampered to read another user's rows.

### 7.4 Audit tests

- `tests/admissions/gate5/audit.append.test.js` — asserts one
  audit_log row per mutation with correct shape (as described
  §4.4).
- `tests/admissions/gate5/audit.deny.test.js` — asserts the backend
  app-role URL cannot `SELECT` from `admissions.audit_log`. Extends
  Phase 1's `has_table_privilege` check with a live `SELECT count(*)
  FROM admissions.audit_log` that must error with `permission denied`.

Both audit tests use a **new** ops-role secret
`ADMISSIONS_TEST_AUDIT_READER_URL` that has SELECT-only access to
`admissions.audit_log` on the test DB. The ops-role URL is:
- Present in the audit test process env only (specific step's env block)
- Absent from every other step's env
- Absent from the backend runtime
- Never echoed to logs (length only, per Phase 1.1 discipline)

If the reviewer prefers not to add a fourth scoped secret, the
alternative is to use the test-runner's migration-role URL for the
audit read (already privileged) — see §9.3 question 3.

### 7.5 Validation failure tests

For each mutation endpoint, one test per Gate 3 blocking rule
that applies:

- Profile PUT → violations of MVP-required fields (missing
  `applicantLabel`, wrong `applicationCycle` shape, invalid
  `stateResidency` enum, etc.).
- Metrics PUT → GPA out of range, sGPA out of range.
- MCAT attempts PUT → each of the range rules + attempt-cap
  (lifetime 7) + sum-mismatch + voided-contradiction.
- PREview PUT → range 1–9.
- Evidence POST/PUT → title/narrative length limits + sensitivity
  tag enum + confirmed-then-sensitivity discipline.

Every test asserts `422` and that `violations[]` contains the
expected `ruleId`.

### 7.6 Portal apiClient / adapter tests

Extends Phase 1's apiClient tests with adapter-level coverage.
Each adapter (profile/metrics/mcat/preview/evidence) tests:

- Correct URL constructed (uses `NEXT_PUBLIC_ADMISSIONS_API_BASE`)
- Correct verb (GET / PUT / POST)
- If-Match header attached on PUT
- Idempotency-Key attached on POST/PUT when caller supplies one
- Response body parsed through the correct Zod schema
- `ApiClientError` surfaced on 401/403/404/409/422/429/5xx
- `persistence_disabled` when `isAdmissionsPersistenceEnabled()` returns false

Runs in the existing Vitest suite. No new fixture-discipline test
needed — Gate 4's `flow.namesAreSynthetic.test.js` and
`fixturesDiscipline.test.js` continue to cover the portal side.

### 7.7 No-credential-leak tests

`tests/admissions/gate5/log-safety.test.js` — programmatically
constructs a series of DB error scenarios (bad password, wrong
host, no such database, etc.), invokes the backend's error path,
and asserts the outgoing log output contains no substring matching:

- `postgresql://` / `postgres://` / `pg://`
- `PGPASSWORD=` / `PGUSER=`
- The URL's actual host, port, or credentials

Uses spy on `console.error` + `console.log`. If any test detects a
leak, it fails loud with a masked-diff to guide the fix.

Also extends the Phase 1.2 `workflow.guard.test.js` with two new
assertions:
- The workflow YAML never `echo "$..._URL"` verbatim (only lengths
  via `${#..._URL}`).
- Any new secret referenced in workflow env has a matching
  `Refuse to run if required secrets are missing` gate at the
  top of the job.

---

## 8. Explicit non-goals

Phase 2 does NOT:

- Run a real applicant trial.
- Migrate UAT until this plan is approved AND a separate reviewer
  sign-off authorizes the UAT step.
- Enable either feature flag in production (Vercel or Render).
- Integrate any external LLM / provider / scoring API / parser-as-a-service.
- Introduce document upload of any kind.
- Ship `DELETE /me` (delete-all) or per-record `DELETE` endpoints.
- Ship `GET /me/export` or reconcile tooling.
- Add Growth Engine, mobile, or billing/Stripe surface.
- Grant new backend entitlements (existing entitlement gate reused
  as-is).
- Clean up the pre-existing production `admissions.documents`
  test-shaped row.
- Start Gate 6 planning.
- Re-parent the router mount from `/api/admissions/gate5/*` to
  `/api/admissions/me/*` (deferred — see §9.3 question 1).
- Ship the remaining 25 endpoints from plan v0.4 §4.1.1 (activities,
  schools, school_research, citations, prompts, interpretations,
  drafts, draft-transition, doNotUseTopics, interview-prep, audit
  read, run/school-fit, run/copilot). Those are Phase 3+.

---

## 9. Deliverable summary + open questions

### 9.1 What Phase 2 implementation will produce (on approval)

**Backend (`mcat-study-app-backend`)**:

```
domains/admissions/gate5/
├── routes/
│   ├── index.js          (extended — mount new sub-routers)
│   ├── health.js         (unchanged)
│   ├── profile.js        (new)
│   ├── academic-metrics.js (new)
│   ├── mcat-attempts.js  (new)
│   ├── preview-scores.js (new)
│   └── evidence.js       (new)
├── lib/
│   ├── query.js          (new — ownership-safe query builder)
│   ├── zodMapping.js     (new — ZodError → Gate 3 ruleId)
│   ├── logSafe.js        (new — redactDbErrorForLog)
│   └── cursor.js         (new — signed opaque cursor)
├── handlers/
│   ├── readOne.js        (new — profile/metrics)
│   ├── upsertOne.js      (new — profile/metrics)
│   ├── replaceList.js    (new — mcat-attempts/preview-scores)
│   ├── listCursor.js     (new — evidence)
│   ├── createOne.js      (new — evidence POST)
│   └── updateOne.js      (new — evidence PUT :id)
└── (contract/ + audit/ + middleware/ unchanged from Phase 1)

tests/admissions/gate5/
├── routes/
│   ├── profile.test.js
│   ├── academic-metrics.test.js
│   ├── mcat-attempts.test.js
│   ├── preview-scores.test.js
│   ├── evidence.list.test.js
│   ├── evidence.create.test.js
│   └── evidence.update.test.js
├── ownership.test.js
├── audit.append.test.js
├── audit.deny.test.js
├── log-safety.test.js
├── support/
│   └── testUsers.js      (seed helpers)
└── (workflow.guard.test.js extended)

docs/
└── uat-deploy-runbook.md (new)
```

**Portal (`528-web-app`)**:

```
src/features/admissions/persistence/
├── apiClient.js          (unchanged)
├── errors.js             (new)
├── cursor.js             (new)
├── adapters/
│   ├── profileAdapter.js
│   ├── metricsAdapter.js
│   ├── mcatAdapter.js
│   ├── previewAdapter.js
│   ├── evidenceAdapter.js
│   └── index.js
├── hooks/
│   ├── useAdmissionsProfile.js
│   ├── useAdmissionsMetrics.js
│   ├── useAdmissionsMcatAttempts.js
│   ├── useAdmissionsPreviewScores.js
│   └── useAdmissionsEvidence.js
└── __tests__/
    ├── apiClient.test.js  (unchanged)
    └── adapters/
        ├── profileAdapter.test.js
        ├── metricsAdapter.test.js
        ├── mcatAdapter.test.js
        ├── previewAdapter.test.js
        └── evidenceAdapter.test.js
```

**CI workflow** (`.github/workflows/admissions-gate5-ci.yml`):
extended to (a) seed a synthetic test user before Jest runs,
(b) optionally consume `ADMISSIONS_TEST_AUDIT_READER_URL` for the
audit-deny test if the reviewer approves the fourth scoped secret.
No structural change to the surgical-drop discipline or the
migration-role separation.

### 9.2 What Phase 2 will NOT ship

- The 25 endpoints from plan v0.4 §4.1.1 not in §1.1 (activities /
  schools / school_research / citations / prompts / interpretations
  / drafts / draft-transition / doNotUseTopics / interview-prep /
  run/school-fit / run/copilot / audit read).
- `DELETE` routes.
- Document upload.
- Real applicant data.
- Production enablement.
- UAT migration execution.
- External providers.
- Delete/export/reconcile.
- Gate 6 work.

### 9.3 Open questions for the reviewer

Please confirm or redirect before Phase 2 implementation begins:

1. **Router mount path.** Keep the Phase 1 `/api/admissions/gate5/*`
   prefix, or re-parent to `/api/admissions/me/*` (per plan v0.4
   §4.1.1)? Recommendation: **keep `/gate5/` in Phase 2**; re-parent
   in a separate reviewer-approved step after the full endpoint
   set is stable. Reduces PR scope and lets the pre-existing
   `/api/admissions/health` and `/api/admissions/documents/*` remain
   safely isolated.

2. **PUT-list semantics for `mcat-attempts` and `preview-scores`.**
   Replace-list is proposed in §1.3. Alternative: PUT-with-diff
   (each item versioned) or POST-per-item. Recommendation: **replace-list**
   because these are small (≤ 7 attempts, ≤ a handful of PREview
   entries) and the applicant edits them as a unit.

3. **Fourth scoped GH Actions secret.** `ADMISSIONS_TEST_AUDIT_READER_URL`
   is proposed for audit-append tests to READ from the audit_log
   (the app-role URL cannot, by design). Alternative: reuse
   `ADMISSIONS_TEST_MIGRATION_ROLE_URL` (already privileged) for
   the audit read step. Recommendation: **new dedicated
   `ADMISSIONS_TEST_AUDIT_READER_URL`** so the ops-read path is
   cleanly separated from the DDL migration role. Requires you to
   configure it on the backend repo before CI can pass the audit-append
   test.

4. **Cursor pagination on `evidence`.** Default page size 50. Signed
   cursor tied to auth user id. Comfortable with these numbers, or
   prefer a smaller default (e.g. 20) for Phase 2 conservatism?

5. **Response envelope shape.** Proposed:
   `{ data, version | cursor, requestId }`. Alternative: return
   the bare entity object with headers `X-Admissions-Version` /
   `X-Admissions-Cursor-Next`. Recommendation: **envelope in the
   body** — one shape everywhere, easier to add fields without
   invalidating clients.

6. **`GATE5_STRICT_RESPONSE` flag** (§3.3). Recommend keeping
   response validation on in UAT + CI, off in a hypothetical
   future hot-path. Confirm the flag pattern (defaults-on with an
   explicit off) is what you want.

7. **UAT deploy runbook location.** Proposed `docs/uat-deploy-runbook.md`
   in the **backend** repo. Alternative: in the portal repo alongside
   the Gate plans. Recommendation: **backend repo** because the
   runbook operates on Render DB + backend service env vars, which
   are backend concerns.

8. **When to actually migrate UAT.** Not part of Phase 2
   implementation. Separate approval needed. Do you want the UAT
   migration to happen as a reviewer-executed manual runbook step
   after the Phase 2 CI is green (recommended), or is there a
   different sequencing you'd prefer?

### 9.4 Timeline (estimate — for planning only, not a commitment)

Contingent on approval:

- Backend routes + handlers + shared helpers: ~2 days
- Zod mapping + response envelope + defensive response validation: ~0.5 day
- Ownership + rate-limit + idempotency plumbing per route: ~1 day
- Audit-append wiring across mutations: ~0.5 day
- Backend contract / ownership / validation / audit tests: ~2 days
- Portal adapters + hooks + adapter tests: ~1.5 days
- Runbook + review artifact: ~0.5 day

Total: ~8 working days for the portal-side + backend-side Phase 2
delivery, contingent on the reviewer's §9.3 answers.
