# Admissions Copilot — Gate 5 UAT Transition Plan (v0.3)

**Status:** v0.3 — reviewer-corrected pre-implementation draft.
The v0.2 changelog block below remains as the authoritative record
of what changed since v0.1; v0.3 corrections are called out
immediately after it in the "v0.3 changelog" section.
**Scope:** Plan the transition from Gate 4's fictional in-memory
portal flow to a controlled **UAT-ready** Admissions Copilot
architecture: authenticated user-owned records, a Render
PostgreSQL UAT schema (to be confirmed/provisioned — see §3), a
narrowed backend API surface, auditability, controlled
persistence, and the readiness criteria that must precede any real
applicant trial.
**Non-scope:** Production launch; real applicant trial;
external providers / LLMs; document upload; billing / Stripe;
mobile; Growth Engine; cleanup of the pre-existing production
`admissions.documents` test-shaped row (separate approval required
— see §5.5 for the correct description).

Gate 4 shipped a fully deterministic, in-memory portal flow on
`main` at commit `a8e77cc`. Gate 5 replaces the in-memory
`runStore` and synthetic-only fixtures with authenticated,
persisted records **in a UAT database only** — production stays
dark for both feature flags, and no real applicant data is
touched.

This is a **planning gate**. Nothing is implemented until the
reviewer signs off on this plan.

## v0.3 changelog vs v0.2

Narrow cleanup pass per reviewer's Gate 5 v0.3 correction request.
No new content; four internal contradictions removed:

1. **§9.1 CI schema isolation now matches §3.3 exactly.**
   v0.2 §9.1 still said "each PR spawns a fresh branch schema
   inside the shared Render test DB. Prefix `pr_<n>`." That text
   is removed. §9.1 now describes the same six-step run
   (concurrency group → drop/create `admissions` schema →
   migrate up → tests → migrate down → release). **No `pr_<n>`
   schemas anywhere in the plan.**
2. **Backend flag-off wording is uniformly "router unmounted".**
   Fixed in two places that still implied `403`:
   - §10.2 previously said "every `/api/admissions/*` route
     returns `403` (except `GET /health` which returns `404`)."
     Now says the router is not mounted at boot; requests hit
     the Express global 404 handler with no route-specific
     body. `403` is only meaningful inside mounted UAT/test
     routes.
   - §9.7 previously listed "user has entitlement but backend
     flag is unset → `403`" as an auth-test case. That case is
     removed; the "flag off" behavior is verified by a new
     §9.7a router-mount test that asserts no `/api/admissions/*`
     route is registered at boot and that requests hit the
     global 404 with no route-specific body.
3. **DELETE remnants removed from Gate 5.**
   - §4.5 previously said "`DELETE` endpoints are idempotent by
     construction (delete of a missing row returns `204`)." Now
     says Gate 5 ships **no** `DELETE` route; the idempotent-delete
     property is documented as Gate 6+ behavior for when those
     endpoints ship.
   - §9.2 previously listed "`204` on `DELETE`" as a contract
     test. That line is removed. §9.2 explicitly says no
     `DELETE` / `204` contract tests in Gate 5.
4. **§13.4 timeline updated to the narrowed MVP endpoint count.**
   v0.2 §13.4 still said "Endpoint implementation (40 endpoints…)".
   Corrected to **37 endpoints** (matching §4.1.1) with no
   `DELETE` routes, no transition, no interview-prep, no broad
   school-research / citation CRUD, no export/reconcile. Total
   estimate revised from ~8.5 to ~7.5 working days.

All v0.2 corrections carry forward unchanged (see v0.2 changelog
below).

## v0.2 changelog vs v0.1

Applied per reviewer's Gate 5 v0.2 correction pass:

1. **Endpoint scope narrowed.** The 40+-endpoint list in v0.1 §4.1
   is replaced with the approved Gate 5 MVP surface: `GET /health`,
   profile, academic metrics, MCAT / PREview, activities /
   experience hours, evidence, schools, prompts, prompt
   interpretation, drafts + draft versions, doNotUseTopics,
   deterministic `POST /run/copilot`, audit append.
   Interview-prep persistence, broad school-research CRUD, broad
   citation CRUD, delete-all / export / reconcile, admin/reviewer
   surfaces, document upload, and external providers are all
   deferred to Gate 6+.
2. **UAT DB assumption corrected.** v0.1 said the UAT Render
   PostgreSQL DB was "already provisioned." That is not true.
   Only a dedicated Render **test** DB exists today. §3.1 now
   says a UAT Render PostgreSQL DB **must be confirmed /
   provisioned** before implementation begins, with the DB
   identifier named at that time.
3. **Backend flag-off behavior aligned with existing gate.**
   When `ADMISSIONS_COPILOT_ENABLED` is unset, the entire
   `/api/admissions/*` router is **unmounted** — routes do not
   exist in the running process. Requests hit the Express
   404 handler. `403` is used only inside mounted UAT/test
   contexts for auth or entitlement failures. The prior
   "production returns 403 on /me/profile" wording is removed.
4. **CI schema isolation resolved.** v0.1 implied both a
   `CREATE SCHEMA admissions` seed migration AND branch-scoped
   `pr_<n>` schemas. Choosing: **dedicated Render test DB, reset
   per CI run, using the `admissions` schema.** Branch-scoped
   ad-hoc schemas are dropped from the plan.
5. **`admissions.draft_versions` added to migrations.** Per
   reviewer direction, versioning ships in Gate 5 with a
   dedicated table. See §5.1.
6. **UAT draft-version retention bounded.** Latest 50 versions
   per `(user_id, prompt_id)` in UAT. See §6.3.
7. **MCAT attempt caps stay at Gate 3 / API layer.** DB triggers
   for the 3/4/7 attempt-window checks are removed from the
   plan. Database constraints in Gate 5 are structural only
   (NOT NULL, FK, UNIQUE, CHECK on simple ranges).
8. **GitHub removed from backend test network allowlist.**
   Since Gate 5 vendors the contract JSON, backend tests do
   not need GitHub network access. Only same-host Render DB
   and same-service loopback URLs are permitted for tests.
9. **Production cleanup wording corrected.** The pre-existing
   production row is a **test-shaped `admissions.documents` row
   linked to a legitimate `user_id`, with local-stub storage,
   pending verification, and no real bytes** — not an orphan.
   Cleanup remains deferred and separately approved (§5.5).
10. **§13.3 open questions resolved.** All eight prior open
    questions are marked resolved per reviewer v0.2. §13.3 now
    holds a decisions table instead of a questions list.

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

- **UAT database — MUST BE CONFIRMED OR PROVISIONED BEFORE
  IMPLEMENTATION.** v0.1 incorrectly assumed a dedicated Render
  PostgreSQL UAT instance already existed. Only the Render
  **test** DB was provisioned in the prior confirmation. Before
  any Gate 5 migration file is written, the reviewer must:
  - point Gate 5 at an existing Render PostgreSQL UAT DB by
    name (e.g. `528ai-uat`), **or**
  - approve provisioning a dedicated one and confirm its
    identifier.
  Gate 5 implementation halts at the migration-writing step
  until this is resolved.
- **Test database:** the existing dedicated Render PostgreSQL
  **test** instance used by CI. Gate 5 CI does **not** create
  branch-scoped `pr_<n>` schemas. Instead it resets the shared
  `admissions` schema on the same DB at the start of each CI
  run and rolls it back at the end. See §3.3 for the isolation
  plan.
- **CI database:** same as test above. Single Render test
  instance, one `admissions` schema per run, serialized across
  runs at the CI level so concurrent PRs do not race the reset.
  A CI concurrency group (`admissions-schema`) restricts the
  Render test DB to one active run at a time.
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

### 3.3 Schema isolation — single choice (v0.2)

- All Gate 5 tables live under the Postgres `admissions` schema.
- The first Gate 5 migration is idempotent
  (`CREATE SCHEMA IF NOT EXISTS admissions`).
- **CI isolation model:** dedicated Render test DB, reset per run.
  Every CI run:
  1. Acquires the `admissions-schema` GitHub Actions concurrency
     group (only one Gate-5 CI run active at a time).
  2. `DROP SCHEMA admissions CASCADE; CREATE SCHEMA admissions;`
     against the Render test DB.
  3. Runs the ordered migrations up.
  4. Runs the contract / integration tests.
  5. Runs the migrations down as a rollback smoke test.
  6. Releases the concurrency group.
  Branch-scoped `pr_<n>` schemas are **not** used. Every test
  operates against the same `admissions` schema; the isolation
  guarantee comes from the concurrency group, not from schema
  naming.
- The backend connection role is granted `USAGE` on the
  `admissions` schema and `SELECT, INSERT, UPDATE, DELETE` on
  its tables; no `DROP` privileges outside the migration role.
- The migration role has `CREATE, DROP` on the `admissions`
  schema only — never on `public` or any other schema.

### 3.4 Environment matrix

| Env | Portal flag | Backend flag | DB target |
|---|---|---|---|
| Local dev | dev-mode gate only (Gate 4) — no backend calls | unset | none (fixtures only) |
| CI | test-only | test-only, on for test-runners | Render test DB (serialized per CI run via `admissions-schema` concurrency group) |
| UAT | `"1"` | `"1"` | Render UAT DB |
| Production | **unset** | **unset** | (Render prod DB — Admissions tables not touched) |

---

## 4. Backend API contract plan

### 4.1 Endpoint list — Gate 5 MVP (v0.2)

Base path: `/api/admissions`. Narrowed per reviewer v0.2 to
the surface the Gate 4 fictional flow actually touches, plus the
`POST /run/copilot` runner and append-only audit. Anything not on
this table is **deferred** to Gate 6+ and lists in §4.1.2.

#### 4.1.1 Gate 5 MVP endpoints

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
| `GET /me/preview` | List PREview scores | required | required |
| `POST /me/preview` | Add PREview score | required | required |
| `GET /me/activities` | List activities + folded experience hours | required | required |
| `POST /me/activities` | Add activity | required | required |
| `PUT /me/activities/:id` | Update activity | required | required |
| `GET /me/evidence` | List evidence items | required | required |
| `POST /me/evidence` | Add evidence item | required | required |
| `PUT /me/evidence/:id` | Update evidence item | required | required |
| `GET /me/schools` | List school list | required | required |
| `POST /me/schools` | Add school | required | required |
| `PUT /me/schools/:id` | Update school | required | required |
| `GET /me/prompts` | List secondary prompts | required | required |
| `POST /me/prompts` | Add prompt | required | required |
| `PUT /me/prompts/:id` | Update prompt | required | required |
| `GET /me/interpretations/:promptId` | Read prompt interpretation | required | required |
| `PUT /me/interpretations/:promptId` | Save prompt interpretation | required | required |
| `GET /me/drafts` | List drafts (headers only) | required | required |
| `GET /me/drafts/:id` | Read a draft (current version) | required | required |
| `POST /me/drafts` | Create draft (accepts agent output from Gate 4 engines) | required | required |
| `PUT /me/drafts/:id` | Update draft → writes new draft_versions row | required | required |
| `GET /me/drafts/:id/versions` | List draft versions for a draft (paginated) | required | required |
| `GET /me/drafts/:id/versions/:versionNumber` | Read a specific historical version | required | required |
| `GET /me/do-not-use-topics` | List doNotUseTopics | required | required |
| `POST /me/do-not-use-topics` | Add doNotUseTopic | required | required |
| `PUT /me/do-not-use-topics/:id` | Update doNotUseTopic | required | required |
| `POST /run/copilot` | Deterministic Gate 4 orchestrator on persisted records | required | required |
| `POST /me/audit` | Append-only audit event (server-side helper — see §6.4) | required | required |

Total: **37 endpoints**, of which only ~29 are user-facing HTTP
surface (the audit-append is invoked from the backend itself in
most flows).

#### 4.1.2 Deferred to Gate 6+

- **Delete endpoints on user records** — `DELETE /me/mcat/:id`,
  `DELETE /me/activities/:id`, `DELETE /me/evidence/:id`,
  `DELETE /me/schools/:id`, `DELETE /me/prompts/:id`,
  `DELETE /me/do-not-use-topics/:id`. Deletion in Gate 5 is
  runbook-scripted only. `DELETE /me` (delete-all) is
  explicitly Gate 6+ per reviewer v0.2 decision.
- `POST /me/drafts/:id/transition` — status transition to
  `applicant-approved`. Deferred until real-trial readiness
  criteria are met (§11).
- **Interview-prep persistence** —
  `GET/PUT /me/interview-prep/:schoolId` deferred. Interview
  panel remains render-only from the deterministic runner.
- **Broad school-research CRUD** — `GET/PUT /me/school-research/:schoolId`
  deferred. The runner reads school research from the schools
  record inline; a dedicated CRUD surface waits for Gate 6+.
- **Broad citation CRUD** — `GET/POST/PUT/DELETE /me/citations`
  deferred. Citations in Gate 5 are seeded via the school write
  path only.
- `GET /me/audit` (self-serve audit read), `GET /me/export`,
  and any reconcile endpoint — deferred to Gate 6+.
- `POST /run/school-fit` — the school-fit engine ships as part
  of the copilot run; no standalone endpoint.
- **Admin / reviewer surfaces** — no `/admin/*` in Gate 5.
- **Document upload** — no `multipart/form-data` anywhere.
- **External providers** — no LLM / scoring API / parser
  integration.

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

### 4.3 Auth + entitlement (mounted routes only)

The check ordering below applies **only when the
`/api/admissions` router has been mounted** — i.e. inside UAT or
tests where `ADMISSIONS_COPILOT_ENABLED === "1"`. In production
the router is not mounted at all; see §4.6.

- **Auth:** existing 528 AI JWT / session middleware. Missing or
  invalid token → `401` with `error: "auth"`.
- **Entitlement:** middleware checks that the user's
  `subscription_tier ∈ {elite, vip}`. Missing → `403` with
  `error: "entitlement"`.
- **Ownership:** every read/write reads `user_id` from the auth
  token, never from the request body. Cross-user access → `403`
  with `error: "entitlement"`.
- Fail-closed: any exception in the entitlement or ownership
  check surfaces as `403`, not `500`.

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
- **`DELETE` endpoints are not part of Gate 5.** Per §4.1.2, all
  per-record delete endpoints and `DELETE /me` are deferred to
  Gate 6+; deletion in Gate 5 is runbook-scripted only. When
  those endpoints ship in a later gate, they will be idempotent
  by construction (delete of a missing row returns `204`). Gate
  5's PR ships **no** HTTP `DELETE` route under
  `/api/admissions/*`.

### 4.6 No production enablement — routes stay UNMOUNTED

- **`ADMISSIONS_COPILOT_ENABLED` unset ⇒ the entire
  `/api/admissions` router is unmounted.** The Express app never
  registers those routes at boot; requests to any
  `/api/admissions/*` path hit the app's global 404 handler.
  The router is not "mounted and returning 403" — it does not
  exist in the running process. This matches Gate 2's existing
  behavior for the health probe.
- The single exception is `GET /api/admissions/health`. That
  endpoint is a **feature-gate probe** — it returns `404` when
  the flag is unset (equivalent to "router not mounted") and
  `200` when the flag is set. Its behavior is unchanged from
  Gate 2 §4.
- **`403` is only returned inside mounted routes** — i.e. when
  the flag is `"1"` AND the request reached auth/entitlement/
  ownership middleware AND one of those checks failed.
- Post-merge production smoke test verifies:
  - `GET /api/admissions/health` returns `404` (router
    unmounted, per Gate 2).
  - No other `/api/admissions/*` path is reachable — a
    representative call (e.g. `GET /api/admissions/me/profile`)
    returns the app's global 404 with no route-specific body.
  If either misbehaves in prod after merge, the PR fails
  post-merge verification and a rollback runbook is executed.

---

## 5. Migration plan

### 5.1 Tables needed first (Gate 5 initial slice, v0.2)

Only the tables required to persist a Gate-4-shaped run.
`admissions.draft_versions` is included per reviewer v0.2.
Everything else is deferred (see §5.2).

**Structural constraints only.** Per reviewer v0.2, DB triggers
that duplicate Gate 3 rule enforcement (notably the MCAT
3/4/7 attempt-window checks) are **not** included in Gate 5.
DB constraints stay structural: `NOT NULL`, `UNIQUE`, FKs, and
simple `CHECK` on primitive ranges (e.g. `score BETWEEN 118 AND 132`).
Business-rule enforcement (attempt-year windows, AMCAS caps,
sensitivity gates) lives at the API layer, driven by Gate 3's
frozen rule registry.

| Order | Table | Gate 3 entity | Notes |
|---|---|---|---|
| 1 | `admissions.applicant_profiles` | §1.1 applicantProfile | 1:1 with `public.users.id`. MVP columns only. Sensitive fields are `NULL`-able and refused at the API until Gate 6+. |
| 2 | `admissions.academic_metrics` | §1.2 academicMetrics | 1:1 with applicant. `CHECK (cumulative_gpa BETWEEN 0.0 AND 4.0)`. |
| 3 | `admissions.mcat_attempts` | §1.3 MCAT | 1:many with applicant. Structural CHECKs only (section score range, sum-mismatch is API-side). Attempt-window caps (3/year, 4/two-year, 7/lifetime) enforced by API validators; **no DB triggers**. |
| 4 | `admissions.preview_scores` | §1.4 PREview | 1:many with applicant. `CHECK (score BETWEEN 1 AND 9)`. |
| 5 | `admissions.activities` | §1.6 activities + §1.5 experienceHours (folded) | AMCAS caps + most-meaningful count enforced at the API. `hours_by_year` as JSONB. |
| 6 | `admissions.evidence_items` | §1.7 evidence bank | `confirmed BOOLEAN`, `sensitivity_tags TEXT[]`, `activity_links UUID[]`. |
| 7 | `admissions.schools` | §1.8 schoolListEntry | Portal-generated `school_id` UUID. `aamc_school_id` is nullable. `location` JSONB. |
| 8 | `admissions.school_research` | §1.9 schoolResearch | 1:1 with `schools`. `fit_axes` JSONB. `key_programs TEXT[]`. Broad CRUD deferred (§4.1.2); Gate 5 writes it as a nested object on the schools write path. |
| 9 | `admissions.citations` | §1.10 citations | `school_scope_id` FK to `admissions.schools` when set. Broad CRUD deferred (§4.1.2); Gate 5 writes citations via the schools path only. |
| 10 | `admissions.secondary_prompts` | §1.11 secondaryPrompts | `source_citation_id` FK to `citations`. |
| 11 | `admissions.prompt_interpretations` | §1.12 promptInterpretations | 1:1 with prompt. |
| 12 | `admissions.drafts` | §1.13 drafts | `sentence_index` JSONB. `evidence_citations` + `school_citations` as `UUID[]`. `current_version_number INTEGER` pointing at the latest row in `draft_versions`. |
| 13 | `admissions.draft_versions` | §1.13 drafts, versioned | 1:many under `drafts`. One row per `PUT /me/drafts/:id`. `(draft_id, version_number)` UNIQUE. Retention capped in UAT — see §6.3. |
| 14 | `admissions.do_not_use_topics` | §1.15 doNotUseTopics | `match_phrases` TEXT[]. |
| 15 | `admissions.audit_log` | (new — Gate 5) | Append-only. See §6.4. |

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

### 5.5 Production cleanup — deferred (correct description, v0.2)

The pre-existing production row is a **test-shaped
`admissions.documents` row linked to a legitimate `user_id`,
with local-stub storage, pending verification, and no real
bytes**. It is not an orphan — it is a legitimately-owned row
whose payload is a stub from an earlier verification pass.

Its cleanup is **deferred** and remains a separate PR with a
separate reviewer approval. Gate 5:

- Does not read, edit, or delete the row.
- Does not touch the `admissions.documents` table at all (that
  table pre-dates the Gate 5 schema and its cleanup path is a
  reviewer-owned runbook, not part of any Gate 5 migration).
- Documents the row's current state in the runbook so the
  reviewer can decide the cleanup approach independently.

Nothing in Gate 5 migrations references `admissions.documents`
or its user's records.

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

### 6.3 Draft versioning — bounded retention (v0.2)

- Every `PUT /me/drafts/:id` writes a new row to
  `admissions.draft_versions` and updates `admissions.drafts`
  to point at the new `current_version_number`. `version_number`
  is monotonically increasing per `(user_id, prompt_id)` — a
  `UNIQUE(user_id, prompt_id, version_number)` constraint on
  `draft_versions` prevents gaps or collisions.
- **UAT retention: latest 50 versions per `(user_id, prompt_id)`.**
  Per reviewer v0.2. When the 51st version is written, the
  oldest version for that `(user_id, prompt_id)` is deleted in
  the same transaction. This is implemented as a small helper
  `pruneDraftVersions(userId, promptId)` invoked from the
  draft-write path — not a DB trigger (see §5.1 discipline).
- The Gate 4 deterministic templates continue to produce the
  initial draft; Gate 5 just persists what the engine returns.
- Production retention policy is deferred to Gate 6+ (once real
  cardinality is understood). The bound stays at 50 in UAT.

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

- The audit log is append-only. The backend role has `INSERT`
  only — no `SELECT`, no `UPDATE`, no `DELETE`. Reviewer read
  access is via a separate ops runbook using a distinct
  read-only role (see §13.3 row 8).
- **Retention in UAT: append-only, unbounded, for now.** Per
  reviewer v0.2 decision, a retention policy MUST be defined
  and approved before any real applicant trial (§11.1).
  Production retention is out of scope until then.
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
- **Rate limits (v0.2):**
  - **Reads / lists** — 60 requests / minute / user.
  - **Mutations** — 20 requests / minute / user per entity kind
    (POST/PUT), with per-endpoint tightening allowed. Draft
    writes (POST/PUT `/me/drafts/*`) are tightened further to
    10 req/min/user to prevent version-storm.
  - Rate limits are enforced by an in-memory sliding window in
    Gate 5. A Redis-backed limiter is Gate 6+.

---

## 9. UAT test plan

### 9.1 Render-backed CI tests

Matches §3.3 exactly — one canonical schema, one dedicated Render
test DB, serialized runs:

- The Render test DB has a single `admissions` schema. There are
  **no `pr_<n>` branch schemas** — the isolation guarantee comes
  from the GitHub Actions concurrency group, not from schema
  naming.
- Every CI run:
  1. Acquires the `admissions-schema` concurrency group.
  2. `DROP SCHEMA admissions CASCADE; CREATE SCHEMA admissions;`
     against the test DB.
  3. Runs the ordered migrations up.
  4. Runs the contract / integration tests.
  5. Runs the migrations down as a rollback smoke test.
  6. Releases the concurrency group.
- No local Postgres, no Docker Postgres, no SQLite fallback.

### 9.2 API contract tests

- One test file per endpoint from **§4.1.1** (the narrowed Gate
  5 MVP surface) covering:
  - `401` without auth
  - `403` when entitlement missing
  - `403` when acting on another user's record (ownership check)
  - `422` on Gate 3 rule violation (every blocking rule for the
    entity)
  - `200` / `201` on happy path
  - `409` on `If-Match` mismatch (mutations only)
  - `429` on rate-limit exceeded (list endpoints for the
    read-list ceiling; mutation endpoints for the mutation
    ceiling)
- **No `DELETE` / `204` contract tests in Gate 5.** No `DELETE`
  route ships in Gate 5 (§4.1.2, §4.5). Any test asserting
  successful delete behavior is a Gate 6+ concern.

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

### 9.4 No external provider tests (v0.2 allowlist)

- The existing vitest fetch guard remains active in the portal.
- Backend has an analogous guard: any `axios` / `fetch` call
  emitted by a backend module during test runs throws unless
  the URL matches the **v0.2 allowlist**:
  - Same-host Render DB URL from `DATABASE_URL` (the DB driver's
    own network path — checked by hostname, not string prefix).
  - Loopback / same-service health probe (`http://localhost:<port>/api/admissions/health`).
- **GitHub is not on the allowlist.** Gate 5 vendors the
  contract JSON directly into the backend repo (§7.2), so tests
  do not need GitHub network access. If a future change adds
  a code path that reaches GitHub at test time, the fetch
  guard will fail the test loudly and a reviewer decision is
  required to widen the allowlist.
- Any provider host (Anthropic, OpenAI, embedding APIs, etc.)
  is refused by construction: the allowlist is a positive list,
  not a denylist.

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

Tests below run against a **mounted** `/api/admissions/*` router
— i.e. `ADMISSIONS_COPILOT_ENABLED === "1"` (test env). When the
flag is unset, the router is not mounted and there are no routes
to test at all — the "flag off" behavior is a boot-time router
check verified by §9.7a below.

- Token missing → `401`.
- Token present but user has no `admissions_copilot` entitlement
  → `403`.
- Both flag and entitlement present → happy path proceeds.
- Ownership: user A cannot read user B's records → `403` on
  every route.

#### 9.7a Router-mount tests (flag off vs on)

- **Backend flag unset:** boot the Express app with
  `ADMISSIONS_COPILOT_ENABLED=""`, assert that no route matching
  `/api/admissions/*` is registered (checked via the router
  stack), and assert that a live request to
  `/api/admissions/me/profile` hits the global 404 handler with
  no route-specific body. **No `403` is expected here.**
- **Backend flag set:** boot with `ADMISSIONS_COPILOT_ENABLED="1"`,
  assert the router is registered, and assert that the auth /
  entitlement tests above respond as documented.

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
- **Production:** unset. The entire `/api/admissions` router is
  **not mounted** at boot; requests to any `/api/admissions/*`
  path (including `GET /health`) hit the Express global 404
  handler with no route-specific body. This matches Gate 2's
  existing behavior. **No `403` is emitted in production for
  admissions paths** — 403 is only meaningful inside mounted
  UAT/test routes.
- **UAT:** `"1"` in the UAT Render env. Router mounted; health
  returns `200`; mounted routes enforce auth / entitlement /
  ownership and emit `401` / `403` per §4.3.
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

### 11.1 Required conditions (v0.2)

Every condition below is a **hard prerequisite**. Missing any
single one blocks a real applicant trial.

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
- **Audit log retention policy defined and approved.** In UAT,
  the log is append-only and unbounded (§6.4). Before a real
  trial, the reviewer must approve a retention policy (max
  age, max rows per user, purge/archive procedure). Not
  optional.
- **Delete / export / reconcile policy defined and approved.**
  Per reviewer v0.2: no real applicant trial may run until this
  policy is approved. This includes at minimum:
  - `DELETE /me` semantics (immediate hard delete vs
    tombstoned soft delete)
  - `GET /me/export` schema (which fields, which format,
    which encryption at rest)
  - Reconcile path for entry errors and how the audit log
    supports it
  These endpoints are still deferred to Gate 6+, but the
  **policy** must exist before a trial, not just the code.

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

### 13.3 Resolved decisions (from v0.1 open questions)

All prior open questions are resolved per reviewer v0.2:

| # | Question | Resolution |
|---|---|---|
| 1 | Endpoint list scope (v0.1 §4.1) | **Narrower Gate 5 MVP.** See §4.1.1 for the 37-endpoint list and §4.1.2 for what is deferred to Gate 6+. |
| 2 | Contract JSON distribution (§7.2) | **Vendor the JSON into `mcat-study-app-backend`.** Paired `expectedSnapshotHash.js` mirror; parity + freeze tests in both repos; no artifact fetching. |
| 3 | Draft version retention (§6.3) | **Latest 50 versions per `(user_id, prompt_id)` in UAT.** Pruned in the write path, not by a DB trigger. |
| 4 | Audit log retention (§6.4) | **Append-only and unbounded in UAT for now.** A retention policy MUST be defined before any real trial and is a hard prerequisite in §11.1. |
| 5 | Rate limits (§8.6) | **60 req/min/user for reads/lists is OK. Stricter mutation limits allowed.** Mutation defaults: 20 req/min/user per entity kind, subject to per-endpoint tightening. |
| 6 | Real-trial data-entry path (§11.2) | **Portal only.** No CSV import, no upload, no admin console, no direct DB entry. Boundary applies to Gate 6+ as well. |
| 7 | Delete / export endpoints (§11.3) | **Deferred to Gate 6+.** Additionally, per reviewer v0.2, **no real applicant trial may run until delete / export / reconcile policy is approved.** This is a hard readiness criterion added to §11.1. |
| 8 | Backend audit log privileges (§6.4) | **Backend role is append-only** (`INSERT` on `admissions.audit_log`; no `SELECT`, no `UPDATE`, no `DELETE`). Read access happens via a separate **ops/reviewer runbook** path — a Render psql-shell session using a distinct read-only role, never through a backend HTTP endpoint. Documented in the UAT runbook. |

### 13.4 Timeline (estimate — for planning only)

Contingent on approval:

- Backend scaffolding + migrations + contract mirror: ~2 days
- Endpoint implementation for the narrowed Gate 5 MVP surface
  from §4.1.1 (**37 endpoints** — mostly boilerplate over
  Zod-shaped inserts / updates; **no `DELETE` routes**; no
  transition, interview-prep, broad school-research CRUD,
  broad citation CRUD, or export/reconcile): ~2 days
- API contract tests + auth/entitlement / ownership / router-mount
  tests (§9.2 + §9.7 + §9.7a): ~2 days
- Portal persistence adapter + tests: ~1 day
- Runbooks + reviewer walkthrough: ~0.5 day

Total: ~7.5 working days for the portal-side + backend-side
Gate 5 delivery. The narrowed MVP shaves ~1 day off the earlier
v0.2 estimate that mistakenly still cited 40 endpoints.
