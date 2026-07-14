# Admissions Copilot — Gate 4 Cody Workbench Salvage Audit

**Status:** Pre-implementation deliverable (v0.1). Companion to
`ADMISSIONS_COPILOT_GATE4_FICTIONAL_E2E_FLOW_PLAN.md` v0.2.
**Scope:** Classify each candidate item from Cody's workbench
against the Gate 4 audit criteria so the reviewer approves the
verdicts before any Gate 4 code is written.

---

## 1. Methodology

### 1.1 Audit criteria (from plan §4.4)

Every candidate is graded against six criteria. **Every criterion
must pass** for the item to be salvaged; a single failure moves it
to either "salvage after refactor" (if the fix is mechanical) or
"rewrite" (if the fix would require rebuilding around the item).

| Criterion | Failing means |
|---|---|
| Pure function, no I/O | Fetches / files / DB / DOM writes disqualify |
| No provider / LLM / API call | Any Anthropic / OpenAI / other model API call disqualifies |
| No non-determinism | `Math.random`, `Date.now`, unstable iteration order, wallclock-dependent branches disqualify (unless refactored to accept a seed) |
| Externally governed policy read from `admissionsPolicySnapshot` | Hard-coded MCAT / AMCAS / etc. constants disqualify unless moved to the snapshot |
| No PII or real-name data in fixtures or code paths | Any `Northern`, `Harvard`, etc. — or free-text applicant PII — disqualifies |
| Produces Zod-parseable output for a Gate 3 entity | Ad-hoc object shapes disqualify unless refactored to the Gate 3 schema |

### 1.2 Verdict scheme

| Verdict | Meaning |
|---|---|
| **salvage-as-is** | Item passes every criterion. Copy the file into Gate 4 with only import-path adjustments. |
| **salvage-after-refactor** | Item fails 1–2 criteria that can be fixed with mechanical changes (renames, seed injection, imports from `admissionsPolicySnapshot`, wrapping output in a Zod schema). No architectural change. |
| **rewrite** | Item fails ≥ 3 criteria, or fails a foundational criterion (e.g. LLM call) that would require restructuring the item's purpose. Cheaper to write fresh against the Gate 3 contract than to adapt. |
| **discard** | Superseded entirely by Gate 3. The Gate 3 replacement already covers the same responsibility with more discipline. No salvage needed. |

### 1.3 Verification discipline

The verdicts below are a **predictive audit** — they classify each
candidate against the criteria based on the shape and intent
described in prior conversation history about Cody's workbench.

**Actual code inspection happens at implementation time.** For every
item:

- If the actual code passes cleanly, the verdict may move up
  (rewrite → salvage-after-refactor, or refactor → as-is). This
  is a good outcome and is silently accepted.
- If the actual code fails a criterion the audit assumed was fine,
  the verdict may move down (as-is → refactor, or refactor →
  rewrite). This is a **reportable change** — the reviewer is
  told before the item is included / excluded.

Under no circumstance does an item silently get pulled into Gate 4
that fails an audit criterion. The predicate function used at
implementation time is essentially §1.1 turned into a checklist.

---

## 2. Candidate-by-candidate verdicts

### 2.1 Prompt interpretation logic

- **Verdict:** rewrite
- **What the audit assumes Cody had:** an LLM-driven paraphraser
  that took a prompt string and returned an interpretation string
  plus a themes list. Likely used Anthropic Messages API or
  similar.
- **Why not salvage:** the LLM call fails "no provider / LLM /
  API call" — a foundational criterion. Even if the surrounding
  logic were clean, the whole item is defined by the provider
  call.
- **Gate 4 replacement:** deterministic template. Given the
  prompt category (from `PROMPT_CATEGORIES`) + the school's
  `fitAxes[]` + the applicant's key axes, emit a
  `PromptInterpretation` (matching `promptInterpretationSchema`)
  by string-templating the category's canonical rewording and
  attaching the relevant axes. No LLM. See the draft-template
  sample for the same pattern applied to draft generation.

### 2.2 Story matching

- **Verdict:** rewrite
- **What the audit assumes Cody had:** an embedding-based or
  LLM-scored ranker that took the interpretation and the
  evidence bank and returned ranked evidence.
- **Why not salvage:** embedding / LLM scoring fails "no provider"
  and "no non-determinism" (embedding APIs are deterministic in
  outputs but not without a provider call; if the ranker was
  purely local it may still have unstable tie-breaking).
- **Gate 4 replacement:** deterministic scorer. Score each
  evidence item by
  `token-overlap(interpretation.expectedThemes, tokens(evidence.narrative))`
  using the tokenizer already shipped in
  `src/features/admissions/validation/output/tokenize.js`. Add
  a small boost for evidence with `sensitivityTags: ["none"]` +
  `confirmed: true` (so integrity-clean stories rank higher).
  Tie-break with the mulberry32 seed. Output shape:
  `{ matches: Array<{ evidenceId, score, reasonCodes[] }> }`.
  Reason codes are drawn from a frozen small enum (e.g.
  `"theme:community-service"`, `"sensitivity-clean"`).

### 2.3 School-fit matching

- **Verdict:** rewrite
- **What the audit assumes Cody had:** an LLM composer that took
  a school profile + applicant profile and produced fit language
  as free-text prose.
- **Why not salvage:** the LLM composition and the free-text
  output both fail. The output shape is also unlikely to match
  the Gate 3 school-research schema; it would just have been
  free strings.
- **Gate 4 replacement:** deterministic composer.
  For each `schoolResearch.fitAxes[]` entry, look up the axis in
  a frozen `AXIS_TO_BRIEF_TEMPLATE` table (kebab-case keys → short
  sentence templates), inject the axis's `axisNotes` and one or
  more `citationRefs`, and emit a `SchoolFitBrief`:
  `{ fitStatements: [{ axisKey, brief, citationRefs[] }] }`.
  Every statement is required to attach ≥ 1 citation whose
  `schoolScopeId` matches the school. This is what feeds the
  agent-authored school claim rule in Gate 3
  (`draft.school-claim.agent-uncited`).

### 2.4 Draft generation

- **Verdict:** rewrite
- **What the audit assumes Cody had:** an LLM that wrote the
  draft prose.
- **Why not salvage:** LLM prose fails "no provider" and
  "no non-determinism." Also very unlikely that Cody's output
  populated `sentenceIndex[]` with `linkedEvidenceIds` /
  `linkedCitationIds` at emission time, which Gate 3 needs.
- **Gate 4 replacement:** deterministic template. Detailed
  sample delivered separately in
  `ADMISSIONS_COPILOT_GATE4_DRAFT_TEMPLATE_SAMPLE.md`. Every
  emitted sentence carries its `classifiedAs` + author-type +
  linked IDs from the moment of assembly; the integrity checker
  gets structured input, not a free-text blob it has to
  re-classify.

### 2.5 Interview questions

- **Verdict:** rewrite
- **What the audit assumes Cody had:** an LLM prompt-generator
  that read the school profile and produced predicted question
  strings.
- **Why not salvage:** provider + non-determinism.
- **Gate 4 replacement:** deterministic. For each
  `schoolResearch.fitAxes[]` axis, look up the axis in a frozen
  `AXIS_TO_QUESTION_TEMPLATE` map and produce a
  `predictedQuestion` with `expectedThemes[]` and
  `sourceCitationId` set to a citation on that school. Add
  question templates for each `interviewFormat` (MMI /
  traditional / panel). Cover the applicant's mapped stories via
  `mappedEvidenceIds[]`. Emitted shape matches
  `interviewPrepInputs.predictedQuestions`.

### 2.6 Evidence / citation trace utilities

- **Verdict:** salvage-after-refactor
- **What the audit assumes Cody had:** a small utility module
  that maintained a Map from `evidenceId` → evidence item and
  from `citationId` → citation, plus a lookup / hover-preview
  helper. Likely pure JS with no provider dependency.
- **Why not as-is:** two mechanical refactors needed:
  1. Rename fields to match the Gate 3 schema (`schoolScopeId`,
     `usedForCurrentCycleRequirement`, `sensitivityTags`, etc.).
  2. Wrap the Map builder in a Zod parse pass so the resulting
     lookups are guaranteed to hold Gate 3-shaped objects.
- **After refactor:** the module becomes
  `src/features/admissions/copilot/runStore.js` helpers
  (`buildEvidenceIndex`, `buildCitationIndex`). No new algorithm;
  just index-by-ID.

### 2.7 Validation helpers

- **Verdict:** discard
- **What the audit assumes Cody had:** ad-hoc range checks
  (e.g. `if (score < 118 || score > 132)`), placeholder-detection
  regexes, and hand-written "does this look like a claim" heuristics.
- **Why discard:** every one of these is superseded by Gate 3's
  Zod schemas + `rules.js` + `output/draftValidator.js` /
  `output/draftClassifier.js`. Salvaging the older versions
  would create two authoritative sources — exactly what the
  Gate 3 §5 contract-source-of-truth work was designed to
  prevent. Discard them; use the Gate 3 modules directly.

### 2.8 Tests

- **Verdict:** discard
- **What the audit assumes Cody had:** unit tests written against
  the Cody workbench's ad-hoc shapes (e.g. `assert(interp.themes.length > 0)`),
  possibly using a different test framework and no Zod.
- **Why discard:** Gate 3 established the test conventions
  (`vitest`, `@testing-library/react`, `fixtures/synthetic/`
  discipline, `SYNTHETIC_FIXTURE=true` marker,
  `fixturesDiscipline.test.js`, contract parity + freeze suites).
  Any Cody test that "passes" against the wrong shape is a
  liability. Gate 4 writes fresh tests per the plan §8 catalog
  against the Gate 3 shapes.
- **Note:** any Cody test whose *ideas* are still valuable
  (e.g. a specific adversarial input the test invented) can be
  rewritten as a Gate 4 test case. The discard is of the test
  *code*, not the coverage *intent*.

---

## 3. Summary table

| # | Candidate | Verdict | Fixable with mechanical refactor? |
|---|---|---|---|
| 2.1 | Prompt interpretation logic | rewrite | No (foundational LLM dep) |
| 2.2 | Story matching | rewrite | No (foundational LLM/embedding dep) |
| 2.3 | School-fit matching | rewrite | No (foundational LLM dep) |
| 2.4 | Draft generation | rewrite | No (foundational LLM dep + shape mismatch) |
| 2.5 | Interview questions | rewrite | No (foundational LLM dep) |
| 2.6 | Evidence / citation trace utilities | salvage-after-refactor | Yes (rename + Zod parse) |
| 2.7 | Validation helpers | discard | N/A (superseded by Gate 3) |
| 2.8 | Tests | discard | N/A (shape mismatch; ideas may be reused) |

**Net:** 5 rewrites, 1 refactored salvage, 2 discards, 0 as-is.
This is expected — Cody's workbench predates Gate 3's Zod-first
contract discipline and predates the "no provider, deterministic
only" Gate 4 posture, so most of the substantive engines have to be
rebuilt against the new contract even if the ideas transfer.

---

## 4. Reviewer decisions requested

Please confirm or redirect any of the following before implementation:

1. **Verdicts** — do any of the 8 classifications look wrong?
   If any single verdict should move up or down a bucket, name
   the item and the target bucket.
2. **Discard-of-Cody-tests policy** — the plan discards Cody's
   test *code* but reuses any adversarial ideas as Gate 4 tests.
   Confirm that's acceptable, or state a different policy (e.g.
   "port every non-provider test verbatim").
3. **§2.6 refactor scope** — the trace utilities need renaming +
   Zod wrapping. If Cody's shape is closer than the audit assumes,
   we may salvage-as-is instead. That would be a reportable change
   at implementation time; confirm that's the right threshold.
4. **New enum tables** — the deterministic engines introduce a
   handful of small frozen enum tables (axis-to-brief templates,
   axis-to-question templates, reason-code enums). These do NOT
   go into `admissionsPolicySnapshot` (which is for externally
   governed limits) — they live in
   `src/features/admissions/copilot/constants.js`. Confirm that's
   the right partition.
