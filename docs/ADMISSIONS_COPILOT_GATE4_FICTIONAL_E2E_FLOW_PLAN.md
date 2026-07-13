# Admissions Copilot — Gate 4 Fictional End-to-End Flow Plan (v0.2)

**Status:** v0.2 — reviewer-corrected pre-implementation draft.
Two companion pre-implementation docs ship alongside this file:
`ADMISSIONS_COPILOT_GATE4_CODY_SALVAGE_AUDIT.md` and
`ADMISSIONS_COPILOT_GATE4_DRAFT_TEMPLATE_SAMPLE.md`.

## v0.2 changelog vs v0.1

Applied per reviewer's Gate 4 v0.2 correction pass:

1. **App Router wording contradiction fixed.** v0.1 opened §1 with
   "nothing new gets added to the App Router" while later admitting
   `/admissions/prompts/[promptId]` is new. Corrected to state that
   **exactly one new App Router route is added** —
   `/admissions/prompts/[promptId]` — and all other Gate 4 pages
   reuse the Gate 2 skeleton.
2. **Health-probe failure modes broadened.** The unavailable state
   must safely handle a 404 response **and** a network error **and**
   a timeout. §3.5 now enumerates all three failure modes and the
   handling.
3. **Dev-mode flag mechanism locked.** Gate 4 local dev requires
   `process.env.NODE_ENV === "development"` **AND**
   `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED === "1"`. No URL-query
   trigger. No `sessionStorage` force-enable. No production /
   Vercel flag enable. Prior alternates are removed.
4. **Synthetic-name denylist extended.** Added Mayo, NYU, WashU,
   Vanderbilt, Northwestern, Emory, Baylor, Mount Sinai, Michigan,
   Washington University, Case Western, Pitt, UVA, UNC, and
   UT Southwestern to the guard used by
   `flow.namesAreSynthetic.test.js` (§8.4).
5. **Acknowledgement UX clarified.** Warning-tier acknowledgements
   live in `runStore.acknowledgements[]` and are **current-session
   only**. No `localStorage` persistence. No `sessionStorage`.

## v0.2 companion deliverables

Per reviewer, two additional short docs must be reviewed alongside
this plan before implementation:

- **`ADMISSIONS_COPILOT_GATE4_CODY_SALVAGE_AUDIT.md`** — classifies
  eight candidate items from Cody's workbench as
  `salvage-as-is` / `salvage-after-refactor` / `rewrite` / `discard`.
- **`ADMISSIONS_COPILOT_GATE4_DRAFT_TEMPLATE_SAMPLE.md`** — one
  representative deterministic template + its rendered `sentenceIndex`,
  showing first-person applicant voice, evidence + citation ID
  linkage, no third-person copied text, no real applicant data, no
  LLM/provider dependency.

---

**Status header:** Draft — awaiting reviewer approval before implementation.
**Scope:** One synthetic-only, deterministic, portal-side end-to-end
flow that exercises the merged Gate 3 validation contract from
applicant intake through applicant review screen.
**Non-scope:** Real applicant data; UAT database; production
enablement; agent/provider integration; document upload; billing /
entitlement wiring; migrations; Growth Engine, mobile, Stripe, or
backend entitlement work.

Gate 3 shipped the validation contract on `main` at commit
`3d9cb418`. Gate 4 uses that contract to prove the **shape** of a
single user journey end-to-end — nothing more. The entire flow runs
in the browser tab against synthetic fixtures. No `fetch()` reaches
a real backend beyond the existing `/api/admissions/health` probe
(which is already dark unless `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED`
is set — and it stays unset in prod for Gate 4).

---

## Table of contents

1. [Portal pages involved](#1-portal-pages-involved)
2. [Synthetic fixture design](#2-synthetic-fixture-design)
3. [Validation flow](#3-validation-flow)
4. [Agent orchestration flow](#4-agent-orchestration-flow)
5. [Output screens](#5-output-screens)
6. [Evidence / citation traceability](#6-evidence--citation-traceability)
7. [Draft quality checks](#7-draft-quality-checks)
8. [Tests to add](#8-tests-to-add)
9. [Safety guardrails](#9-safety-guardrails)
10. [What will NOT be included](#10-what-will-not-be-included)
11. [Deliverable summary + open questions](#11-deliverable-summary--open-questions)

---

## 1. Portal pages involved

Gate 4 adds **exactly one new App Router route** —
`/admissions/prompts/[promptId]` — as a `page.jsx` under the
existing `(dashboard)` route group. Every other page participating
in the Gate 4 flow already exists from the Gate 2 skeleton. Pages
are enabled only when three preconditions hold, in this order:

1. `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1"` (frontend flag).
   Remains unset in production. Gate 4 development uses a
   local-only mechanism to force-set it in the browser session (see
   §9 for how).
2. `AdmissionsGate` (Gate 2) → 200 from `/api/admissions/health`.
   For Gate 4, the health probe is mocked at the module boundary
   (§3.4). Backend is never called.
3. Applicant tier is elite / vip (unchanged from Gate 2).

### 1.1 Participating pages

| Route | Purpose in Gate 4 | Gated by |
|---|---|---|
| `/admissions` | Landing page. Shows a **DEV MODE — Synthetic Run Only** banner and a single "Load synthetic run" button. Not shown in production. | portal flag + tier |
| `/admissions/profile` | Displays synthetic profile (MVP fields only). Read-only. | portal flag + tier + run session loaded |
| `/admissions/metrics` | Displays synthetic MCAT + GPA + PREview (values in Gate 3 valid range). Read-only. | same |
| `/admissions/experiences` | Displays synthetic activities + evidence bank. Read-only cards showing confirmed vs unconfirmed. | same |
| `/admissions/schools` | Shows the one synthetic school in the run. | same |
| `/admissions/schools/[schoolId]` | Opens the synthetic school. Shows `schoolResearch` (fit axes + citations). | same |
| `/admissions/prompts` | Lists the one synthetic secondary prompt for the school. | same |
| `/admissions/prompts/[promptId]`* | Prompt detail. **Run Copilot** button visible. | same |
| `/admissions/drafts` | Lists drafts produced by the run. | same |
| `/admissions/drafts/[draftId]` | The draft workspace — see §5.5 for the layout. | same |
| `/admissions/interviews` | Interview-prep display for the synthetic school. | same |
| `/admissions/settings` | Shows doNotUseTopics for the run. Read-only. | same |
| `/admissions/unavailable` | Standard fallback if any of the above gates are off. | always renders |

*`/admissions/prompts/[promptId]` is a new dynamic route added in
Gate 4. All other routes are already present.

### 1.2 What the user clicks

The Gate 4 user journey has one canonical path:

```
/admissions
  → click "Load synthetic run"
    → /admissions/profile (auto-navigated)
    → sidebar: /admissions/schools
      → click the one synthetic school
        → /admissions/schools/{schoolId}
    → sidebar: /admissions/prompts
      → click the one synthetic prompt
        → /admissions/prompts/{promptId}
        → click "Run Copilot"
          → progress panel: interpretation → story match → school fit → draft → integrity → interview
          → navigate to /admissions/drafts/{draftId}
    → applicant review screen: side-by-side draft + integrity panel + trace-back to evidence/citation IDs
```

### 1.3 What remains disabled

- **Document upload.** No `<input type="file" />` is wired anywhere.
- **Save / share / export.** Buttons are rendered `disabled` with a tooltip "Disabled in Gate 4 — synthetic run only."
- **Applicant edit.** The workspace shows the draft; the applicant cannot type. Feedback affordances are stubbed as "Coming in Gate 5."
- **Any /api call other than `/api/admissions/health`.** Enforced by the existing `vitest.setup.js` fetch guard in tests and by a runtime guard (§9.4) in the dev-mode session.
- **All Growth Engine, mobile, Stripe, billing, entitlement APIs** — none imported anywhere in the Gate 4 code.

---

## 2. Synthetic fixture design

Extends the Gate 3 `fixtures/synthetic/` set with the additional
entities needed for one complete run. Every new fixture file
carries `SYNTHETIC_FIXTURE = true` (enforced by
`fixturesDiscipline.test.js`). All names are clearly synthetic
(`Synthetic *` naming discipline, per Gate 3.1).

### 2.1 The single applicant profile

Uses the existing `validApplicantProfile` (MVP-only fields):

- `applicantLabel: "Synthetic Applicant Alpha"`
- `applicationCycle: "2026-2027"`
- `stateResidency: "MA"`
- `college: "Synthetic University Alpha"`
- `major: "Molecular Biology"`
- `graduationDate: "2025-05"`

No sensitive fields populated. All `sensitive: true` fields absent.

### 2.2 Scores (already exist in Gate 3 fixtures)

- **`validAcademicMetrics`** — cumulative GPA 3.72, sGPA 3.65,
  `gpaTrend: "upward"`, `transcriptCount: 2`.
- **`validMcatAttempt`** — total 512, sections 128/128/128/128,
  testDate `2024-08-14`, `voided: false`.
- **`validPreview`** — score 7, testDate `2024-06-01`, cycle
  `2026-2027`.

### 2.3 One synthetic school

Uses `validSchoolListEntry` (already in Gate 3):

- `officialSchoolName: "Placeholder Medical School"`
- `programType: "MD"`
- `location: { city: "Placeholderville", stateOrRegion: "MA", country: "US" }`
- `tier: "target"`
- `applicationType: "primary"`
- No `aamcSchoolId` (still optional/deferred).

**New for Gate 4:** `validSchoolResearch` — one Zod-valid
`schoolResearchSchema` instance:

- `fitAxes` = `[{ axisKey: "mission-service", axisNotes: "..." }, { axisKey: "curriculum-integration", axisNotes: "..." }]`
- `keyPrograms` = `["Longitudinal Community Clinic Track", "Health-Systems Science thread"]`
- `citationRefs` = `[CITATION_A_ID, CITATION_B_ID]` (existing +
  one new Gate 4 citation, §2.5)
- `updatedAt` recent enough that `research.stale` does not fire.

### 2.4 One synthetic secondary prompt

Uses `validSecondaryPrompt` (already in Gate 3) plus a new
`validPromptInterpretation` for §4.2:

- Prompt: "How will you contribute to our mission?"
- `wordLimit: 300`
- `category: "mission-fit"`
- `sourceCitationId: CITATION_A_ID`

**New for Gate 4:** `validPromptInterpretation`:

- `interpretation` = deterministic 60–200-char paraphrase.
- `keyAxes` = `["mission-service", "curriculum-integration"]` (subset of `schoolResearch.fitAxes.axisKey`).
- `expectedThemes` = `["community-service", "underserved-populations", "primary-care-emphasis"]`.
- `confirmed: true`.

### 2.5 Evidence / story bank (three items)

Two exist in Gate 3 (`validEvidenceConfirmed`,
`validEvidenceUnconfirmed`). Gate 4 adds a third
`validEvidenceConfirmedSecondary`:

- Confirmed, `sensitivityTags: ["none"]`.
- Narrative around a leadership/teaching event (mentorship-given).
- Longer narrative (≥ 400 chars) so `interview-defensibility.thin`
  does not fire.

The unconfirmed / sensitive item exists specifically to prove
integrity-panel behavior: it is present but the draft never cites
it. The integrity check trace confirms it was skipped.

### 2.6 Citations

Two citations:

- `validCitation` (Gate 3) — school mission page, scoped to the
  school. `usedForCurrentCycleRequirement: true`.
- **New for Gate 4:** `validCitationCurriculum` — school
  curriculum-track page, `schoolScopeId` matches, distinct URL,
  `retrievedAt` recent.

### 2.7 doNotUseTopics

Uses `validDoNotUseTopic` (Gate 3). Its `matchPhrases` include one
phrase deliberately absent from the generated draft — so the flow
proves the check runs without firing. A separate broken-fixture
variant (§2.9) plants a matching phrase to prove the block path.

### 2.8 Interview-prep goals

**New for Gate 4:** `validInterviewPrepInputs`:

- `interviewFormat: "MMI"`
- `storyIds: [EVIDENCE_A_ID, EVIDENCE_C_ID]` (both confirmed, so
  `draft.interview-defensibility.unconfirmed-sensitive` does not fire
  on the generated question list).
- `predictedQuestions: []` (populated by §4.6).
- `personalAntiExamples: []`.

### 2.9 Broken-fixture variants (test-only, §8)

For proving Gate 3 validators actually block, we add a small
`fixtures/synthetic/broken/` folder with **synthetic-only**
malformed fixtures. Every file still carries
`SYNTHETIC_FIXTURE = true`. Examples:

- `brokenApplicantOverCap.js` — 8 MCAT attempts (over lifetime cap).
- `brokenSchoolNoCitations.js` — `schoolResearch.citationRefs = []`.
- `brokenPromptWrongSchool.js` — prompt whose `schoolId` isn't in the school list.
- `brokenDraftPlaceholder.js` — draft text with `"the applicant"`.
- `brokenDraftDoNotUseHit.js` — draft with a phrase from `matchPhrases`.
- `brokenDraftUnsupportedClaim.js` — sentence classified as claim, `linkedEvidenceIds: []`.
- `brokenDraftAgentUncitedSchoolClaim.js` — agent-authored school claim, `linkedCitationIds: []`.

These fixtures never render on any page; they're only imported by
tests.

---

## 3. Validation flow

Gate 4 exercises the Gate 3 validators at three points in the
journey.

### 3.1 On fixture load

When the user clicks "Load synthetic run" on `/admissions`:

- Every fixture is passed through its Zod schema (`ENTITIES.*.schema.parse()`).
- Any validation failure aborts the load and surfaces a red
  banner: "Synthetic fixture failed Gate 3 validation — see
  console for details."
- The applicant-profile MVP-required keys are enforced. No
  sensitive fields are read or displayed.

### 3.2 On prompt open

When the user opens `/admissions/prompts/{promptId}`:

- Cross-entity `prompt.school.orphan` check runs
  (`promptSchoolInList` from Gate 3 tests, promoted to a helper).
- Cross-entity `interpretation.axis.mismatch` check runs.
- If either blocks, the "Run Copilot" button is disabled with a
  tooltip citing the ruleId.

### 3.3 On agent run

When the user clicks "Run Copilot" (§4):

- After each engine step, the intermediate output is Zod-parsed
  again. This is defensive — engines are deterministic and should
  emit valid shapes — but it lets us catch regressions loudly.
- Draft output runs through `validateDraft(draft, context)` from
  Gate 3 in two phases:
  1. `phase: "drafting"` at the moment the draft is generated.
  2. `phase: "approval"` when the applicant review screen is opened.
- Any blocking rule surfaces in the integrity panel (§5.5); any
  warning surfaces there too, distinguished by icon and copy.

### 3.4 Validation-message rendering

Uses the Gate 3 `renderMessage(ruleId, metadata)` helper. All
messages come from the frozen rule registry — Gate 4 does not add
new user-facing copy for these ruleIds. Any Gate 4-only informational
messages (e.g. "Synthetic run loaded") are labelled clearly and
never overlap with Gate 3 messageTemplates.

### 3.5 Health-probe handling

`AdmissionsGate` (Gate 2) probes `/api/admissions/health`. The
probe can resolve one of four ways; all four must degrade safely
to the same "unavailable" state or the same "ok" state:

| Probe result | AdmissionsGate treatment | Gate 4 flow behavior |
|---|---|---|
| `200` | `state = ok` → children render | Synthetic run may start |
| `401` | `router.replace("/login")` | Flow does not start |
| `403` | `state = no_entitlement` inline | Flow does not start |
| `404` **or** any other non-200/401/403 status | `router.replace("/admissions/unavailable")` | Flow does not start |
| Network error (e.g. connection refused, DNS failure) | `.catch()` branch → `router.replace("/admissions/unavailable")` | Flow does not start |
| Timeout (fetch never resolves before the applicant navigates away) | The `cancelled` flag in `AdmissionsGate`'s useEffect cleanup ignores the late resolution; no state mutation happens after unmount | Flow does not start |

The Gate 2 `AdmissionsGate` implementation already handles the
first four rows via its `if / else if / else` branches over
`res.status`, and the fifth row via its `.catch()` handler. Row
six is handled by the useEffect cleanup `cancelled = true`
pattern already in place. Gate 4 introduces no new probe
semantics — it only relies on this "any non-ok result → unavailable"
contract.

For tests, the health-probe fetch is mocked deterministically at
the module boundary per case:
- happy path — `Promise.resolve({ status: 200 })`
- 404 case — `Promise.resolve({ status: 404 })`
- network-error case — `Promise.reject(new Error("network fail"))`
- timeout case — a never-resolving Promise + a
  `waitFor`-based assertion that the redirect NEVER fires on the
  unmounted component.

**No `fetch` other than the health probe is issued at any point
in the Gate 4 flow.** The fetch-guard in `vitest.setup.js`
enforces this in tests; a runtime guard (§9.4) enforces it during
manual dev sessions.

---

## 4. Agent orchestration flow

"Agent" in Gate 4 = **deterministic JavaScript module**. No LLM.
No provider. No non-determinism (no `Math.random`, no `Date.now`
in the logic itself — timestamps come from a seeded clock passed in
by the caller).

### 4.1 Directory layout

```
src/features/admissions/copilot/
├── runOrchestrator.js        # Composes engines in order, holds run state
├── engines/
│   ├── promptInterpretation.js
│   ├── storyMatch.js
│   ├── schoolFit.js
│   ├── draftGeneration.js
│   ├── draftIntegrity.js       # wraps Gate 3 validateDraft
│   └── interviewQuestions.js
├── runStore.js                # Zustand store: current run session state (in-memory)
├── runGuard.js                # runtime "no backend fetch" guard (§9.4)
├── constants.js
└── __tests__/
    ├── runOrchestrator.test.js
    ├── engines.*.test.js
    └── runGuard.test.js
```

### 4.2 Engine chain

The orchestrator runs engines strictly in this order. Each engine
takes the previous engine's output plus the fixture-loaded context
and returns its own Zod-validated output.

```
promptInterpretation(prompt, schoolResearch)
  → PromptInterpretation
storyMatch(interpretation, evidenceBank, doNotUseTopics)
  → RankedEvidenceMatches
schoolFit(schoolResearch, citations, applicantProfile)
  → SchoolFitBrief
draftGeneration(prompt, interpretation, matches, fitBrief)
  → Draft (with sentenceIndex)
draftIntegrity(draft, context, phase: "drafting")
  → IntegrityReport
interviewQuestions(schoolResearch, matches, interviewPrepInputs)
  → InterviewPack
```

### 4.3 What is deterministic

- Every engine takes `{ ...inputs, seed: number }` where `seed` is
  a fixed constant per synthetic run. Any ordering tie-break uses
  a seeded PRNG (mulberry32 or similar — trivial, local, no
  external dep).
- No `Math.random`, no `Date.now`. All timestamps come from the
  policy snapshot's `retrievedAt` or from the fixture files.
- Given the same fixture set + seed, engine outputs are
  byte-identical across runs. A snapshot-test approach (§8) locks
  this.

### 4.4 What is salvaged from Cody's workbench

To be finalized during implementation, but the **audit criteria**
are:

| Salvage criterion | Applies? |
|---|---|
| Pure function, no I/O | Only if yes |
| No provider / LLM / API call | Only if yes |
| No non-determinism | Only if yes (or refactored to accept a seed) |
| No hard-coded external policy (moves to `admissionsPolicySnapshot`) | Only if refactored |
| No PII or real-name data in fixtures or code paths | Only if yes |
| Produces Zod-parseable output for a Gate 3 entity | Only if yes |

Candidate salvage areas:

- **Sentence-token utilities** — likely reused (matches the
  Gate 3 `output/tokenize.js` shape).
- **Prompt-to-theme heuristic** — audit; likely rewritten to use
  the Gate 3 `PROMPT_CATEGORIES` + `FIT_AXIS_KEYS` enum vocabulary.
- **Story-to-theme ranking** — audit; likely rewritten as a
  simple deterministic scoring function over
  `interpretation.expectedThemes` × evidence text tokens.
- **Draft-template assembly** — likely rewritten from scratch to
  emit first-person, cite-attached sentences straight into
  `sentenceIndex` so the integrity checker has structured input.
- **Interview-question templates** — audit; likely rewritten to
  emit `predictedQuestions[]` in the shape Gate 3's
  `interviewPrepInputsSchema` requires.

Anything from Cody that fails the audit is **rewritten**, not
adapted. Rewrites are shorter than adaptations and easier to
verify against the Gate 3 contract.

### 4.5 Temporary storage

**`runStore` (Zustand, in-memory only)** holds:

- `runId` (UUID, deterministic per fixture set + seed)
- `phase` (idle | loading | interpreting | matching | fitting |
  drafting | checking | interviewing | done | error)
- Each engine's output, keyed by engine name
- `acknowledgements[]` — warning acknowledgements for this session
  only (see §6.3)
- `errors[]` — any Zod parse failure captured for the UI
- `startedAt` / `endedAt` — from a `now()` passed in by the
  caller (test-injectable)

**Not persisted.** No `localStorage`, no `sessionStorage`.
Refreshing the browser drops the run and clears every
acknowledgement. That's intentional for Gate 4 — persistence is
Gate 5+ and requires the backend.

### 4.6 What each engine produces

- **`PromptInterpretation`** — matches `promptInterpretationSchema`.
- **`RankedEvidenceMatches`** — `{ matches: Array<{ evidenceId, score, reasonCodes[] }> }`. Score ∈ [0, 1]. `reasonCodes` are enum values documenting *why* the story ranked (e.g. `"theme:community-service"`).
- **`SchoolFitBrief`** — `{ fitStatements: Array<{ axisKey, brief, citationRefs[] }> }`. Every statement carries at least one citation.
- **`Draft`** — matches `draftSchema` (Gate 3). `authorType: "agent"` initially. Every sentence is populated in `sentenceIndex[]` with `linkedEvidenceIds` / `linkedCitationIds`.
- **`IntegrityReport`** — output of `validateDraft(...)` grouped by severity.
- **`InterviewPack`** — `{ questions: [{ questionText, sourceCitationId, expectedThemes[], mappedEvidenceIds[] }] }`. Matches the shape `interviewPrepInputs.predictedQuestions` expects.

---

## 5. Output screens

Every screen renders from `useAdmissionsRunStore` state. No
component fetches its own data.

### 5.1 Prompt interpretation display (`/admissions/prompts/{id}`)

- Prompt text at top (with word/char limits).
- Interpretation paraphrase.
- Key axes (as chips referencing `FIT_AXIS_KEYS`).
- Expected themes.
- **Run Copilot** button (disabled if any §3.2 check fails).

### 5.2 Story-match display

Panel embedded in `/admissions/drafts/{draftId}`:

- Sortable table: story title, score, reason codes.
- Row-hover surfaces the evidence narrative excerpt.
- Confirmed / unconfirmed badge per row.
- Explicit "why this ranked" pill list per row.

### 5.3 School-fit display

Panel embedded in `/admissions/schools/{schoolId}` and referenced
from the draft workspace:

- Per axis: brief text + citation badges (each linking back to
  the citation card).
- Any warning-severity finding for `research.stale` shows as an
  inline chip.

### 5.4 Draft workspace (`/admissions/drafts/{draftId}`)

Three-pane layout:

- **Left:** the generated draft. Every sentence gets a click
  affordance that surfaces its `linkedEvidenceIds` +
  `linkedCitationIds`.
- **Center:** metadata — word/char count vs limit, phase pill,
  authorType.
- **Right:** integrity panel (§5.5).

### 5.5 Integrity panel

- Grouped by severity (blocking / warning / informational).
- Each row shows `ruleId`, rendered message, and the sentence
  span (spanStart..spanEnd) it points at.
- A "trace back" affordance jumps to the evidence or citation
  card.
- Real-time re-computation: when the underlying store changes,
  the panel re-derives from `validateDraft`.

### 5.6 Interview-prep display (`/admissions/interviews`)

- Each predicted question as a card.
- Card shows: question text, expected themes, mapped evidence IDs,
  cited citation.
- Empty state if the run hasn't reached the interview phase.

### 5.7 Agent run summary

Modal (or slide-over) accessible from the workspace header:

- Ordered timeline of engines executed with duration.
- Fixture set identifier (name + `SYNTHETIC_FIXTURE=true` badge).
- Run seed.
- Contract version (from `admissions.contract.json`
  `contractVersion`) and policy snapshot version.
- Warnings + blocking counts at final phase.
- A "This run was fully synthetic — no data left the browser tab."
  reassurance line.

### 5.8 Applicant review screen

Route: `/admissions/drafts/{draftId}` at status
`applicant-approved` transition preview (this is a preview only —
transition itself is not performed in Gate 4). Layout:

- Left: draft, sentence-clickable with linked evidence + citation.
- Right: applicant checklist:
  - "All blocking checks resolved" ✅
  - "All applicant claims cited" ✅
  - "All school claims cited" ✅
  - "No copied evidence" ✅
  - "No doNotUseTopics hit" ✅
  - "No third-person markers" ✅
- Buttons — all rendered disabled with tooltip "Applicant edit /
  approve is Gate 5."

---

## 6. Evidence / citation traceability

Traceability is the whole point of Gate 4 — proving that every
claim in a generated draft is walkable back to a specific
evidence ID or citation ID.

### 6.1 Applicant claim → evidence ID

- `draftGeneration` emits `sentenceIndex[]` entries with
  `classifiedAs: "applicant-claim"` populated in-place —
  the engine already knows which story it drew the claim from.
- `linkedEvidenceIds` is populated at emission time; it is never
  inferred after the fact.
- Gate 3's `draft.claim.uncited` check is a guard against a bug
  where the engine forgets to populate. In a healthy run, that
  rule never fires.

### 6.2 School claim → citation ID

- `draftGeneration` emits `sentenceIndex[]` entries with
  `classifiedAs: "school-claim"` whenever a sentence references a
  school-specific fact.
- `linkedCitationIds` must reference at least one citation whose
  `schoolScopeId` matches the draft's linked school.
- If the engine assembles a sentence from the `schoolFit` brief,
  it inherits the brief's `citationRefs[]`.
- Because `draftGeneration` runs as `authorType: "agent"`,
  Gate 3's rule split means an uncited school claim is
  **blocking**, not warning — the Gate 4 draft cannot ship
  uncited school content.

### 6.3 Unsupported / uncited claim handling

- Blocking rules from Gate 3 surface in the integrity panel with
  a "fix in place" affordance that highlights the offending
  sentence in the left pane.
- Warning rules surface with lower emphasis and an "acknowledge"
  affordance that pushes into `runStore.acknowledgements[]`.
  **Current-session only** per reviewer v0.2 — no `localStorage`,
  no `sessionStorage`. The array clears when the browser tab
  closes; refreshing the tab drops all acknowledgements. The
  applicant re-acknowledges each warning if they return.
- No draft can transition to `applicant-approved` while any
  blocking rule fires. The applicant review screen (§5.8) renders
  the transition button disabled and the panel explicitly.

### 6.4 Trace UI mechanics

- Every sentence carries a stable `sentenceId` from
  `draftSchema.sentenceIndex[].sentenceId`.
- Clicking a sentence dispatches
  `runStore.actions.focusSentence(sentenceId)`.
- Right-pane trace view resolves the linked IDs against
  `runStore.fixtures.evidenceById` / `runStore.fixtures.citationsById`.
- Every trace link opens a modal-in-place with the evidence
  narrative or citation URL (URL is display-only — no navigation
  in Gate 4).

---

## 7. Draft quality checks

Draft integrity is Gate 3's `validateDraft(...)`, run against the
Gate 4 draft in the two phases named in §3.3. Below is a mapping
from user-facing check to the Gate 3 rule that enforces it.

| User-facing check | Gate 3 rule | Severity | Phase |
|---|---|---|---|
| First-person applicant voice | `draft.placeholder.third-person` | blocking | any |
| No copied third-person evidence | `draft.copied-evidence` | warning during drafting, `draft.copied-evidence.export-block` blocking at approval | drafting / approval |
| No doNotUseTopics | `draft.doNotUseTopics.hit` | blocking | any |
| No unsupported applicant claims | `draft.claim.uncited` + `draft.unsupported.claim` | blocking | any |
| No uncited school claims (agent-authored) | `draft.school-claim.agent-uncited` | blocking | any |
| No uncited school claims (applicant-authored, if applicant-mixed voice) | `draft.school-claim.applicant-uncited` | warning | any |
| Word / char limit | `draft.wordLimit.exceeded`, `draft.charLimit.exceeded` | blocking | export |
| Underfilled draft warning | `draft.underfilled` | warning | any |
| Repeated story warning | `draft.repeated-story` | warning | any |
| Generic school-fit warning | `draft.generic-fit` | warning | any |
| Interview-defensibility (sensitive/unconfirmed) | `draft.interview-defensibility.unconfirmed-sensitive` | blocking | approval |
| Interview-defensibility (confirmed but thin) | `draft.interview-defensibility.thin` | warning | any |

**Gate 4 introduces no new draft-quality rule** — every check
lives in the Gate 3 registry and its `severity`/`phase` is
already contract-frozen.

---

## 8. Tests to add

All tests live under
`src/features/admissions/copilot/__tests__/` and follow the
existing Vitest conventions (jsdom, `@testing-library/react`,
`vitest.setup.js` fetch guard).

### 8.1 Fictional flow renders

- `flow.smoke.test.jsx` — Load `/admissions`, click "Load
  synthetic run", assert route stops on `/admissions/profile`
  showing the synthetic label. No real fetch.
- `flow.trace.test.jsx` — After running the orchestrator, click
  a claim sentence and assert the evidence trace surface renders
  the expected `evidenceId`.

### 8.2 Validation passes on the good fixture

- `flow.validation.happyPath.test.jsx` — Load the good fixture,
  run the orchestrator, snapshot the integrity report and assert
  it contains **zero blocking** violations.

### 8.3 Validation blocks on each broken fixture

One test per broken fixture from §2.9:

- MCAT over lifetime cap → attempts array rejected at fixture load.
- School with no citations → `research.citations.missing` fires
  when the user clicks "Run Copilot" and blocks the run.
- Prompt whose school isn't in the list → `prompt.school.orphan`
  disables the "Run Copilot" button.
- Draft with placeholder → `draft.placeholder.third-person`
  populates the integrity panel and blocks approval preview.
- Draft with a doNotUseTopics phrase →
  `draft.doNotUseTopics.hit` fires.
- Draft with a sentence classified as claim, no linked evidence
  → `draft.claim.uncited` fires.
- Agent draft with an uncited school claim →
  `draft.school-claim.agent-uncited` fires (**blocking**).

### 8.4 Data-shape discipline

- `flow.noRealData.test.js` — Extends `fixturesDiscipline.test.js`
  to walk the new Gate 4 fixture files, enforce
  `SYNTHETIC_FIXTURE = true`, and refuse PII patterns.
- `flow.namesAreSynthetic.test.js` — Regex-check that no fixture
  string contains a real-sounding institution name. Denylist
  (case-insensitive, word-boundary matched) per reviewer v0.2:

  ```
  Harvard, Stanford, Yale, MIT, Johns Hopkins, Duke, Columbia,
  Cornell, UCSF, UCLA, Penn, Mayo, NYU, WashU, Vanderbilt,
  Northwestern, Emory, Baylor, Mount Sinai, Michigan,
  Washington University, Case Western, Pitt, UVA, UNC,
  UT Southwestern
  ```

  Word-boundary matching prevents false positives (e.g. the
  applicant's `stateResidency: "MA"` does not match "MA"yo);
  each entry is anchored with `\b`. Extending the Gate 3.1
  rename discipline into a suite-level guard.

### 8.5 No external fetch except the mocked local health check

- `flow.noExternalFetch.test.jsx` — Wraps the run in a
  `runGuard` that fails the test if any `fetch` call other than
  `/api/admissions/health` fires. Enforces the runtime guard
  (§9.4) is on.

### 8.6 No backend mutation

- The health probe is `GET`. Gate 4 code MUST NOT emit `POST`,
  `PUT`, `PATCH`, `DELETE` to any URL. Test verifies via a
  fetch-method interceptor.

### 8.7 Evidence / citation links resolve

- `flow.traceResolves.test.js` — For every generated
  `sentenceIndex[]` entry with `linkedEvidenceIds` /
  `linkedCitationIds`, assert each ID resolves in the run's
  fixture bank.

### 8.8 Integrity checks run + interview questions generate

- `flow.integrity.test.js` — Runs the orchestrator, verifies
  the integrity report shape (per-severity buckets) and that
  the interview pack has ≥ 1 question with populated
  `sourceCitationId` and `mappedEvidenceIds[]`.

### 8.9 Agent run summary renders

- `flow.runSummary.test.jsx` — Assert the summary modal renders
  the seed, contract version, policy snapshot version, and the
  "no data left the browser tab" reassurance line.

### 8.10 Determinism / snapshot

- `orchestrator.determinism.test.js` — Runs the orchestrator
  twice with the same fixtures + seed; asserts byte-identical
  output for interpretation, story match, school fit, draft, and
  interview pack.

### 8.11 Contract still frozen

- Gate 3's `contractParityFreeze.test.js` still runs and still
  passes. Gate 4 does not touch the frozen snapshot; if any
  Gate 4 code changes the shape of a Gate 3 rule/entity, the
  freeze test fails and the change requires a new
  contract-version entry in `review-log.md`.

---

## 9. Safety guardrails

### 9.1 No production connection
`NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED` remains unset in
production. Even if the flag flipped, Gate 4 code refuses to run
outside the dev-mode gate (§9.4).

### 9.2 No migrations
Zero backend files changed. Zero `.sql`, `.prisma`, or
ORM-schema files anywhere in the diff.

### 9.3 No real applicant data
Every fixture carries `SYNTHETIC_FIXTURE = true`; the discipline
test refuses PII patterns; §8.4 adds a real-institution-name
guard. No document upload wired. No form field accepts free text
that would encourage real-data entry.

### 9.4 No external providers + runtime `runGuard`

- No new dependency added except one PRNG helper (probably a
  ~10-line local file — no npm dep).
- `runGuard.js` installs a lightweight `fetch` proxy during the
  Gate 4 orchestrator run that:
  - Allows `GET /api/admissions/health` only.
  - Throws on any other URL or method.
  - Emits a distinctive error surfaced in the integrity panel.
- The runtime guard is off in production because the whole flow
  is off in production (`NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED`
  is unset).
- In tests, the guard runs alongside the existing
  `vitest.setup.js` fetch-throw guard — belt and braces.

### 9.5 No feature flags enabled
`NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED` stays unset. Backend
`ADMISSIONS_COPILOT_ENABLED` stays unset. This PR does not
touch env config, Vercel project settings, or any deployment
value.

### 9.6 No backend changes unless separately approved
Gate 4 does not modify `mcat-study-app-backend`. The backend
mirror named in Gate 3 §4 remains unimplemented until a
separately approved Gate 5 (or later) backend PR.

### 9.7 Kill switch — `isCopilotDevModeAllowed()`

Every entry point to the Gate 4 flow — including the "Load
synthetic run" button — checks a single predicate:

```js
export function isCopilotDevModeAllowed() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED === "1"
  );
}
```

Both conditions must hold. In production (`NODE_ENV !== "development"`)
this returns `false` even if the frontend flag flipped on. The
Gate 4 synthetic run cannot render in production under any
circumstance.

**Explicitly not allowed** (per reviewer v0.2):
- URL-query overrides such as `?copilot-dev=1`.
- `sessionStorage` / `localStorage` toggles.
- `Cookie`-based dev overrides.
- Enabling `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED` in production
  or in Vercel's project env settings.

The predicate is unit-tested with all four env combinations and
against a stub `process.env` to prove production remains dark.

---

## 10. What will NOT be included

- **Real applicant trial** — no volunteer, no real cycle, no
  invited beta.
- **Persistence** — refreshing the browser drops the run. No
  localStorage, no IndexedDB, no cookies.
- **UAT schema / DB** — no separate database, no schema, no
  migrations, no seed script beyond the synthetic fixtures.
- **Production enablement** — flag stays off.
- **Model / provider integration** — no LLM, no scoring API, no
  parser-as-a-service. Sentence classifier + engines are local
  deterministic modules.
- **Document upload integration** — no file input, no `<form>`
  that accepts an uploaded document, no `multipart/form-data`.
- **Billing / entitlement wiring** — no Stripe, no
  `subscription_tier` changes, no server-side entitlement grant,
  no backend `ADMISSIONS_COPILOT_ENABLED` enable.
- **Growth Engine, mobile, backend entitlement, PostHog event
  additions specific to admissions** — untouched.

---

## 11. Deliverable summary + open questions

### 11.1 Files Gate 4 will produce (on approval)

```
src/features/admissions/copilot/
├── runOrchestrator.js
├── runStore.js
├── runGuard.js
├── constants.js
├── engines/
│   ├── promptInterpretation.js
│   ├── storyMatch.js
│   ├── schoolFit.js
│   ├── draftGeneration.js
│   ├── draftIntegrity.js
│   └── interviewQuestions.js
├── ui/
│   ├── LoadSyntheticRunButton.jsx
│   ├── RunCopilotButton.jsx
│   ├── StoryMatchPanel.jsx
│   ├── SchoolFitPanel.jsx
│   ├── DraftWorkspace.jsx
│   ├── IntegrityPanel.jsx
│   ├── InterviewPrepPanel.jsx
│   └── RunSummaryModal.jsx
└── __tests__/…
```

Plus:

- `src/features/admissions/validation/fixtures/synthetic/gate4/**`
- `src/app/(dashboard)/admissions/prompts/[promptId]/page.jsx` (new route)
- Small extensions to existing `/admissions/**` pages to render
  the panels above where relevant

### 11.2 What Gate 4 will NOT ship
- No backend, no migrations, no UAT schema
- No model / provider integration
- No document upload
- No persistence
- No feature-flag flip
- No Growth Engine / mobile / Stripe / billing

### 11.3 Open questions for the reviewer

Please confirm or redirect before Gate 4 implementation begins:

All prior open questions are resolved per reviewer v0.2:

| # | Question | Resolution |
|---|---|---|
| 1 | Dev-mode flag mechanism | Locked: `NODE_ENV === "development"` AND `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED === "1"`. No URL-query. No sessionStorage. Predicate is `isCopilotDevModeAllowed()` — see §9.7. |
| 2 | Cody workbench audit reporting | Delivered as separate document `ADMISSIONS_COPILOT_GATE4_CODY_SALVAGE_AUDIT.md` alongside this plan. |
| 3 | Synthetic-name denylist | Extended list per §8.4 below. Guard is `flow.namesAreSynthetic.test.js`. |
| 4 | Draft template shape | Sample delivered as separate document `ADMISSIONS_COPILOT_GATE4_DRAFT_TEMPLATE_SAMPLE.md`. |
| 5 | Warning-tier acknowledgement UX | `runStore.acknowledgements[]` — current session only. No `localStorage`. No `sessionStorage`. State drops on tab close, per §6.3. |

### 11.4 Timeline (estimate — for planning only)

Contingent on approval:

- runOrchestrator + engines + tests: ~3 days
- runStore + runGuard + UI panels: ~2 days
- Broken-fixture suite + name-guard test: ~0.5 day
- Documentation + review artifact: ~0.5 day

Total: ~6 working days for portal-side Gate 4 delivery. Backend
mirror, agent/provider work, and persistence remain separately
scoped efforts (Gate 5+).
