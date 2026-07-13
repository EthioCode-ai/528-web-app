# Admissions Copilot — Gate 3 Validation Contract Plan

**Status:** Draft — awaiting reviewer approval before implementation
**Scope:** Portal-side validation contract for Admissions Copilot inputs and outputs
**Non-scope:** UI expansion, real applicant trials, migrations, agent execution, Gate 4

Gate 2 shipped an inert shell and a dark-preview flag. Gate 3 defines
the **validation contract** that both the portal and the backend must
honor before any real applicant data or agent execution is wired up.
Nothing in this plan is implemented until reviewer approval.

---

## Table of Contents

1. [Portal-side validation schemas](#1-portal-side-validation-schemas)
2. [User-facing validation messages](#2-user-facing-validation-messages)
3. [Blocking vs warning vs informational classification](#3-blocking-vs-warning-vs-informational-classification)
4. [Backend validation mirror](#4-backend-validation-mirror)
5. [Contract source of truth (drift prevention)](#5-contract-source-of-truth-drift-prevention)
6. [Draft / output validation](#6-draft--output-validation)
7. [Test plan](#7-test-plan)
8. [Scope restrictions](#8-scope-restrictions)
9. [Deliverable summary + open questions](#9-deliverable-summary--open-questions)

---

## 1. Portal-side validation schemas

Each entity below is described as: **identity**, **required fields**,
**value constraints**, **cross-entity constraints**. The proposed
schema representation is **Zod** on the portal (Next.js) because it
composes cleanly with React Hook Form and produces machine-readable
JSON Schema for backend parity (§5).

Entities are grouped by lifecycle phase. Every entity carries an
`entityVersion` field so contract changes can be tracked forward.

### 1.1 applicant profile
- **Identity:** `applicantId` (UUID, portal-generated), `entityVersion`
- **Required fields:**
  - `legalNameFirst`, `legalNameLast` — strings, 1–100 chars each
  - `pronouns` — enum {`he/him`, `she/her`, `they/them`, `other`, `prefer-not-to-say`}, other requires `pronounsOther` string
  - `contactEmail` — RFC-5322 shape, ≤254 chars
  - `citizenshipStatus` — enum {`US-citizen`, `US-permanent-resident`, `DACA`, `international`, `other`}
  - `applicationCycle` — YYYY–YYYY string, cycle-window guard
- **Cross-entity:** none

### 1.2 academic metrics
- **Identity:** `applicantId` FK (1:1)
- **Required fields:**
  - `cumulativeGPA` — number in [0.0, 4.0], two decimal places
  - `scienceGPA` (BCPM) — number in [0.0, 4.0]
  - `postbacGPA` — optional number in [0.0, 4.0]
  - `gpaTrend` — enum {`upward`, `flat`, `downward`, `insufficient-data`}
  - `transcriptCount` — integer ≥ 1
- **Cross-entity:** none

### 1.3 MCAT scores
- **Identity:** `mcatAttemptId` (UUID), `applicantId` FK
- **Required fields:**
  - `testDate` — ISO date, must be within last 4 years (AAMC validity)
  - `totalScore` — integer in [472, 528]
  - `cpbsScore` (Chem/Phys) — integer in [118, 132]
  - `carsScore` — integer in [118, 132]
  - `bbfnScore` (Bio/Biochem) — integer in [118, 132]
  - `psbbScore` (Psych/Soc) — integer in [118, 132]
  - `voided` — boolean; if true, other scores must be null
- **Cross-field rule:** `totalScore = cpbsScore + carsScore + bbfnScore + psbbScore` (must match exactly)
- **Multiplicity:** ≤ 4 attempts (AAMC lifetime cap)

### 1.4 AAMC PREview score
- **Identity:** `applicantId` FK (1:many by cycle)
- **Required fields:**
  - `score` — integer in [1, 9]
  - `testDate` — ISO date
  - `applicationCycle` — YYYY–YYYY
- **Cross-entity:** none

### 1.5 experience hours
- **Identity:** `activityId` FK (1:1 with an activity)
- **Required fields:**
  - `hoursTotal` — integer ≥ 0, ≤ 100,000 (sanity ceiling)
  - `startDate`, `endDate` — ISO dates; endDate ≥ startDate; endDate ≤ application submission date
  - `hoursByYear` — map YYYY → integer ≥ 0; sum must equal `hoursTotal` ± 5 (rounding tolerance)
  - `frequency` — enum {`weekly`, `monthly`, `sporadic`, `one-time`}
- **Cross-entity:** none

### 1.6 applicant activities
- **Identity:** `activityId` (UUID), `applicantId` FK
- **Required fields:**
  - `experienceType` — AMCAS 16-category enum (Research, Clinical, Community Service — Medical/Community, etc.)
  - `title` — string, 1–100 chars
  - `organization` — string, 1–200 chars
  - `description` — string, ≤ **700 chars** (AMCAS limit)
  - `isMostMeaningful` — boolean; **≤ 3 total** most-meaningful across the applicant
  - `mostMeaningfulEssay` — required IFF `isMostMeaningful`, ≤ **1325 chars** (AMCAS limit)
- **Multiplicity:** ≤ 15 activities per applicant (AMCAS cap)
- **Cross-entity:**
  - Must link to ≥ 1 evidence bank item (§1.7) before the activity can be marked "ready-for-draft-use"

### 1.7 evidence / story bank
- **Identity:** `evidenceId` (UUID), `applicantId` FK
- **Required fields:**
  - `title` — string, 1–150 chars
  - `narrative` — string, 1–3000 chars (portal-side working space; drafts pull from this)
  - `evidenceType` — enum {`clinical-encounter`, `research-outcome`, `community-impact`, `leadership-decision`, `personal-inflection`, `academic-achievement`, `mentorship-given`, `mentorship-received`, `service-hours`, `other`}
  - `sourceType` — enum {`applicant-authored`, `letter-of-recommendation`, `transcript`, `publication`, `award-doc`, `other`}
  - `confirmed` — boolean (default false); becomes true only when the applicant explicitly confirms via a confirmation action
  - `sensitivityTags` — array of enum {`patient-info`, `mental-health-self`, `mental-health-other`, `legal`, `family-medical`, `identity-first-person`, `none`}
  - `activityLinks` — array of `activityId` refs (may be empty)
  - `dateRange` — {startDate, endDate} ISO dates or `ongoing` sentinel
- **Cross-entity constraint:** `activityLinks[].activityId` must all resolve to activities on the same applicant

### 1.8 school list
- **Identity:** `schoolListEntryId` (UUID), `applicantId` FK
- **Required fields:**
  - `aamcSchoolId` — canonical MSAR ID (integer); enforced against a bundled MSAR ID snapshot
  - `schoolName` — string (derived, but validated against MSAR snapshot)
  - `applicationType` — enum {`MD`, `MD-PhD`, `DO`}
  - `tier` — enum {`reach`, `target`, `likely`, `safety`} (self-classification; informational only)
  - `secondaryReceived` — boolean (default false)
- **Multiplicity:** 1–40 entries (defensible ceiling; AAMC average is ~17)

### 1.9 school research
- **Identity:** `schoolResearchId`, `schoolListEntryId` FK (1:1)
- **Required fields:**
  - `fitAxes` — array of {`axisKey` enum, `axisNotes` string}, min 1 axis before school-fit matching
  - `keyPrograms` — array of strings (curriculum tracks, dual-degree opts, etc.)
  - `citationRefs` — array of `citationId` (§1.10), **≥ 1 required** before school-fit matching can run
  - `updatedAt` — ISO timestamp; **staleness warning** at 90 days
- **Cross-entity constraint:** every `citationRefs[].citationId` must exist in `citations` table for the same applicant AND its `schoolScopeId` must match this school

### 1.10 citations
- **Identity:** `citationId` (UUID), `applicantId` FK
- **Required fields:**
  - `sourceType` — enum {`aamc-msar`, `school-website`, `school-viewbook`, `school-publication`, `podcast`, `news-article`, `journal-article`, `other`}
  - `url` — URL string (http/https), or `offlineDoc` boolean=true with `docTitle`
  - `retrievedAt` — ISO timestamp
  - `verifierNote` — string (portal user's own note about what this source establishes)
  - `schoolScopeId` — nullable `aamcSchoolId`; if null, citation is applicant-general (evidence bank support)
- **Cross-entity:** none

### 1.11 secondary prompts
- **Identity:** `promptId` (UUID), `schoolListEntryId` FK
- **Required fields:**
  - `promptText` — string, 1–2000 chars
  - `wordLimit` — nullable integer ≥ 25
  - `charLimit` — nullable integer ≥ 100
  - `category` — enum {`why-us`, `diversity`, `challenge`, `mission-fit`, `leadership`, `research`, `service`, `covid`, `pandemic-impact`, `optional-additional`, `other`}
  - `sourceCitationId` — REQUIRED reference to a citation of type `school-website|school-viewbook|school-publication` proving the prompt exists
  - `retrievedAt` — ISO timestamp; **staleness warning** at 60 days (cycle sensitive)
- **Cross-entity:** at least one of `wordLimit` or `charLimit` must be present

### 1.12 prompt interpretations
- **Identity:** `interpretationId` (UUID), `promptId` FK (1:1)
- **Required fields:**
  - `interpretation` — string, 50–1500 chars (applicant's own paraphrase)
  - `keyAxes` — array of enum matching `fitAxes.axisKey`; ≥ 1
  - `expectedThemes` — array of string tags, ≥ 1
  - `confirmed` — boolean (applicant confirms the interpretation is accurate)
- **Cross-entity:** `keyAxes` must be a subset of the axes covered by the linked school's `fitAxes` (§1.9)

### 1.13 drafts
- **Identity:** `draftId` (UUID), `promptId` FK
- **Required fields:**
  - `draftText` — string
  - `wordCount`, `charCount` — computed
  - `evidenceCitations` — array of `evidenceId` (§1.7), **≥ 1 required** (see §6)
  - `schoolCitations` — array of `citationId` (§1.10) whose `schoolScopeId` matches, **≥ 1 required** for school-specific claims
  - `draftStatus` — enum {`in-progress`, `ready-for-review`, `applicant-approved`}
  - `versionNumber` — integer ≥ 1
- **Cross-entity constraints:**
  - `wordCount ≤ promptId.wordLimit` (blocking) if wordLimit set
  - `charCount ≤ promptId.charLimit` (blocking) if charLimit set
  - Every `evidenceCitations[]` id must resolve to a `confirmed=true` evidence item
  - No text spans allowed that match §6 forbidden markers

### 1.14 interview-prep inputs
- **Identity:** `interviewPrepId` (UUID), `schoolListEntryId` FK (1:1)
- **Required fields:**
  - `interviewFormat` — enum {`MMI`, `traditional`, `panel`, `hybrid`, `unknown`}
  - `storyIds` — array of `evidenceId`; ≥ 3 recommended (warning if <3)
  - `predictedQuestions` — array of {questionText, sourceCitationId, expectedThemes[]}
  - `personalAntiExamples` — array of `evidenceId` marked as "do-not-lead-with"
- **Cross-entity:** every `storyIds[]` must be confirmed=true

### 1.15 doNotUseTopics
- **Identity:** `topicId` (UUID), `applicantId` FK
- **Required fields:**
  - `topicKey` — short slug (kebab-case), 1–60 chars
  - `description` — string, 5–500 chars (what the topic is)
  - `rationale` — string, 5–500 chars (why the applicant excludes it)
  - `matchPatterns` — array of case-insensitive substrings/regexes (portal will refuse to emit these in any draft output — see §6)
  - `scope` — enum {`all-schools`, `specific-school-list`}, if specific requires `scopedSchoolIds[]`
- **Cross-entity:** `scopedSchoolIds[]` must exist in school list

### 1.16 key decision points
- **Identity:** `decisionId` (UUID), `applicantId` FK
- **Required fields:**
  - `phase` — enum {`school-list-selection`, `secondary-strategy`, `draft-approach`, `interview-strategy`, `final-decision`}
  - `decisionSummary` — string, 20–1000 chars
  - `rationale` — string, 20–2000 chars
  - `linkedEvidence` — array of `evidenceId`
  - `linkedCitations` — array of `citationId`
  - `revisitedFromDecisionId` — nullable self-ref
  - `decidedAt` — ISO timestamp
- **Cross-entity:** none beyond the ref types

### 1.17 field-level normalization rules

- **All strings:** NFKC unicode normalize, trim leading/trailing whitespace, collapse internal ≥ 2 whitespace to a single space
- **All URLs:** must be `https:` unless the citation is explicitly `offlineDoc`
- **All ISO dates:** `YYYY-MM-DD`; timestamps `YYYY-MM-DDTHH:MM:SSZ` in UTC
- **All enums:** validated against a single frozen constant table shared with the backend contract (§5)
- **All IDs:** UUID v4 unless the field name says otherwise (e.g. `aamcSchoolId` is an MSAR integer)

---

## 2. User-facing validation messages

Format: `{ ruleId, message, target UI surface }`. Messages are
kept short and directive; the surface column names the component
where the message is shown (Toast, InlineFieldError, BlockingModal,
BannerAtSurface). All messages are English-only in Gate 3; i18n is
out of scope.

### 2.1 Numeric-range rules

| ruleId | message | surface |
|---|---|---|
| `mcat.total.range` | MCAT total must be between 472 and 528. | InlineFieldError |
| `mcat.section.range` | Each MCAT section score must be between 118 and 132. | InlineFieldError |
| `mcat.sum-mismatch` | MCAT total ({total}) must equal the sum of the four section scores ({sum}). | InlineFieldError |
| `mcat.date.stale` | MCAT scores older than 4 years may not be accepted by schools you are applying to. | Warning banner |
| `mcat.attempts.exceeded` | AAMC lifetime cap is 4 attempts. Remove or void an earlier attempt. | InlineFieldError |
| `mcat.voided.contradiction` | A voided attempt cannot have section scores. | InlineFieldError |
| `preview.range` | AAMC PREview score must be between 1 and 9. | InlineFieldError |
| `gpa.range` | GPA must be between 0.00 and 4.00. | InlineFieldError |
| `gpa.sgpa.range` | Science GPA (BCPM) must be between 0.00 and 4.00. | InlineFieldError |
| `experience.hours.negative` | Total hours cannot be negative. | InlineFieldError |
| `experience.hours.ceiling` | Total hours over 100,000 is not accepted. Please recheck your entry. | InlineFieldError |
| `experience.hours.year-sum` | Yearly hours ({sum}) do not match total ({total}). | InlineFieldError |
| `activity.description.limit` | Activity description exceeds the 700-character AMCAS limit ({current}/700). | CharCounter |
| `activity.mostMeaningful.essay.limit` | Most-meaningful essay exceeds the 1325-character AMCAS limit ({current}/1325). | CharCounter |
| `activity.mostMeaningful.cap` | You may mark at most 3 activities as most meaningful. | InlineFieldError |
| `activity.count.cap` | AMCAS allows at most 15 activities. | BlockingModal |
| `schoolList.count.cap` | School list has {n} entries — please reduce to at most 40. | InlineFieldError |

### 2.2 Reference / cross-entity rules

| ruleId | message | surface |
|---|---|---|
| `prompt.school.orphan` | This prompt references a school that is not in your school list. | BannerAtSurface |
| `interpretation.axis.mismatch` | This interpretation lists an axis ({axis}) that isn't part of the school's fit axes. | InlineFieldError |
| `research.citations.missing` | Each school must include at least one citation before school-fit matching can run. | BannerAtSurface |
| `prompt.source-citation.missing` | Each secondary prompt must reference a citation proving where the prompt was retrieved. | InlineFieldError |
| `draft.evidence.missing` | Draft must cite at least one evidence item before it can be exported. | BannerAtSurface |
| `draft.school-citation.missing` | Draft contains school-specific claims but no school citations — add sources or soften the claim. | BannerAtSurface |
| `draft.evidence.unconfirmed` | This evidence item is marked unconfirmed, so it cannot be used in a draft yet. | InlineCitationBadge |
| `draft.evidence.orphan` | Draft cites an evidence ID that no longer exists in your bank. | BlockingModal |
| `draft.citation.orphan` | Draft cites a school-citation ID that no longer exists. | BlockingModal |
| `interview.stories.min` | We recommend prepping at least 3 stories per school. | Warning banner |
| `evidence.activity.orphan` | This evidence links to an activity that no longer exists. | InlineFieldError |
| `doNotUseTopics.scope.orphan` | This do-not-use topic is scoped to a school not in your list. | InlineFieldError |

### 2.3 Freshness / staleness rules

| ruleId | message | surface |
|---|---|---|
| `research.stale` | School research for {schoolName} was last updated {n} days ago. Consider refreshing. | Warning banner |
| `prompt.stale` | This prompt was retrieved {n} days ago — verify the school still uses this wording. | Warning banner |
| `citation.stale` | Citation is older than 12 months. | Informational tag |

### 2.4 Draft output rules (surfaces are all `DraftValidationPanel`)

See §6 for full rule detail; user-facing messages are:

| ruleId | message |
|---|---|
| `draft.claim.uncited` | This applicant claim is not tied to any evidence ID. |
| `draft.school-claim.uncited` | This school-specific claim is not tied to any school citation. |
| `draft.doNotUseTopics.hit` | Draft contains language matching a do-not-use topic: "{topic}". |
| `draft.placeholder.third-person` | Draft contains "the applicant" / "fictional applicant" — this must be rewritten in first person. |
| `draft.copied-evidence` | Draft contains text copied verbatim from the evidence description — rewrite in your own words. |
| `draft.wordLimit.exceeded` | Draft is {n} words over the {limit}-word prompt limit. |
| `draft.charLimit.exceeded` | Draft is {n} characters over the {limit}-character prompt limit. |
| `draft.underfilled` | Draft is only {pct}% of the available length — consider adding depth. |
| `draft.repeated-story` | You have used this evidence in {n} other drafts already this cycle. |
| `draft.generic-fit` | The school-fit language reads generic — cite a specific program, faculty, or curricular feature. |
| `draft.interview-defensibility` | This claim will be hard to defend in an MMI or traditional interview without a source. |

### 2.5 Sensitivity rules

| ruleId | message |
|---|---|
| `evidence.sensitivity.unconfirmed` | This evidence has a sensitivity tag ({tag}) — please confirm before allowing it in drafts. |
| `evidence.sensitivity.patient-info` | This evidence appears to contain patient-identifiable information. Please redact before continuing. |

---

## 3. Blocking vs warning vs informational classification

Rules are classified into three tiers. **Blocking** rules prevent
export/run; **warning** rules allow continuation but surface a
prominent notice; **informational** rules are guidance only.

### 3.1 Blocking rules
- All numeric-range violations in §2.1 (MCAT, PREview, GPA ranges)
- `mcat.sum-mismatch`
- `activity.description.limit` (700 chars) at export
- `activity.mostMeaningful.essay.limit` at export
- `activity.mostMeaningful.cap` (3)
- `activity.count.cap` (15)
- `draft.wordLimit.exceeded`
- `draft.charLimit.exceeded`
- `draft.evidence.missing`
- `draft.evidence.unconfirmed` — cannot include unconfirmed evidence
- `draft.evidence.orphan` and `draft.citation.orphan`
- `draft.doNotUseTopics.hit`
- `draft.placeholder.third-person`
- `evidence.sensitivity.patient-info`
- `research.citations.missing` (blocks school-fit matching only; does not block draft in-progress)
- `prompt.source-citation.missing` (blocks secondary strategy run only)
- `interpretation.axis.mismatch`
- `schoolList.count.cap` (soft ceiling; blocks export)

### 3.2 Warning rules
- `mcat.date.stale`
- `research.stale`
- `prompt.stale`
- `draft.school-claim.uncited` — warns unless the draft author explicitly acknowledges "no citations needed for this claim" (audit-logged, still surfaced)
- `draft.underfilled`
- `draft.repeated-story`
- `draft.generic-fit`
- `draft.interview-defensibility`
- `evidence.sensitivity.unconfirmed`
- `interview.stories.min`
- `draft.copied-evidence` — warning at first pass, blocking if unresolved at export
- `schoolList.tier.imbalance` — informational skew warning (heavy reach with no safeties, etc.)

### 3.3 Informational rules
- `citation.stale` (>12 months)
- `applicant.profile.pronounsOther.missing-followup`
- `schoolList.tier.distribution` — panel showing reach/target/safety split
- `activity.hourBreakdown.byYear.missing` — allowed but flagged
- `preview.optional-cycle` — some schools don't require PREview; informational tag

### 3.4 Machine-readable summary

Each rule will carry a `severity` field in the schema module:

```
{
  ruleId: "mcat.total.range",
  severity: "blocking" | "warning" | "informational",
  scope: "field" | "entity" | "cross-entity" | "output",
  target: [entityKey], // one or more
  message: "...",
  metadataTemplate: { ... } // interpolation slots
}
```

The registry lives at
`src/features/admissions/validation/rules.js` (new, Gate 3
implementation) as a single frozen object. No rule is defined
outside this file.

---

## 4. Backend validation mirror

The backend gate (§4 of the master integration plan) is
authoritative on entitlement; the backend validators are
authoritative on data integrity. The portal validators MUST NOT
be treated as sufficient — any input from the portal is
untrusted by the backend.

### 4.1 Rules that MUST be mirrored in the backend

All rules in §3.1 (blocking) plus the following §3.2 warnings
that carry integrity implications:

| Portal ruleId | Backend responsibility |
|---|---|
| `mcat.total.range`, `mcat.section.range`, `mcat.sum-mismatch`, `mcat.attempts.exceeded`, `mcat.voided.contradiction` | Reject at API boundary |
| `preview.range`, `gpa.range`, `gpa.sgpa.range` | Reject at API boundary |
| `experience.hours.year-sum`, `experience.hours.negative`, `experience.hours.ceiling` | Reject at API boundary |
| `activity.description.limit`, `activity.mostMeaningful.essay.limit`, `activity.mostMeaningful.cap`, `activity.count.cap` | Reject at API boundary |
| `schoolList.count.cap` | Reject at API boundary |
| `draft.evidence.unconfirmed`, `draft.evidence.orphan`, `draft.citation.orphan` | Reject at draft-persistence boundary |
| `draft.evidence.missing`, `draft.school-citation.missing` (draft.status transitions to `applicant-approved` only when satisfied) | Reject on status transition |
| `draft.doNotUseTopics.hit` | Reject on status transition to `ready-for-review` |
| `draft.placeholder.third-person`, `draft.copied-evidence` | Reject on status transition to `applicant-approved` |
| `interpretation.axis.mismatch` | Reject at persistence |
| `prompt.source-citation.missing` | Reject at persistence |
| `research.citations.missing` | Reject at `run-school-fit` endpoint |
| `evidence.sensitivity.patient-info` | Reject at persistence |
| `evidence.activity.orphan`, `doNotUseTopics.scope.orphan` | Reject at persistence |
| Freshness rules (`research.stale`, `prompt.stale`) | **NOT** enforced backend-side; surfaced as read-only metadata. Backend records `updatedAt` and the portal derives staleness. |

### 4.2 Target file (backend)

Per the reviewer's brief, mirrored rules will eventually live at:

`mcat-study-app-backend/domains/admissions/lib/validators.js`

with a companion registry `admissions/lib/rules.js` mirroring the
portal's shape:

```
{
  ruleId, severity, scope, target, message, metadataTemplate
}
```

Backend enforcement points:

- `POST /api/admissions/applicant/profile`
- `POST/PUT /api/admissions/applicant/metrics`
- `POST/PUT /api/admissions/applicant/mcat`
- `POST/PUT /api/admissions/applicant/preview`
- `POST/PUT /api/admissions/applicant/activities/:id`
- `POST/PUT /api/admissions/applicant/evidence/:id`
- `POST/PUT /api/admissions/applicant/school-list/:id`
- `POST/PUT /api/admissions/applicant/school-research/:id`
- `POST/PUT /api/admissions/applicant/citations/:id`
- `POST/PUT /api/admissions/applicant/prompts/:id`
- `POST/PUT /api/admissions/applicant/interpretations/:id`
- `POST/PUT /api/admissions/applicant/drafts/:id`
- `POST /api/admissions/applicant/drafts/:id/transition` (status transition guard)
- `POST /api/admissions/school-fit/run` (uses `research.citations.missing`)

### 4.3 What backend does with a portal rule violation

- **HTTP 422 Unprocessable Entity** with a stable body shape:
  ```
  { error: "validation", violations: [ { ruleId, target, message, metadata } ] }
  ```
- Backend does **NOT** rely on the portal's message strings — it emits
  its own copy of the message from its rules registry. §5 keeps the
  two message tables in parity via generated JSON schema.

### 4.4 Implementation timing

Backend changes are OUT OF SCOPE for Gate 3. This section names the
target file and endpoint list only, so the portal contract is
authored with backend parity in mind. Backend PRs will be opened
separately after Gate 3 approval and a distinct backend-scope
approval.

---

## 5. Contract source of truth (drift prevention)

The portal and backend must not drift. The three options considered
and the recommendation:

### 5.1 Option A — shared schema package

A `@528ai/admissions-validation` npm package published to a private
registry, imported by both portal and backend.

- **Pros:** single source of truth; type-safe; version-pinned; changes
  are visible in git history of the shared package.
- **Cons:** requires publishing infrastructure the org does not yet
  have; backend is Python, not Node — cross-language import needs an
  extra codegen step; introduces a coordination dance for every rule
  change.
- **Verdict:** correct end-state, wrong Gate 3 tool. Defer to Gate 5+.

### 5.2 Option B — generated JSON Schema

The portal is authoritative; a build step emits JSON Schema
(`admissions.schema.json`) checked into both repos. Backend loads it
and enforces via a JSON Schema library.

- **Pros:** cross-language safe; auditable diffs; deterministic; no
  publishing infra.
- **Cons:** generation must be re-run and committed on every change; a
  contributor who forgets loses parity; JSON Schema does not natively
  express every cross-entity rule (need custom keywords or side
  scripts).
- **Verdict:** strong candidate for Gate 4+, but non-trivial today.

### 5.3 Option C — duplicated schemas with parity tests

Both sides own their own schemas. A **contract snapshot** file
(`admissions.contract.json`) lists {ruleId, severity, scope, target,
metadataTemplate, messageTemplate}. Both repos import this JSON at
build time and their test suites verify the local schema matches
the snapshot. Any drift fails CI.

- **Pros:** minimal infra; each repo keeps native ergonomics (Zod on
  portal, custom validators on backend); parity is enforced by
  tests, not by build coupling; the snapshot is a small,
  human-readable artifact.
- **Cons:** double authoring of the rule bodies (small — rules are
  short); requires discipline to update the snapshot when adding a
  rule.
- **Verdict:** **RECOMMENDED for Gate 3**.

### 5.4 Contract snapshot proposal

`admissions.contract.json` (checked into 528-web-app, mirrored via CI
to 528-backend during Gate 4):

```
{
  "contractVersion": "gate3-2026-07",
  "entities": { ... entity shape summaries ... },
  "rules": [
    {
      "ruleId": "mcat.total.range",
      "severity": "blocking",
      "scope": "field",
      "target": ["mcat.totalScore"],
      "message": "MCAT total must be between 472 and 528.",
      "metadataTemplate": {}
    },
    ...
  ]
}
```

Parity tests (Gate 3 portal, Gate 4 backend):

- `contract.parity.test.js` — imports the snapshot and every locally
  defined rule; asserts every snapshot rule has a matching local rule
  and vice versa (by `ruleId`), with the same `severity`, `scope`,
  and message template.
- `contract.freeze.test.js` — asserts the snapshot is byte-identical
  to the generated version (drift check).
- `contract.review-log.md` — every version bump requires a review-log
  entry naming the rule change and reviewer.

### 5.5 Deprecation & migration policy

- Rules are never silently removed. A removed rule is retained in the
  snapshot with `deprecated: true` and a `deprecatedAt`, then removed
  in a later contract version once both sides are migrated.
- Severity may only tighten between contract versions (informational
  → warning → blocking); loosening a rule requires a documented
  reviewer note.

---

## 6. Draft / output validation

Output rules apply to `drafts.draftText` and to any generated
output (interview cheatsheets, prompt strategies, etc.). All output
validation runs client-side at portal display AND server-side at
persistence (backend parity, §4).

### 6.1 Citation rules

- **`draft.claim.uncited`** — every applicant claim (a sentence that
  makes a factual assertion about the applicant's experience,
  identity, or history) MUST reference an `evidenceId`. Detection
  strategy: draft editor requires the applicant to attach ≥ 1
  evidenceId to each sentence flagged as a claim (portal UX);
  detection heuristics list a proposed sentence-classifier axis in
  §6.5.
- **`draft.school-claim.uncited`** — every school-specific claim (a
  sentence naming the school, a program, faculty, or feature) MUST
  reference a `citationId` whose `schoolScopeId` matches the draft's
  prompt's school. Same attachment UX pattern.

### 6.2 Forbidden content rules

- **`draft.doNotUseTopics.hit`** — no substring/regex from any
  `doNotUseTopics.matchPatterns` (§1.15) may appear in the draft.
  Case-insensitive match. Blocks status transition.
- **`draft.unsupported.claim`** — a sentence flagged as a claim that
  lacks any linked evidence at export time. Blocking.
- **`draft.copied-evidence`** — draft text must not contain a
  contiguous 15-word span identical to an evidence bank
  `narrative`. Warns at first pass, blocks at export.
- **`draft.placeholder.third-person`** — the strings "the applicant",
  "fictional applicant", "[applicant name]", "TBD", and any string
  matching `/\[[^\]]{1,40}\]/` (bracket placeholder) in the draft
  block status transition to `applicant-approved`.

### 6.3 Length rules

- **`draft.wordLimit.exceeded`** — `wordCount > promptId.wordLimit`
  blocks export. Word count = whitespace-separated tokens after
  normalization.
- **`draft.charLimit.exceeded`** — `charCount > promptId.charLimit`
  blocks export.
- **`draft.underfilled`** — warns if `wordCount < 0.6 * wordLimit`
  (or `charCount < 0.6 * charLimit`). Informational-plus-warning.

### 6.4 Story-hygiene rules

- **`draft.repeated-story`** — the same `evidenceId` cited in more
  than 2 drafts this cycle triggers a warning. The portal maintains a
  reverse index `evidenceUsageMap: evidenceId → [draftId]`.
- **`draft.generic-fit`** — the school-fit paragraph of a draft is
  scored against a simple heuristic (no school name mentioned, no
  program name mentioned, no citation attached, entire paragraph
  paraphrases the school's own mission statement verbatim). Warning.
- **`draft.interview-defensibility`** — a claim that lacks a source
  and cannot be traced to an evidence item that the applicant has
  themselves authored triggers this warning. It is a check on the
  applicant's ability to defend the claim under MMI questioning.

### 6.5 Sentence classification (portal-only for Gate 3)

To decide which sentences are "claims", Gate 3 will ship a
lightweight rule-based classifier — **no external LLM, no external
API**. Heuristics:

- **Applicant claim heuristic:** sentence uses first-person subject
  ("I", "my", "we") AND contains a verb of experience/action
  ("led", "founded", "researched", "volunteered", "shadowed",
  "presented", "authored", etc.) OR contains a quantitative claim
  ("N hours", "N patients", "N publications").
- **School claim heuristic:** sentence contains the applicant's target
  school name OR a program name from `school-research.keyPrograms`
  OR a faculty name registered in the applicant's `citations`
  `verifierNote`.

The classifier is intentionally over-cautious: false positives (the
applicant is asked to attach a citation to a sentence that doesn't
strictly need one) are acceptable. False negatives (a claim
sneaks through uncited) are not. Gate 3 test plan (§7) includes
adversarial sentences to keep the recall bar honest.

### 6.6 Rejection / correction affordances

For every blocking rule the portal offers three affordances:

- **Fix in place** — the portal opens the field/sentence with the
  problem highlighted.
- **Override with rationale** — for warning-tier rules only; a
  free-text rationale is recorded in `draftAuditLog[]` and displayed
  next to the draft. Blocking rules have no override.
- **Save as draft-in-progress** — always allowed; the draft status
  simply cannot advance until the blocking issues are resolved.

---

## 7. Test plan

All tests are portal-side and run under the existing Vitest harness.
No test uses real applicant data — every fixture is synthetic and
tagged `SYNTHETIC_FIXTURE=true`. No test hits a real backend.

### 7.1 Numeric-range tests

| test | fixture | expected |
|---|---|---|
| MCAT total = 471 | mcat: {total:471, ...} | blocking, message = `mcat.total.range` copy |
| MCAT total = 529 | mcat: {total:529, ...} | blocking |
| MCAT total = 472 (boundary) | mcat: {total:472, cpbs:118, cars:118, bbfn:118, psbb:118} | accepted |
| MCAT total = 528 (boundary) | mcat: {total:528, cpbs:132, cars:132, bbfn:132, psbb:132} | accepted |
| MCAT section = 117 | any section: 117 | blocking |
| MCAT section = 133 | any section: 133 | blocking |
| MCAT sum mismatch | total=500 but sections sum to 490 | blocking, `mcat.sum-mismatch` |
| PREview = 0 | preview: {score:0} | blocking |
| PREview = 10 | preview: {score:10} | blocking |
| PREview = 1 (boundary) | preview: {score:1} | accepted |
| PREview = 9 (boundary) | preview: {score:9} | accepted |
| GPA = -0.01 | metrics: {cumulativeGPA:-0.01} | blocking |
| GPA = 4.01 | metrics: {cumulativeGPA:4.01} | blocking |
| GPA = 4.00 (boundary) | metrics: {cumulativeGPA:4.0} | accepted |

### 7.2 Reference / integrity tests

- **duplicate evidence IDs** — two evidence items with same
  `evidenceId` in the same applicant's bank → blocking error at
  persistence-shim level.
- **prompt schoolId mismatch** — prompt has `schoolListEntryId=X`
  where `X` is not in the applicant's school list → blocking,
  `prompt.school.orphan`.
- **missing citations (school-fit)** — running school-fit on a
  school with `citationRefs=[]` → blocking, `research.citations.missing`.
- **missing citations (draft school-scoped)** — draft with a
  school-specific claim and no `schoolCitations[]` → blocking,
  `draft.school-citation.missing`.
- **unconfirmed sensitive evidence** — evidence has
  `sensitivityTags:['mental-health-self']` and `confirmed=false`;
  draft cites it → blocking, `evidence.sensitivity.unconfirmed`.
- **evidence orphan in draft** — draft cites `evidenceId` not in bank
  → blocking, `draft.evidence.orphan`.
- **citation orphan in draft** — draft cites `citationId` not in
  citations table → blocking, `draft.citation.orphan`.

### 7.3 Content / output tests

- **placeholder/fake markers** — draft contains "the applicant is a
  fictional applicant" → blocking, `draft.placeholder.third-person`.
- **bracket placeholder** — draft contains "[insert story here]" →
  blocking.
- **doNotUseTopics appearing** — draft contains a case-insensitive
  substring from a `matchPatterns` → blocking,
  `draft.doNotUseTopics.hit`.
- **unsupported applicant claim** — draft sentence classified as a
  claim, no `evidenceCitations[]` attached → blocking,
  `draft.unsupported.claim`.
- **uncited school claim** — sentence names a school program with no
  `citationId` attached → blocking, `draft.school-claim.uncited`.
- **underfilled** — draft is 550 words against a 1000-word limit →
  warning, `draft.underfilled`.
- **word limit** — draft is 1001 words against 1000-word limit →
  blocking, `draft.wordLimit.exceeded`.
- **char limit** — draft is 5001 chars against 5000-char limit →
  blocking, `draft.charLimit.exceeded`.
- **copied evidence — near-verbatim** — draft has a 20-word contiguous
  span identical to an evidence narrative → warning at first pass,
  blocking at export attempt.
- **repeated story** — same evidenceId used across 3 different
  drafts in the current cycle → warning, `draft.repeated-story`.
- **generic school-fit** — school-fit paragraph has zero school-name
  mentions, zero program mentions, zero citations → warning,
  `draft.generic-fit`.
- **interview defensibility** — claim without a linked evidenceId
  that the applicant themselves authored → warning,
  `draft.interview-defensibility`.

### 7.4 Portal/backend contract parity tests

- **snapshot present** — `admissions.contract.json` must exist and
  match its committed SHA-256.
- **every portal rule present in snapshot** — set of `ruleId` in
  portal rules === set of `ruleId` in snapshot.
- **severity parity** — every rule's `severity` matches between
  portal rules and snapshot.
- **message parity** — every rule's `messageTemplate` is
  byte-identical to the snapshot copy (interpolation slots checked
  by tag name).
- **entity parity** — every entity has the same required-field set
  in the portal Zod schema and the snapshot summary.
- **no extra rule** — no snapshot rule missing from the portal.
- **freeze test** — `admissions.contract.json` cannot be modified
  without a paired change to `contract.review-log.md`.

### 7.5 Fixture discipline tests

- **no-PII fixture guard** — every test fixture directory is
  scanned; any file containing patterns matching
  `SSN|MRN|patient_name|dob\s*[:=]` fails the suite.
- **`SYNTHETIC_FIXTURE=true` marker** — every fixture file must
  carry this constant; test suite refuses to load a fixture without
  it.

### 7.6 Coverage expectations

- Per rule: at least one "accepted" case at the boundary and one
  "rejected" case just past the boundary.
- Per output rule: adversarial cases with tricky spacing, unicode
  homoglyphs, case-variant matches.
- The contract parity suite must be 100% deterministic (no random
  ordering, no time-of-day dependence).

---

## 8. Scope restrictions

Confirming what Gate 3 will NOT touch:

- **No production connection.** Everything runs under the existing
  vitest.setup.js fetch guard. No real network, no Vercel prod env
  var set.
- **No migrations.** The 528-backend `mcat-study-app-backend` repo
  is not touched by Gate 3 at all. Backend validators are named
  (§4) but not implemented.
- **No UAT schema.** No DB schema, no ORM models, no Prisma/SQL/etc.
  changes in either repo.
- **No private applicant data.** Every fixture is synthetic and
  carries `SYNTHETIC_FIXTURE=true`. Test suite enforces via §7.5.
- **No external providers.** No LLM API, no scoring API, no
  parser-as-a-service. The sentence classifier (§6.5) is a local
  rule-based heuristic.
- **No agent execution.** Gate 3 is validation contract only. No
  agent code runs, no LangGraph, no orchestration.
- **No Gate 4 work.** Backend-side mirror, agent wiring, real
  applicant data storage, and MSAR ingestion are Gate 4+ concerns.
- **No feature flags enabled.**
  `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED` remains unset in
  production. Backend `ADMISSIONS_COPILOT_ENABLED` remains unset.

---

## 9. Deliverable summary + open questions

### 9.1 What Gate 3 will produce when approved

New portal files (all under `src/features/admissions/validation/`):

- `entities/*.js` — one Zod schema per entity in §1
- `rules.js` — frozen registry of rule metadata (§3.4)
- `messages.js` — user-facing messages keyed by ruleId (§2)
- `output/draftClassifier.js` — heuristics from §6.5
- `output/draftValidator.js` — draft-side rule runner from §6
- `contract/admissions.contract.json` — snapshot from §5.4
- `contract/parity.test.js`, `contract/freeze.test.js` — §5.4 tests
- `fixtures/synthetic/**` — synthetic-only fixtures for §7
- `__tests__/**` — the full test plan from §7

Documentation additions:

- Rename this doc to `ADMISSIONS_COPILOT_GATE3_VALIDATION_CONTRACT.md`
  on approval; keep this file as the plan history.
- Add `contract/review-log.md` for the drift-prevention discipline.

### 9.2 What Gate 3 will NOT ship

- No backend code
- No UI beyond the surfaces already stubbed in Gate 2
- No agent runtime
- No real API endpoints wired
- No enabling of either feature flag

### 9.3 Open questions for the reviewer

Please confirm or redirect before Gate 3 implementation begins:

1. **Rule severity classification** — are the assignments in §3.1 /
   §3.2 / §3.3 aligned with your expectations? In particular:
   - Should `draft.copied-evidence` be blocking on first flag or
     warn-then-block on export (proposed here)?
   - Should `interpretation.axis.mismatch` be blocking or warning?
     Currently proposed as blocking.
   - Should `mcat.date.stale` be blocking for schools that clearly
     don't accept older scores, or always warning?

2. **Sentence classifier** (§6.5) — the heuristic is intentionally
   simple. Do you want any specific verbs, quantifiers, or claim
   patterns added or removed from the initial set?

3. **Contract snapshot vs shared package** (§5) — approving Option C
   (duplicated schemas + parity tests + snapshot) as the Gate 3
   choice. If you want Option B (generated JSON Schema) instead,
   Gate 3 timeline will grow by roughly a week for the codegen and
   the schema-language custom-keyword work.

4. **Freshness thresholds** — 60 days for prompts, 90 days for
   research, 12 months for citation staleness informational tag.
   Comfortable with these numbers?

5. **doNotUseTopics match semantics** — currently case-insensitive
   substring/regex on `matchPatterns`. Do you want tokenized
   matching (word-boundary aware) instead, to avoid false positives
   on things like "leader" matching "eader"?

6. **Backend endpoint list** (§4.2) — please confirm the endpoint
   list matches how you want the backend surface partitioned.

7. **Interview-defensibility rule** (§6.4) — currently a warning.
   Should it be blocking when a claim has no evidenceId at all?

### 9.4 Timeline (estimate — for planning only, not a commitment)

Contingent on approval:

- Schemas + rule registry + messages: ~2 days
- Draft classifier + output validator + tests: ~2 days
- Contract snapshot + parity tests: ~1 day
- Documentation + review artifact: ~0.5 day

Total: ~5.5 working days for the portal-side Gate 3 delivery.
Backend mirror (Gate 4) is a separately scoped effort.
