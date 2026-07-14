# Admissions Copilot — Gate 5 UAT Transition Plan (v0.1)

**Status:** Draft — awaiting reviewer approval before implementation.
**Scope:** Plan the transition from Gate 4's fictional in-memory
portal flow to a controlled **UAT-ready** Admissions Copilot
architecture: authenticated user-owned records, Render PostgreSQL
UAT schema, backend API contracts, auditability, controlled
persistence, and the readiness criteria that must precede any real
applicant trial.
**Non-scope:** Production launch; real applicant trial;
external providers / LLMs; document upload; billing / Stripe;
mobile; Growth Engine; cleanup of the pre-existing production
Admissions data pollution (separate approval required).

Gate 4 shipped a fully deterministic, in-memory portal flow on
`main` at commit `a8e77cc`. Gate 5 replaces the in-memory
`runStore` and synthetic-only fixtures with authenticated,
persisted records **in a UAT database only** — production stays
dark for both feature flags, and no real applicant data is
touched.

This is a **planning gate**. Nothing is implemented until the
reviewer signs off on this plan.

---

## Table of contents

1. [UAT scope](#1-uat-scope)
2. [Data ownership model](#2-data-ownership-model)
3. [Render PostgreSQL environment plan](#3-render-postgresql-environment-plan)
4. [Backend API contract plan](#4-backend-api-contract-plan)
5. [Migration plan](#5-migration-plan)
6. [Persistence plan](#6-persistence-plan)
7. [Validation parity](#7-validation-parity)
8. [Security and privacy](#8-security-and-privacy)
9. [UAT test plan](#9-uat-test-plan)
10. [Feature flag plan](#10-feature-flag-plan)
11. [Real applicant trial readiness criteria](#11-real-applicant-trial-readiness-criteria)
12. [Explicit non-goals](#12-explicit-non-goals)
13. [Deliverable summary + open questions](#13-deliverable-summary--open-questions)

---

## 1. UAT scope

### 1.1 What Gate 5 introduces

- A dedicated **`admissions.*` schema** in the existing Render
  PostgreSQL UAT database, holding the first slice of tables that
  map to Gate 3 contract entities (see §5).
- A **backend surface** — `mcat-study-app-backend` — implementing
  the `/api/admissions/*` endpoints named in Gate 3 §4.2, gated
  by the existing auth stack and by the backend
  `ADMISSIONS_COPILOT_ENABLED` flag.
- A **persistence adapter** in the portal that swaps Gate 4's
  in-memory `runStore` for authenticated backend calls when the
  UAT flag is on; the deterministic engines from Gate 4 stay
  unchanged.
- A **contract parity mirror** — backend imports the same
  `admissions.contract.json` snapshot the portal already carries;
  the freeze test runs in both repos.
- A **UAT feature-flag pair** (frontend + backend) enabled only in
  the UAT environment.

### 1.2 What Gate 5 does NOT introduce

- No production enablement of either flag.
- No real applicant data. All Gate 5 UAT traffic uses synthetic
  applicants under **UAT-only test accounts** created for the
  purpose.
- No external LLM / provider integration.
- No document upload endpoints.
- No billing / Stripe / entitlement grant flow (existing
  entitlement gate is reused; no new grant path).
- No mobile app changes.
- No Growth Engine surface.
- No cleanup of the pre-existing production admissions data
  pollution — that stays scoped to a separate future PR with its
  own approval.

### 1.3 What remains dark in production

- `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED` unset in production
  Vercel env.
- Backend `ADMISSIONS_COPILOT_ENABLED` unset in production Render
  env.
- Production `/admissions` continues to redirect to
  `/admissions/unavailable` because the frontend flag is unset.
- Even if the frontend flag flipped by accident,
  `AdmissionsGate` would still 404 in prod because the backend
  flag is unset — two-layer dark preview stays intact.

### 1.4 What stays synthetic-only until later approval

- **Applicant profiles** — Gate 5 UAT will seed a handful of
  clearly synthetic accounts (labeled `Synthetic Applicant Alpha`,
  `Beta`, `Gamma`, etc.) and reuse the Gate 4 fixture bundle
  shape. No real applicant may sign in against the UAT DB.
- **Evidence bank narratives** — synthetic paraphrases only. No
  imported LORs, transcripts, or personal statements.
- **School list** — the same synthetic
  `Placeholder Medical School` seed. The MSAR (`aamcSchoolId`)
  field remains optional/deferred.
- **Draft generation** — Gate 4's `mission-fit`-only deterministic
  template remains the only path. No LLM.

---

## 2. Data ownership model

### 2.1 Ownership tiers

Gate 5 introduces **user-level ownership** exclusively. Every
`admissions.*` row carries a `user_id` foreign key pointing at
`public.users.id` (the authenticated user in the existing 528 AI
auth system).

There is **no application-level ownership** in Gate 5 — no
service accounts, no shared workspaces, no admin-created records.
Every row is owned by exactly one authenticated user and every
read/write must match that user.

### 2.2 What may reference `public.users.id`

- `admissions.applicant_profiles.user_id` — 1:1 with the user.
- Every other `admissions.*` table that stores user data carries a
  `user_id` column pinned to the same value across a given
  applicant's records. This lets ownership be enforced at the
  API layer with a single equality check.

### 2.3 What must remain inside the `admissions.*` schema

- Every entity from Gate 3 §1 (applicant profile, academic
  metrics, MCAT attempts, PREview, activities, evidence items,
  school list, school research, citations, secondary prompts,
  prompt interpretations, drafts, interview-prep inputs,
  doNotUseTopics, key decisions).
- Any Gate-4-shaped derived data that Gate 5 promotes to
  persistence (see §6.3).
- Any audit-log rows describing admissions actions.

Nothing in `admissions.*` should live under `public.*` — the
schema separation is the primary safety boundary and lets a
future cleanup PR drop the entire schema without affecting
existing 528 AI tables.

### 2.4 Foreign-key discipline

- Every `admissions.*` table with a `user_id` FK uses
  `ON DELETE CASCADE` so a user deletion sweeps their entire
  admissions record.
- Cross-table admissions FKs (e.g. `drafts.prompt_id →
  admissions.secondary_prompts.prompt_id`) use `ON DELETE RESTRICT`
  by default — deletion of a referenced entity requires the API
  to explicitly clean up children first, so we surface accidental
  data loss loudly.
- Every FK is indexed. Every `user_id` is indexed.

---

## 3. Render PostgreSQL environment plan

### 3.1 Requirement — no other database engines

- **UAT database:** the existing dedicated Render PostgreSQL UAT
  instance (already provisioned earlier in the project — see the
  prior confirmation in the project history). Gate 5 migrations
  land in a new `admissions` schema inside this instance.
- **Test database:** the existing dedicated Render PostgreSQL
  **test** instance used by CI (also already provisioned). Gate 5
  CI adds a run-per-PR shape that spins the same migrations up,
  runs API contract tests, and rolls the schema back.
- **CI database:** shared with the test database above (single
  Render test instance, isolated schemas per branch run so
  concurrent PRs do not race). If race isolation proves
  insufficient at any point, the plan calls for a dedicated
  `admissions_ci` instance rather than local containers.
- **Explicit non-options:**
  - No Docker Postgres in CI.
  - No local Postgres in developer machines for CI equivalency.
  - No SQLite fallback (not even for unit tests — validators run
    at the JS layer and don't touch a DB; anything DB-shaped uses
    Render).

### 3.2 Secret handling

- Database URLs and credentials live only in Render's env vars
  and in GitHub Actions **repository secrets**. Never in
  `.env.example`, never in code, never in logs.
- The backend refuses to boot if the URL env var is present but
  unparseable — fail-loud, not fail-silent.
- Error paths that surface DB errors to logs strip the
  connection URL before emitting; a helper
  `redactDbErrorForLog(err)` wraps every catch block that logs a
  DB error.
- Migration scripts never echo the URL. `psql` invocations use
  `PGPASSWORD` env var (or the URL directly) but never print it.
- The Gate 3 `admissions.contract.json` snapshot is the only
  cross-repo shared artifact; it contains no secrets.

### 3.3 Schema isolation

- All Gate 5 tables live under the Postgres `admissions` schema.
- The migration that creates the schema is the first Gate 5
  migration and is idempotent (`CREATE SCHEMA IF NOT EXISTS`).
- The backend connection role is granted `USAGE` on the
  `admissions` schema and `SELECT, INSERT, UPDATE, DELETE` on
  its tables; no `DROP` privileges outside the migration role.

### 3.4 Environment matrix

| Env | Portal flag | Backend flag | DB target |
|---|---|---|---|
| Local dev | dev-mode gate only (Gate 4) — no backend calls | unset | none (fixtures only) |
| CI | test-only | test-only, on for test-runners | Render test DB (isolated per branch run) |
| UAT | `"1"` | `"1"` | Render UAT DB |
| Production | **unset** | **unset** | (Render prod DB — Admissions tables not touched) |

---

## 4. Backend API contract plan

### 4.1 Endpoint list (from Gate 3 §4.2, now scheduled)

Base path: `/api/admissions`.

| Method + Path | Purpose | Auth | Entitlement |
|---|---|---|---|
| `GET /health` | Feature-gate probe (Gate 2) | none | none |
| `GET /me/profile` | Read applicant profile | required | required |
| `POST /me/profile` | Create applicant profile | required | required |
| `PUT /me/profile` | Update applicant profile | required | required |
| `GET /me/metrics` | Read academic metrics | required | required |
| `POST /me/metrics` | Create academic metrics | required | required |
| `PUT /me/metrics` | Update academic metrics | required | required |
| `GET /me/mcat` | List MCAT attempts | required | required |
| `POST /me/mcat` | Add MCAT attempt | required | required |
| `PUT /me/mcat/:id` | Update MCAT attempt | required | required |
| `DELETE /me/mcat/:id` | Remove MCAT attempt | required | required |
| `GET /me/preview` | List PREview scores | required | required |
| `POST /me/preview` | Add PREview score | required | required |
| `GET /me/activities` | List activities | required | required |
| `POST /me/activities` | Add activity | required | required |
| `PUT /me/activities/:id` | Update activity | required | required |
| `DELETE /me/activities/:id` | Remove activity | required | required |
| `GET /me/evidence` | List evidence items | required | required |
| `POST /me/evidence` | Add evidence item | required | required |
| `PUT /me/evidence/:id` | Update evidence item | required | required |
| `DELETE /me/evidence/:id` | Remove evidence item | required | required |
| `GET /me/schools` | List school list | required | required |
| `POST /me/schools` | Add school | required | required |
| `PUT /me/schools/:id` | Update school | required | required |
| `DELETE /me/schools/:id` | Remove school | required | required |
| `GET /me/school-research/:schoolId` | Read school research | required | required |
| `PUT /me/school-research/:schoolId` | Update school research | required | required |
| `GET /me/citations` | List citations | required | required |
| `POST /me/citations` | Add citation | required | required |
| `PUT /me/citations/:id` | Update citation | required | required |
| `DELETE /me/citations/:id` | Remove citation | required | required |
| `GET /me/prompts` | List secondary prompts | required | required |
| `POST /me/prompts` | Add prompt | required | required |
| `PUT /me/prompts/:id` | Update prompt | required | required |
| `DELETE /me/prompts/:id` | Remove prompt | required | required |
| `GET /me/interpretations/:promptId` | Read prompt interpretation | required | required |
| `PUT /me/interpretations/:promptId` | Save prompt interpretation | required | required |
| `GET /me/drafts` | List drafts | required | required |
| `POST /me/drafts` | Create draft (accepts agent output from Gate 4 engines) | required | required |
| `PUT /me/drafts/:id` | Update draft | required | required |
| `POST /me/drafts/:id/transition` | Transition draft status (guarded by Gate 3 rules) | required | required |
| `GET /me/interview-prep/:schoolId` | Read interview-prep inputs | required | required |
| `PUT /me/interview-prep/:schoolId` | Save interview-prep inputs | required | required |
| `GET /me/do-not-use-topics` | List doNotUseTopics | required | required |
| `POST /me/do-not-use-topics` | Add doNotUseTopic | required | required |
| `PUT /me/do-not-use-topics/:id` | Update doNotUseTopic | required | required |
| `DELETE /me/do-not-use-topics/:id` | Remove doNotUseTopic | required | required |
| `GET /me/audit` | Read own audit log | required | required |
| `POST /run/school-fit` | Trigger school-fit run (deterministic; no LLM) | required | required |
| `POST /run/copilot` | Trigger the Gate 4 orchestrator on persisted records | required | required |

### 4.2 Read / write boundaries

- All `/me/*` endpoints are scoped by the authenticated user id.
  The API infers `user_id` from the auth token and **never**
  accepts it from the request body.
- Cross-user reads and writes are rejected with `403` before any
  DB query runs.
- List endpoints (e.g. `GET /me/mcat`) return only the current
  user's rows and are cursor-paginated. No unbounded list
  responses.
- No `GET /admin/*` in Gate 5. Admin access is out of scope.

### 4.3 Auth + entitlement

- **Auth:** existing 528 AI JWT / session middleware. Backend
  refuses `401` if the token is missing or invalid.
- **Entitlement:** middleware checks (a) backend flag
  `ADMISSIONS_COPILOT_ENABLED === "1"` AND (b) the user's
  `subscription_tier ∈ {elite, vip}`. Missing either →
  `403` with `error: "entitlement"`.
- Fail-closed: if the entitlement check throws or the flag is
  unreadable, the middleware returns `403`.

### 4.4 Error shape

Consistent envelope across all endpoints:

```json
{
  "error": "validation|auth|entitlement|not_found|conflict|rate_limited|server_error",
  "violations": [ /* array of { ruleId, target, message, metadata } */ ],
  "requestId": "uuid"
}
```

- `422 Unprocessable Entity` for validation failures with a
  populated `violations[]` mirroring Gate 3's rule registry.
- `401 Unauthorized` for missing/invalid auth (no `violations`).
- `403 Forbidden` for entitlement or ownership failures.
- `404 Not Found` for missing records.
- `409 Conflict` for optimistic-concurrency failures (see §4.5).
- `429 Too Many Requests` for rate-limited callers (list
  endpoints only in Gate 5).
- `5xx` server errors carry only `requestId` — never raw
  exception text.

### 4.5 Idempotency + retry

- Every `POST`/`PUT` endpoint accepts an optional
  `Idempotency-Key` header. If supplied, the server persists the
  first response body keyed by `(user_id, idempotency_key)` for
  24 hours and returns the same body on repeat.
- Optimistic concurrency: mutation endpoints require the caller
  to send `If-Match: <version>` where `<version>` is the
  entity's current `updated_at` epoch (or a hash). Server rejects
  with `409` if the version has moved since the caller last
  read. This is what protects the `drafts.versionNumber`
  progression in Gate 3.
- `DELETE` endpoints are idempotent by construction (delete of a
  missing row returns `204`).

### 4.6 No production enablement

- The backend flag `ADMISSIONS_COPILOT_ENABLED` remains unset in
  the Render production env. Every endpoint respects the
  entitlement middleware; without the flag, all `/api/admissions/*`
  paths (except `GET /health`, which returns 404) return `403`.
- Gate 5's PR ships with a production smoke test that hits
  `GET /api/admissions/health` (still returns 200/404 per Gate 2
  contract), plus a defensive `GET /me/profile` that must return
  `403`. If either misbehaves in prod after merge, the PR fails
  post-merge verification.

---

## 5. Migration plan

### 5.1 Tables needed first (Gate 5 initial slice)

Only the tables required to persist a Gate-4-shaped run. Everything
else is deferred to Gate 6+.

| Order | Table | Gate 3 entity | Notes |
|---|---|---|---|
| 1 | `admissions.applicant_profiles` | §1.1 applicantProfile | 1:1 with `public.users.id`. MVP columns only. Sensitive fields are `NULL`-able and marked `sensitive_deferred = true`. |
| 2 | `admissions.academic_metrics` | §1.2 academicMetrics | 1:1 with applicant. |
| 3 | `admissions.mcat_attempts` | §1.3 MCAT | 1:many with applicant. Enforces the three attempt caps at the DB layer via a trigger AND at the API layer via the Gate 3 rules — both must pass. |
| 4 | `admissions.preview_scores` | §1.4 PREview | 1:many with applicant. |
| 5 | `admissions.activities` | §1.6 activities + §1.5 experienceHours (folded) | AMCAS caps enforced at API layer. |
| 6 | `admissions.evidence_items` | §1.7 evidence bank | Includes `confirmed`, `sensitivity_tags[]`, `activity_links[]`. |
| 7 | `admissions.schools` | §1.8 schoolListEntry | Portal-generated `school_id` UUID. `aamc_school_id` is nullable. |
| 8 | `admissions.school_research` | §1.9 schoolResearch | 1:1 with `schools`. `fit_axes` JSONB. |
| 9 | `admissions.citations` | §1.10 citations | `school_scope_id` FK to `admissions.schools` when set. |
| 10 | `admissions.secondary_prompts` | §1.11 secondaryPrompts | `source_citation_id` FK to `citations`. |
| 11 | `admissions.prompt_interpretations` | §1.12 promptInterpretations | 1:1 with prompt. |
| 12 | `admissions.drafts` | §1.13 drafts | `sentence_index` JSONB. `evidence_citations` + `school_citations` as arrays validated at write time. |
| 13 | `admissions.do_not_use_topics` | §1.15 doNotUseTopics | `match_phrases` TEXT[]. |
| 14 | `admissions.audit_log` | (new — Gate 5) | See §6.4. |

### 5.2 Tables deferred

- `admissions.interview_prep_inputs` (§1.14 — trivially added when
  interview review needs persistence)
- `admissions.key_decision_points` (§1.16)
- `admissions.doNotUseTopics.scopedSchoolIds` join table if we
  need to normalize (not required in Gate 5)

### 5.3 Migration ordering

Migrations run in the order named in §5.1 so FK dependencies
resolve. The first migration:

- `CREATE SCHEMA IF NOT EXISTS admissions;`
- `GRANT USAGE ON SCHEMA admissions TO <backend_role>;`
- Sets up any required extensions (e.g. `pgcrypto` for
  `gen_random_uuid()`) if not already enabled at the DB level.

Every subsequent migration is one file per table (or one file per
tightly coupled pair), named with a monotonically increasing
prefix (`0001_create_admissions_schema.sql`,
`0002_create_applicant_profiles.sql`, …).

### 5.4 Rollback / safety strategy

- Every `up` migration ships with a matching `down` that drops the
  new object(s).
- CI runs the full sequence up, then down, then up again. Any
  failure fails the PR.
- Rollback for a live UAT is scripted in a companion
  `docs/uat-rollback-runbook.md` (to be produced as part of the
  Gate 5 implementation package).
- **No `DROP SCHEMA admissions CASCADE`** ever runs against
  production. The schema is dropped only in the UAT DB, and only
  via explicit runbook execution.
- Data migrations (backfills) are additive-only in Gate 5. No
  destructive `UPDATE`s on existing rows.

### 5.5 Production cleanup — deferred

The pre-existing production `admissions.documents` orphan (see
project history — leftover test-shaped row from an earlier
verification) is **not** touched by Gate 5. Its cleanup is a
separate PR with a separate approval, and is called out in the
runbook so the reviewer can decide independently.

---

## 6. Persistence plan

### 6.1 What replaces `runStore`

- Gate 4's `useAdmissionsRunStore` (Zustand, in-memory) stays as
  the **UI state** store — focused sentence, current phase,
  session-only acknowledgements.
- A new adapter layer,
  `src/features/admissions/persistence/`, wraps the Gate 5 API
  and handles request/response marshaling + optimistic
  concurrency headers + idempotency keys.
- Data that used to be materialized inline from
  `GATE4_FIXTURE_BUNDLE` (applicant profile, evidence items,
  citations, prompts, etc.) is now fetched via the adapter on
  mount and cached in the run store per session.

### 6.2 Session-only vs saved

| Data | Where |
|---|---|
| Focused sentence id | session-only (`runStore`) |
| Warning acknowledgements | session-only (`runStore`) — same discipline as Gate 4 §6.3 |
| Current run phase indicator | session-only |
| Applicant profile | saved (`admissions.applicant_profiles`) |
| Academic metrics, MCAT, PREview | saved |
| Activities, evidence items, citations | saved |
| Schools, school research, prompts, interpretations | saved |
| Drafts (each version) | saved (`admissions.drafts`) |
| doNotUseTopics | saved |
| Audit log | saved (`admissions.audit_log`) |

**Never saved:** raw `runStore` UI state, any user-provided
free-text that would count as PII beyond the fields already
enumerated in Gate 3 §1, ephemeral fetch responses, request-side
headers, JWT contents.

### 6.3 Draft versioning

- Every `PUT /me/drafts/:id` writes a new row to
  `admissions.draft_versions` and updates `admissions.drafts` to
  point at the new version. `versionNumber` is monotonically
  increasing per `(user_id, prompt_id)`.
- Retention: keep every version in UAT (small footprint). A prod
  retention policy is Gate 6+ (once we understand real cardinality).
- The Gate 4 deterministic templates continue to produce the
  initial draft; Gate 5 just persists what the engine returns.

### 6.4 Audit log

Every mutating action inserts one row into
`admissions.audit_log`:

```
audit_id (UUID)
user_id (UUID FK)
action (enum: create / update / delete / transition / run)
entity_kind (enum from Gate 3 entity keys)
entity_id (UUID, nullable for list-level actions)
before_payload (JSONB, redacted per §8.4)
after_payload (JSONB, redacted per §8.4)
occurred_at (TIMESTAMPTZ)
request_id (UUID matching the error-shape requestId)
```

- The audit log is append-only. No `DELETE` privilege on the
  table from the backend role.
- Retention in UAT: unbounded (small volume). Production is
  Gate 6+ concern.
- Redaction (§8.4) strips evidence narratives, draft text, and
  any string field longer than 200 characters before writing to
  `before_payload` / `after_payload` — the log records **what
  changed shape**, not the raw content.

### 6.5 Concurrency

- Every mutating request must supply `If-Match: <version>`.
  Missing → `409` with a message asking the caller to refresh.
- Server generates each version as a monotonically increasing
  integer per row, incremented on every mutation.
- Idempotency keys (§4.5) coexist with `If-Match`: idempotent
  replay of a matched-version write returns the cached response;
  the version does not double-increment.

---

## 7. Validation parity

### 7.1 Source of truth

`src/features/admissions/validation/contract/admissions.contract.json`
in this portal repo remains the frozen source of truth. Its
SHA-256 is pinned in `expectedSnapshotHash.js` and the freeze
test refuses any drift.

### 7.2 Backend mirror strategy

- The backend imports the snapshot at build time (either by
  vendoring the JSON file or by a small preflight step that
  `curl`s a versioned artifact URL — Gate 5 chooses vendoring
  for simplicity).
- Vendored file location:
  `mcat-study-app-backend/domains/admissions/contract/admissions.contract.json`.
- Backend build refuses to run if the vendored file's SHA-256
  does not match its own `expectedSnapshotHash.js` mirror.
- Every backend rule enforcement point (§4.4 error shape)
  emits the `ruleId` from the contract, never a hand-written
  literal — so drift in message copy is impossible.

### 7.3 Freeze / parity tests

- Portal repo:
  `src/features/admissions/validation/__tests__/contractParityFreeze.test.js`
  continues to run. No change in Gate 5.
- Backend repo (new in Gate 5):
  - `admissions/contract.parity.test.js` — every rule in
    `rules.js` matches the snapshot.
  - `admissions/contract.freeze.test.js` — vendored snapshot
    SHA-256 matches the pinned hash.
- Cross-repo CI check: a small GitHub Action in the backend repo
  reads the portal's pinned hash from a version-controlled
  companion file and refuses to merge if the backend's vendored
  file does not match.

### 7.4 Deprecation / migration policy (unchanged)

- Rules never silently removed.
- Severity may only tighten between contract versions
  (informational → warning → blocking).
- Every contract version bump adds a
  `review-log.md` entry in the portal, and a mirror entry in the
  backend's contract-log file.

---

## 8. Security and privacy

### 8.1 No real data until approved

Every UAT-enabled account is created explicitly for UAT by the
reviewer (or an approver they designate). Sign-in flows for the
UAT env are gated by the same env flags as the API (§10). No
real applicant onboarding path exists until Gate 5+ explicitly
opens one.

### 8.2 PII handling

- Encryption at rest: Render PostgreSQL default (managed).
- Encryption in transit: TLS enforced on the DB connection and on
  every API call. Non-HTTPS calls to the backend are refused
  by Render's edge.
- Sensitive-labeled fields from Gate 3 (`legalNameFirst`,
  `contactEmail`, `pronouns`, `citizenshipStatus`, demographics,
  etc.) are stored in the applicable columns but remain
  `NULL`-able in Gate 5. The API refuses to accept a value for a
  sensitive field unless a Gate 6+ approval flag says so
  (fail-closed).
- All string fields cap at their Gate 3 length limits at the DB
  layer (`VARCHAR(N)` where N matches Zod's `.max(N)`).

### 8.3 Document upload — excluded

- No `multipart/form-data` endpoints in Gate 5.
- No file inputs anywhere in the portal.
- No S3 / Render Disks / other blob storage integration.
- Any future document upload path requires a separate approval
  and its own security review; it will not slip into Gate 5
  under any circumstance.

### 8.4 Audit log redaction

The following fields are redacted before writing to
`before_payload` / `after_payload`:

- `evidence_items.narrative` → replaced with
  `{ len: <chars>, sha256: <hash-of-content> }`.
- `drafts.draft_text` → same shape.
- `activities.description`,
  `activities.most_meaningful_essay`,
  `secondary_prompts.prompt_text`,
  `prompt_interpretations.interpretation`,
  `citations.verifier_note` — same shape when > 200 chars.
- Any nullable sensitive Gate 3 field, if it's ever populated:
  redacted to `[REDACTED-sensitive]`.

Audit log records the fact of a change and its shape/hash, not
the content. If forensic recovery is ever needed, the diff
between two draft-version rows is the recovery path — the
audit log is intentionally lossy.

### 8.5 Ownership checks

- Every read/write route resolves `user_id` from the auth token.
- Before executing a DB query, the route asserts the target
  entity's `user_id` matches the auth's `user_id`. Failure →
  `403`.
- For list endpoints, the `WHERE user_id = $auth_uid` predicate
  is added by a shared query builder that cannot be bypassed
  from route code.
- No SQL string interpolation of `user_id`; parameterized only.

### 8.6 No enumeration

- All IDs in the admissions schema are UUIDs (already Gate 3
  discipline). No incrementing numeric IDs.
- List endpoints require a cursor for pagination; the cursor is
  opaque and rejects tampered values with `400`.
- Rate limiting is enabled on list endpoints (default: 60
  requests / minute / user) — anti-enumeration + anti-brute.

---

## 9. UAT test plan

### 9.1 Render-backed CI tests

- Each PR spawns a fresh **branch schema** inside the shared
  Render test DB. Prefix `pr_<n>` on schema name.
- Migrations run up; API contract tests run; migrations run
  down; schema is dropped. If any step fails, PR fails.
- No local Postgres, no Docker Postgres, no SQLite fallback.

### 9.2 API contract tests

- One test file per endpoint from §4.1 covering:
  - `401` without auth
  - `403` when entitlement missing
  - `403` when acting on another user's record (ownership check)
  - `422` on Gate 3 rule violation (every blocking rule for the
    entity)
  - `200` / `201` on happy path
  - `409` on `If-Match` mismatch
  - `204` on `DELETE`
  - `429` on rate-limit exceeded (list endpoints only)

### 9.3 Portal integration tests

- Portal E2E suite continues to run under jsdom + fetch guard for
  unit tests.
- A new tier of tests targets the UAT deploy directly (Playwright
  or similar):
  - Sign in with a synthetic UAT account
  - Complete a mission-fit run against the persisted fixtures
  - Verify the draft renders + integrity panel shows expected
    warnings (or none for the happy fixture)
- These integration tests **never** run in production.

### 9.4 No external provider tests

- The existing vitest fetch guard remains active.
- Backend has an analogous guard: any `axios` / `fetch` call
  emitted by a backend module during test runs throws unless
  the URL is on an allowlist (Render DB, GitHub, own health).

### 9.5 No private data fixtures

- The Gate 4 fixture discipline
  (`fixturesDiscipline.test.js`, `flow.namesAreSynthetic.test.js`)
  continues to run.
- Backend adds its own fixture-discipline test scanning
  `mcat-study-app-backend/domains/admissions/fixtures/**` for the
  same `SYNTHETIC_FIXTURE=true` marker and the same 26-name
  denylist.

### 9.6 Migration tests

- Up test — each migration applies cleanly against a clean schema.
- Down test — the paired down migration reverses the up cleanly.
- Idempotency test — running the same migration twice is safe
  (up should either be a no-op or fail loudly with a stable
  error).
- Data-loss test — after up + insert + down, the row count in
  every remaining table is unchanged (no accidental cascade).

### 9.7 Auth / entitlement tests

- Token missing → `401`.
- Token present but user has no `admissions_copilot` entitlement
  → `403`.
- User has entitlement but backend flag is unset → `403`.
- Both flag and entitlement present → happy path proceeds.
- Ownership: user A cannot read user B's records → `403` on
  every route.

---

## 10. Feature flag plan

### 10.1 Frontend flag

- `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED` — same variable, same
  discipline as Gate 2 / 3 / 4.
- **Production:** unset.
- **UAT:** `"1"` in the UAT Vercel env.
- **CI:** `"1"` only for the test suite; never baked into a
  production build.

### 10.2 Backend flag

- `ADMISSIONS_COPILOT_ENABLED` — same variable, same discipline
  as Gate 2 §4.
- **Production:** unset. Every `/api/admissions/*` route returns
  `403` (except `GET /health` which returns `404` to match Gate 2's
  contract).
- **UAT:** `"1"` in the UAT Render env.
- **CI:** `"1"` only inside the test runner's env.

### 10.3 UAT-only enablement

- Enabling either flag in production requires a Gate 6+ approval
  with its own PR and its own reviewer sign-off.
- The Gate 5 PR does **not** contain any change to Vercel or
  Render prod env config. Every env change lives in
  `docs/uat-deploy-runbook.md` (to be produced with the
  implementation package) and requires manual runbook execution
  in the UAT environments only.

### 10.4 Fail-closed behavior

- Missing / unparseable flag value → treat as unset.
- Any exception in the flag check → treat as unset.
- Race between deployment and flag flip → the older code sees
  the flag as unset and blocks; no half-enabled state.

---

## 11. Real applicant trial readiness criteria

Nothing in Gate 5 unlocks a real applicant trial. Before any
real trial may run:

### 11.1 Required conditions

- **Independent security review** of the Gate 5 backend code
  (both API + DB migrations).
- **Reviewer sign-off** on this project (the human reviewer
  driving the gate chain).
- **Legal / compliance sign-off** if applicable (educational data
  handling, jurisdictional PII rules).
- **Load / soak test** against UAT — 10x expected concurrent
  users for 30 minutes with no error-rate increase.
- **Rollback drill** — the reviewer executes the UAT rollback
  runbook end-to-end at least once and verifies the schema
  drops cleanly.
- **Audit log verification** — sample 100 audit rows from UAT,
  confirm they redact narratives per §8.4.

### 11.2 Data entry path (once approved)

- **Authenticated portal only.** No CSV import, no admin console,
  no direct DB seed.
- Every real applicant creates their own records through the
  same `/api/admissions/*` endpoints that Gate 5 ships.
- No document upload path is opened (that's a separately approved
  Gate 6+ concern).
- The first trial uses a limited cohort (e.g. ≤ 5 users) with
  explicit consent recorded outside the app.

### 11.3 Delete / export / reconcile

- **Delete:** `DELETE /me` (all admissions data for the user) as
  a Gate 6+ addition. In Gate 5, deletion is manual per record;
  a user-facing "delete all" is deferred.
- **Export:** `GET /me/export` returns a JSON dump of the user's
  admissions rows (Gate 6+; not shipped in Gate 5).
- **Reconcile:** Gate 6+ audit-log tooling for reconstructing a
  user's history and correcting entry errors.

Gate 5 explicitly does **not** enable the trial. The plan simply
names what must be true first.

---

## 12. Explicit non-goals

Gate 5 does NOT:

- Launch to production. Both feature flags stay unset in prod.
- Enable a real applicant trial. See §11.
- Integrate any external LLM, scoring API, or parser-as-a-service.
- Add document upload of any kind.
- Touch billing / Stripe / entitlement grant. Existing
  entitlement gate is reused; no new grant path.
- Add mobile-app changes.
- Add Growth Engine work.
- Clean up the pre-existing production `admissions.documents`
  test-shaped row. That remains a separately approved future PR.
- Add a `/admin` surface.
- Store `demographics`, `disadvantaged narrative`, or
  `institutional-action narrative` beyond making the DB columns
  nullable-and-refused-at-API. Their write path is Gate 6+.

---

## 13. Deliverable summary + open questions

### 13.1 What Gate 5 implementation will produce (on approval)

**Backend repo (`mcat-study-app-backend`)** — the majority of the
diff will land here:

- `domains/admissions/lib/validators.js` — Zod schemas + rule
  runners mirroring Gate 3.
- `domains/admissions/lib/rules.js` — imports the vendored
  contract JSON; parity-tested.
- `domains/admissions/routes/*.js` — one file per endpoint group
  (profile, metrics, mcat, activities, evidence, schools,
  drafts, etc.).
- `domains/admissions/middleware/auth.js`,
  `middleware/entitlement.js`, `middleware/ownership.js`.
- `domains/admissions/migrations/*.sql` — the ordered slice from
  §5.1.
- `domains/admissions/contract/admissions.contract.json` —
  vendored from the portal.
- `domains/admissions/contract/expectedSnapshotHash.js` — mirror
  freeze.
- `domains/admissions/audit/redact.js` — §8.4 rules.
- `domains/admissions/__tests__/**` — the suite from §9.
- `docs/uat-deploy-runbook.md` and `docs/uat-rollback-runbook.md`.

**Portal repo (this repo)** — a small persistence adapter and
gated fetch calls:

- `src/features/admissions/persistence/apiClient.js` — fetch
  wrapper honoring `Idempotency-Key` + `If-Match` + the runGuard.
- `src/features/admissions/persistence/adapters/*.js` — one per
  entity kind.
- Gate 4 `runStore` reused; new selectors for adapter-loaded
  state.
- Existing `admissions.contract.json` unchanged; SHA-256
  unchanged; the parity/freeze test continues to pass.
- No new App Router route.

### 13.2 What Gate 5 implementation will NOT ship

- Real applicant data
- Production enablement of either flag
- External providers / LLM
- Document upload
- Billing / Stripe / entitlement grant
- Mobile / Growth Engine
- Cleanup of pre-existing prod admissions pollution

### 13.3 Open questions for the reviewer

Please confirm or redirect before Gate 5 implementation begins:

1. **Endpoint list (§4.1).** The 40-endpoint list is comprehensive
   for the Gate 3 entity set. Should we narrow it to a smaller
   MVP for Gate 5 (e.g. profile / metrics / mcat / evidence /
   drafts only) and defer the rest to Gate 6? Recommendation:
   ship the full list because the Gate 4 flow already exercises
   most of them and stubbing the rest creates drift risk.
2. **Vendoring vs generating the contract JSON (§7.2).** Gate 5
   vendors the JSON file into the backend repo. An alternative
   is to publish it as a versioned artifact (e.g. a GitHub
   Release asset) that both repos pull. Recommendation: vendor;
   simpler for Gate 5. Confirm.
3. **Draft version retention (§6.3).** Unbounded in UAT. Is that
   acceptable, or would the reviewer prefer a bounded window
   (e.g. last 50 versions per prompt)?
4. **Audit log retention (§6.4).** Unbounded in UAT. Same
   question: bound it?
5. **Rate limits (§8.6).** Default 60 requests / minute / user on
   list endpoints. Adjust up or down?
6. **Real-trial data-entry path (§11.2).** Portal only, no CSV /
   upload. Confirm this stays the boundary for Gate 6+.
7. **Delete / export endpoints (§11.3).** Deferred to Gate 6+.
   Confirm the reviewer is aware they're not in Gate 5.
8. **Backend audit log privileges.** The backend role in Render
   is granted append-only on `admissions.audit_log`. Is there a
   separate role (e.g. an ops role) that should have read
   access, or does the reviewer read via a runbook-scripted
   ad-hoc connection?

### 13.4 Timeline (estimate — for planning only)

Contingent on approval:

- Backend scaffolding + migrations + contract mirror: ~2 days
- Endpoint implementation (40 endpoints, mostly boilerplate over
  Zod-shaped inserts / updates): ~3 days
- API contract tests + auth/entitlement / ownership tests: ~2 days
- Portal persistence adapter + tests: ~1 day
- Runbooks + reviewer walkthrough: ~0.5 day

Total: ~8.5 working days for the portal-side + backend-side
Gate 5 delivery, contingent on the reviewer's open-question
answers.
