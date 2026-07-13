# Admissions Copilot — Portal Integration Plan (v0.2)

**Status:** Documentation only. Approved conditionally at v0.1;
this v0.2 applies the six corrections requested at that approval.
**Ownership:** Claudio (528 AI platform) owns final portal integration
and course correction from this point forward. Cody's workbench is
referenced only as prototype / handoff material.
**Backend anchor:** `EthioCode-ai/mcat-study-app-backend`, `main` at
`021d845dab9e3a1c9919b9f3f07311e2cb8a8f74`. Feature gate off;
`ADMISSIONS_COPILOT_ENABLED` unset in Render production.

---

## Corrections applied at v0.2 (delta from v0.1)

1. **No model provider — external or local — may process real
   applicant data unless explicitly approved.** Deterministic /
   local rule-based execution is allowed for FICTIONAL flows only
   unless separately approved. The v0.1 phrase permitting Cody to
   run local models "his call" is removed.
2. **Ownership language corrected.** Cody's workbench is
   prototype / handoff material. Claudio owns final portal
   integration and any course correction going forward.
3. **Real applicant data handling.** For a real applicant trial:
   - `localStorage` may be used only for a controlled local dry
     run if explicitly approved
   - otherwise, real applicant data waits for `mcat_admissions_uat`
     after schema approval (see §8 Gate 6)
   - no real applicant data may be committed, logged, screenshotted
     into artifacts, or sent to any model provider without approval
4. **Gate 2 scope tightened.** Gate 2 is UX skeleton only:
   routes, sidebar entry / gating, unavailable page, empty-state
   skeletons. No agent calls, no real applicant data, no
   persistence, no migrations, and no backend changes unless a
   harmless compile-time stub is unavoidable.
5. **`/auth/me` entitlement exposure is future proposal only.**
   Not implemented in Gate 2. If the sidebar needs to differentiate
   Elite from Elite+ later, that surfaces after a separate approval.
   Gate 2 uses `subscription_tier ∈ {elite, vip}` as the placeholder
   hint — the authoritative gate is enforced backend-side by the
   existing `requireEntitlement('admissions_copilot')` middleware.
6. **All existing restrictions preserved:** no production
   connection, no `ADMISSIONS_COPILOT_ENABLED` in Render, no new
   migrations, no UAT schema yet, no production cleanup, no
   external providers, no private applicant data, no Growth Engine
   / mobile / billing / Stripe changes.

---

## 1. Where Admissions Copilot lives

- **Repo:** `528-web-app` (this repo)
- **Route group:** `src/app/(dashboard)/admissions/**` — inherits the
  existing dashboard shell (sidebar, `TopBar`, theme)
- **Backend namespace:** `/api/admissions/*` — feature-gated by
  `ADMISSIONS_COPILOT_ENABLED`. Returns 404 when off (current).

### Route table (Gate 2 covers ALL of these as empty-state skeletons)

| Path | Purpose |
|---|---|
| `/admissions` | Overview: cycle summary, next-action strip |
| `/admissions/profile` | Applicant profile (demographics, disadvantage, gap years) |
| `/admissions/metrics` | Academic metrics + standardized scores (MCAT + PREview) |
| `/admissions/experiences` | Hours + activities + evidence bank |
| `/admissions/schools` | School list with priority + status |
| `/admissions/schools/[schoolId]` | Per-school research + notes |
| `/admissions/prompts` | Secondary prompts + interpretations |
| `/admissions/drafts` | All drafts across schools + prompts |
| `/admissions/drafts/[draftId]` | Single-draft workspace (outline + versions) |
| `/admissions/interviews` | Practice sessions + coaching |
| `/admissions/settings` | Feature-scoped preferences |
| `/admissions/unavailable` | Rendered when backend returns 404 |

### Sidebar entry

Inserted in `src/app/(dashboard)/layout.js` after `Study Plan`.
Conditional on `user.subscription_tier ∈ {elite, vip}`. Non-Elite
users do not see the entry. Elite / VIP users with no backend
`admissions_copilot` entitlement land on `/admissions/unavailable`
via the health-check gate. There is no promotional CTA in this gate.

### Elite+ gating (two layers)

- **UI (client):** hide the sidebar entry when `tier < elite`. This
  prevents visual noise; it is NOT a security boundary.
- **Server (authoritative):** backend
  `requireEntitlement('admissions_copilot')` refuses every request
  regardless of what the client renders. Portal never invents an
  entitlement; it reads a hint from the tier and defers to backend
  responses for truth.

---

## 2. Salvage from Cody's workbench

Cody's workbench is prototype / handoff material.

### Salvage (retain, adapt, own)

- **Agent prompt templates** — extract into
  `src/features/admissions/agents/prompts/<agent>/*.ts` (Gate ≥ 4)
- **Validation logic (zod schemas)** — publish under
  `src/features/admissions/agents/validators/*.ts`
- **Intake schemas** — canonical typed contracts
- **Output structures** — draft envelopes, evidence-linked claims,
  integrity findings, story-match option lists
- **Agent tests** — jest / vitest tests demonstrating deterministic
  I/O; rewrite import paths to portal data layer
- **Evidence-ledger algorithm** — pure module
- **Story-match ranking algorithm** — pure module
- **Interview coaching rubric** — pure module + constants

### Discard

- Cody's Prisma schema (Table Contract v0.2 is the SQL contract;
  `prisma migrate` never touches shared 528 AI databases)
- Any standalone auth / next-auth wiring
- Workbench-specific UI shell
- Docker or local-Postgres references
- Standalone billing / paywall flows
- Any `.env` or committed test data with real emails
- Any standalone deploy configs

---

## 3. Portal UX per stage

Every page:
- **Applicant-first.** Agent proposes; applicant approves.
- **Evidence-traced.** Every agent claim cites `evidence_items.id`.
- **Explicit approval.** Accept / Revise / Reject on every agent output.
- **Honest empty state.** No fake charts, no placeholder metrics.
- **Loading discipline.** Streaming status text > blocking spinners.
- **Error clarity.** `entitlement_required` → unavailable state;
  `not_ready` → specific next step; 404 → unavailable state.

Per-page details for `/admissions/*` unchanged from v0.1
(§3a–§3i) — reproduced by reference to avoid drift.

---

## 4. Backend integration

- **Auth:** existing `useAuthStore` + JWT + `/auth/me`. Handlers use
  `fromRequest(req)` per Platform Contract §2.
- **Entitlement:** `admissions_copilot` in `public.user_entitlements`.
  Grants via Stripe webhook (future), admin tool (future), or
  approved trial grant (Gate 4).
- **Feature-gate detection:** portal probes
  `GET /api/admissions/health` on admissions entry. `200` → proceed;
  `404` → `/admissions/unavailable`; `401` → `/login`; `403` →
  unavailable state.
- **Routes available today:** `/health`, `/documents/*` (already merged).
- **`/auth/me` entitlement expansion:** deferred. Not implemented in
  Gate 2. If added later, comes through a separate approval.

---

## 5. Data strategy

- **Now:** applicant scratch state stays in `localStorage` +
  in-memory only. No Render persistence for Admissions applicant
  content yet.
- **After Gate 6:** the 12 Required-now tables from Table Contract
  v0.2 land on a dedicated `mcat_admissions_uat` Render Postgres
  (same major version + region as production, Basic plan).
- **No Docker / local Postgres.** Contract enforced.
- **No production schema changes.** The `admissions.*` schema on
  `mcat_study_db` stays exactly as documented; one leftover
  test-shaped `admissions.documents` row (legitimate `user_id`,
  local-stub provider, verification pending, no bytes) stays on the
  Phase 7 reconciliation list.

---

## 6. Agent execution strategy

- **Deterministic / local rule-based execution for FICTIONAL flows
  only** unless separately approved.
- **No external LLM provider is called for applicant-facing output**
  until a dedicated Admissions provider policy (data handling,
  retention, DPA, opt-out) is approved AND provider secrets are
  provisioned in Render env for UAT.
- **No local model provider processes real applicant data** without
  explicit approval — including on developer machines.
- **Evidence tracing:** every claim ↔ evidence_item ID.
- **Draft quality checks:** client (fast) + backend (authoritative
  on submit, once endpoints exist).
- **Interview coaching:** rubric-based deterministic scoring across
  the 10 dimensions from Table Contract §L.

---

## 7. Safety constraints

Re-stated for this phase:

- **No production connection.**
- **No new migrations.** `domains/admissions/migrations/` in the
  backend repo stays at `001_init.sql`, `002_documents_delete_state.sql`,
  `runner.js`.
- **No UAT schema yet.** `mcat_admissions_uat` not provisioned.
- **No `ADMISSIONS_COPILOT_ENABLED`.**
- **No real applicant data** committed, logged, screenshotted, or
  sent to any model provider without approval.
- **No Growth Engine, mobile, billing, or Stripe changes.**

---

## 8. Acceptance gates (unchanged sequence)

1. Portal integration plan reviewed — **this document (v0.2)**.
2. **Guided portal UX skeleton reviewed** — Gate 2 deliverable
   (this branch). UX skeleton only; no agent calls, no persistence,
   no backend changes beyond harmless compile-time stubs if any.
3. Validation reviewed.
4. First fictional run reviewed.
5. First real private applicant trial reviewed.
6. UAT schema plan reviewed.
7. Migration plan reviewed.
8. Enable broader testing.

Production `ADMISSIONS_COPILOT_ENABLED=1` is out of scope for every
gate above and is its own multi-step plan later.

---

## Change log

- **v0.2 (2026-07-14):** Six corrections applied (§corrections
  section). Gate 2 scope explicit. Real-applicant-data language
  hardened. `/auth/me` expansion deferred. Ownership clarified.
- **v0.1 (2026-07-13):** Initial plan delivered inline; conditionally
  approved.
