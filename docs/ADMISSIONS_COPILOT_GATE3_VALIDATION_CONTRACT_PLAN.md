# Admissions Copilot — Gate 3 Validation Contract Plan (v0.2)

**Status:** v0.2 — reviewer-corrected. Ready for implementation.
**Scope:** Portal-side validation contract for Admissions Copilot inputs and outputs
**Non-scope:** UI expansion, real applicant trials, migrations, agent execution, Gate 4, backend implementation

Gate 2 shipped an inert shell and a dark-preview flag. Gate 3 defines
the **validation contract** that both the portal and the backend must
eventually honor. Backend implementation is Gate 4+ work; Gate 3 is
portal-side only.

---

## v0.2 changelog vs v0.1

Applied per reviewer's Gate 3 v0.2 correction pass:

1. **Backend technology** — corrected everywhere: backend is Node.js /
   Express (same runtime as the portal), not Python. Target mirror
   file remains `mcat-study-app-backend/domains/admissions/lib/validators.js`.
2. **Sensitive applicant fields reduced.** MVP applicant profile
   requires ONLY the workflow-necessary identity fields:
   `applicantLabel`, `applicationCycle`, `stateResidency`, `college`,
   `major`, `graduationDate`. Legal name, contact email, pronouns,
   citizenship/DACA, demographics, disadvantaged narrative, and
   institutional-action narrative are moved to an
   **optional/deferred** subsection and clearly labeled as such.
3. **Externally governed policy hoisted.** MCAT ranges, AAMC 4-year
   validity window, AMCAS activity caps (15 activities, 3
   most-meaningful, 700-char description, 1325-char most-meaningful
   essay), PREview range, etc. now live in a single versioned
   `admissionsPolicySnapshot` object with `snapshotVersion`, `sourceUrl`,
   `retrievedAt`, and `notes`. No unversioned constants.
4. **MSAR/AAMC school IDs deferred.** School list uses portal-generated
   `schoolId` (UUID) plus `officialSchoolName`, `programType`, and
   `location` in the MVP. `aamcSchoolId` is optional/future.
5. **doNotUseTopics matching tightened.** Replaced `matchPatterns`
   (regex + substring) with `matchPhrases` — normalized-and-tokenized
   phrase matching. NFKC + casefold + collapse whitespace + tokenize
   on word boundaries. Match iff a phrase's tokens appear as a
   consecutive subsequence in the draft's token stream. No arbitrary
   user-supplied regex is accepted.
6. **School-claim citation severity split.**
   - `draft.school-claim.agent-uncited` = **blocking** (agent-generated
     school-specific claim without a matching school citation)
   - `draft.school-claim.applicant-uncited` = **warning** (applicant-authored
     note without a citation)
7. **Final severity assignments** (all set from v0.1 open questions):
   - `draft.copied-evidence`: **warning** during drafting, **blocking**
     before applicant-facing final / export / approval
   - `interpretation.axis.mismatch`: **blocking**
   - `mcat.date.stale`: **warning** (never global blocking)
   - `research.stale`: **warning** after 90 days; **blocking** only
     for current-cycle requirements/deadlines if stale or uncited
   - `prompt.stale`: **warning** after 60 days; **blocking** only if
     no citation/source exists
   - `citation.stale`: **informational** after 12 months unless used
     for current-cycle requirements
   - `interview-defensibility` split:
     - `draft.interview-defensibility.unconfirmed-sensitive`:
       **blocking** if unconfirmed/sensitive evidence is used
     - `draft.interview-defensibility.thin`: **warning** if evidence
       is confirmed but thin
8. **Contract source of truth — Option C approved.** Duplicated
   schemas + `admissions.contract.json` snapshot + parity tests +
   freeze test + review log. Option A (shared package) and Option B
   (generated JSON Schema) are documented but not chosen for Gate 3.

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
9. [Deliverable summary](#9-deliverable-summary)

---

## 1. Portal-side validation schemas

Each entity is described as: **identity**, **required fields**,
**value constraints**, **cross-entity constraints**. Schemas are
authored in **Zod** on the portal. Every entity carries an
`entityVersion` field so contract changes can be tracked forward.
Externally governed limits (MCAT ranges, AMCAS caps, etc.) are
imported from `admissionsPolicySnapshot` (§1.17), never hard-coded
per-entity.

### 1.1 applicant profile

MVP profile requires only workflow-necessary identity fields.
Sensitive fields are optional and deferred.

- **Identity:** `applicantId` (UUID), `entityVersion`
- **MVP required fields:**
  - `applicantLabel` — short human-readable label chosen by the
    applicant (not their legal name), 1–60 chars
  - `applicationCycle` — YYYY–YYYY, must fall within the current
    admissionsPolicySnapshot's supported cycles
  - `stateResidency` — enum of US state / territory codes + `international`
    + `unknown`
  - `college` — undergraduate institution name, 1–200 chars
  - `major` — free-text, 1–120 chars
  - `graduationDate` — ISO year-month `YYYY-MM`
- **Optional / deferred (labeled `sensitive: true` in the schema):**
  - `legalNameFirst`, `legalNameLast`
  - `pronouns`
  - `contactEmail`
  - `citizenshipStatus` (including DACA)
  - `disadvantagedNarrative`
  - `demographics`
  - `institutionalActionNarrative`
- **Rules on sensitive fields:**
  - Every sensitive field carries `deferredUntilPhase: 'gate4-or-later'`.
  - No draft or output validation reads sensitive fields in Gate 3.
  - Every sensitive field is marked in the Zod schema so the portal
    UI can render a "sensitive — optional" affordance and the
    fixture-discipline test (§7.5) can refuse to load a fixture that
    populates any sensitive field with real-looking data.

### 1.2 academic metrics
- **Identity:** `applicantId` FK (1:1)
- **Required fields:**
  - `cumulativeGPA` — number in `[policy.gpa.min, policy.gpa.max]`
  - `scienceGPA` (BCPM) — number in `[policy.gpa.min, policy.gpa.max]`
  - `postbacGPA` — optional number in the same range
  - `gpaTrend` — enum {`upward`, `flat`, `downward`, `insufficient-data`}
  - `transcriptCount` — integer ≥ 1
- **Cross-entity:** none

### 1.3 MCAT scores

Ranges and caps read from `admissionsPolicySnapshot.mcat`.

- **Identity:** `mcatAttemptId` (UUID), `applicantId` FK
- **Required fields:**
  - `testDate` — ISO date; validity window comes from
    `policy.mcat.validityYears`
  - `totalScore` — integer in `[policy.mcat.totalMin, policy.mcat.totalMax]`
  - `cpbsScore`, `carsScore`, `bbfnScore`, `psbbScore` — integers in
    `[policy.mcat.sectionMin, policy.mcat.sectionMax]`
  - `voided` — boolean; if true, other scores must be null
- **Cross-field rule:** `totalScore = cpbsScore + carsScore + bbfnScore + psbbScore` exactly
- **Multiplicity:** `≤ policy.mcat.lifetimeAttemptCap`

### 1.4 AAMC PREview score

- **Identity:** `applicantId` FK (1:many by cycle)
- **Required fields:**
  - `score` — integer in `[policy.preview.min, policy.preview.max]`
  - `testDate` — ISO date
  - `applicationCycle` — YYYY–YYYY
- **Cross-entity:** none

### 1.5 experience hours
- **Identity:** `activityId` FK (1:1)
- **Required fields:**
  - `hoursTotal` — integer ≥ 0, ≤ `policy.experience.hoursCeiling`
  - `startDate`, `endDate` — ISO dates; endDate ≥ startDate; endDate
    ≤ application submission date
  - `hoursByYear` — map `YYYY → integer ≥ 0`; sum must equal
    `hoursTotal` ± 5 (rounding tolerance)
  - `frequency` — enum {`weekly`, `monthly`, `sporadic`, `one-time`}
- **Cross-entity:** none

### 1.6 applicant activities

AMCAS caps read from `admissionsPolicySnapshot.amcas`.

- **Identity:** `activityId` (UUID), `applicantId` FK
- **Required fields:**
  - `experienceType` — enum from `policy.amcas.experienceTypes`
  - `title` — 1–100 chars
  - `organization` — 1–200 chars
  - `description` — ≤ `policy.amcas.descriptionCharLimit` (700)
  - `isMostMeaningful` — boolean; total marked ≤ `policy.amcas.mostMeaningfulCap` (3)
  - `mostMeaningfulEssay` — required IFF `isMostMeaningful`; ≤ `policy.amcas.mostMeaningfulEssayCharLimit` (1325)
- **Multiplicity:** ≤ `policy.amcas.activityCap` (15)
- **Cross-entity:** must link to ≥ 1 evidence bank item (§1.7) before
  the activity can be marked "ready-for-draft-use"

### 1.7 evidence / story bank
- **Identity:** `evidenceId` (UUID), `applicantId` FK
- **Required fields:**
  - `title` — 1–150 chars
  - `narrative` — 1–3000 chars
  - `evidenceType` — enum
  - `sourceType` — enum {`applicant-authored`, `letter-of-recommendation`,
    `transcript`, `publication`, `award-doc`, `other`}
  - `confirmed` — boolean (default false); becomes true only via
    explicit confirmation action
  - `sensitivityTags` — array of enum {`patient-info`,
    `mental-health-self`, `mental-health-other`, `legal`,
    `family-medical`, `identity-first-person`, `none`}
  - `activityLinks` — array of `activityId` refs (may be empty)
  - `dateRange` — {startDate, endDate} ISO dates or `ongoing` sentinel
- **Cross-entity:** `activityLinks[].activityId` must resolve on the
  same applicant

### 1.8 school list

Portal-generated IDs; MSAR is deferred.

- **Identity:** `schoolId` (UUID, portal-generated), `applicantId` FK
- **MVP required fields:**
  - `officialSchoolName` — free-text 1–200 chars (applicant-entered)
  - `programType` — enum {`MD`, `MD-PhD`, `DO`}
  - `location` — {`city` string, `stateOrRegion` string, `country` ISO-3166 code}
  - `applicationType` — enum {`primary`, `secondary-only`, `research-track`, `other`}
  - `tier` — enum {`reach`, `target`, `likely`, `safety`} (informational only)
  - `secondaryReceived` — boolean (default false)
- **Optional / future (labeled `deferred: true`):**
  - `aamcSchoolId` — optional canonical MSAR ID (deferred due to
    MSAR data source/licensing complexity)
- **Multiplicity:** 1–40 entries

### 1.9 school research
- **Identity:** `schoolResearchId`, `schoolId` FK (1:1)
- **Required fields:**
  - `fitAxes` — array of {`axisKey` enum, `axisNotes` string}, min 1
  - `keyPrograms` — array of strings
  - `citationRefs` — array of `citationId`; **≥ 1 required** before
    school-fit matching can run
  - `updatedAt` — ISO timestamp; staleness thresholds per §3
- **Cross-entity:** every `citationRefs[].citationId` must exist for
  the same applicant AND its `schoolScopeId` must match this school

### 1.10 citations
- **Identity:** `citationId` (UUID), `applicantId` FK
- **Required fields:**
  - `sourceType` — enum {`school-website`, `school-viewbook`,
    `school-publication`, `podcast`, `news-article`, `journal-article`,
    `msar` (marked deferred), `other`}
  - `url` — https URL, or `offlineDoc: true` with `docTitle`
  - `retrievedAt` — ISO timestamp
  - `verifierNote` — applicant's own note on what this source establishes
  - `schoolScopeId` — nullable `schoolId`; null → applicant-general
  - `usedForCurrentCycleRequirement` — boolean (drives staleness
    severity — see §3)
- **Cross-entity:** none

### 1.11 secondary prompts
- **Identity:** `promptId` (UUID), `schoolId` FK
- **Required fields:**
  - `promptText` — 1–2000 chars
  - `wordLimit` — nullable integer ≥ 25
  - `charLimit` — nullable integer ≥ 100
  - `category` — enum
  - `sourceCitationId` — reference to a citation of type
    `school-website|school-viewbook|school-publication` proving the
    prompt exists
  - `retrievedAt` — ISO timestamp; staleness rule per §3
- **Cross-entity:** at least one of `wordLimit` / `charLimit` must be present

### 1.12 prompt interpretations
- **Identity:** `interpretationId` (UUID), `promptId` FK (1:1)
- **Required fields:**
  - `interpretation` — 50–1500 chars
  - `keyAxes` — array of enum matching `fitAxes.axisKey`; ≥ 1
  - `expectedThemes` — array of tags, ≥ 1
  - `confirmed` — boolean
- **Cross-entity:** `keyAxes` must be a subset of the linked
  school's `fitAxes` axes (blocking — §3)

### 1.13 drafts
- **Identity:** `draftId` (UUID), `promptId` FK
- **Required fields:**
  - `draftText` — string
  - `wordCount`, `charCount` — computed
  - `authorType` — enum {`applicant`, `agent`, `mixed`} — drives
    citation-severity split for school claims
  - `evidenceCitations` — array of `evidenceId`; ≥ 1 required
  - `schoolCitations` — array of `citationId` whose `schoolScopeId`
    matches the prompt's school
  - `draftStatus` — enum {`in-progress`, `ready-for-review`,
    `applicant-approved`}
  - `versionNumber` — integer ≥ 1
  - `sentenceIndex` — array of {sentenceId, span, classifiedAs,
    linkedEvidenceIds[], linkedCitationIds[], authorType} — the
    output validator (§6) consumes this
- **Cross-entity constraints:**
  - `wordCount ≤ promptId.wordLimit` (blocking) if wordLimit set
  - `charCount ≤ promptId.charLimit` (blocking) if charLimit set
  - Every `evidenceCitations[]` must resolve to `confirmed=true`
    evidence
  - No text spans matching §6 forbidden markers

### 1.14 interview-prep inputs
- **Identity:** `interviewPrepId` (UUID), `schoolId` FK (1:1)
- **Required fields:**
  - `interviewFormat` — enum {`MMI`, `traditional`, `panel`, `hybrid`, `unknown`}
  - `storyIds` — array of `evidenceId`; ≥ 3 recommended (warning if < 3)
  - `predictedQuestions` — array of {questionText, sourceCitationId,
    expectedThemes[]}
  - `personalAntiExamples` — array of `evidenceId`
- **Cross-entity:** every `storyIds[]` must be `confirmed=true`

### 1.15 doNotUseTopics

Matching semantics use **normalized phrase/token** — no user-supplied regex.

- **Identity:** `topicId` (UUID), `applicantId` FK
- **Required fields:**
  - `topicKey` — kebab-case slug, 1–60 chars
  - `description` — 5–500 chars
  - `rationale` — 5–500 chars
  - `matchPhrases` — array of phrase strings, each 1–200 chars.
    Portal-side matcher runs the pipeline in §6.2 on both the phrase
    and the draft; match hits iff the phrase's normalized token
    sequence is a contiguous subsequence of the draft's token
    sequence.
  - `scope` — enum {`all-schools`, `specific-school-list`}. If
    `specific-school-list`, requires `scopedSchoolIds[]`.
- **Cross-entity:** `scopedSchoolIds[]` must resolve within the
  applicant's school list.

### 1.16 key decision points
- **Identity:** `decisionId` (UUID), `applicantId` FK
- **Required fields:**
  - `phase` — enum {`school-list-selection`, `secondary-strategy`,
    `draft-approach`, `interview-strategy`, `final-decision`}
  - `decisionSummary` — 20–1000 chars
  - `rationale` — 20–2000 chars
  - `linkedEvidence` — array of `evidenceId`
  - `linkedCitations` — array of `citationId`
  - `revisitedFromDecisionId` — nullable self-ref
  - `decidedAt` — ISO timestamp
- **Cross-entity:** none beyond ref types

### 1.17 admissionsPolicySnapshot

Single frozen object holding externally governed policy. **All
consumers import from here** — no unversioned constants elsewhere.

```
{
  snapshotVersion: "2026-07-gate3",
  retrievedAt: "2026-07-13T00:00:00Z",
  sourceUrls: {
    mcat: "https://students-residents.aamc.org/mcat-scoring-and-score-reports",
    amcas: "https://students-residents.aamc.org/amcas",
    preview: "https://students-residents.aamc.org/aamc-preview",
  },
  notes: "Snapshot of externally governed limits; policy changes require a new snapshot version and reviewer sign-off.",
  mcat: {
    totalMin: 472, totalMax: 528,
    sectionMin: 118, sectionMax: 132,
    lifetimeAttemptCap: 4,
    validityYears: 4,
  },
  amcas: {
    activityCap: 15,
    mostMeaningfulCap: 3,
    descriptionCharLimit: 700,
    mostMeaningfulEssayCharLimit: 1325,
    experienceTypes: [ /* AMCAS 16-category list */ ],
  },
  preview: { min: 1, max: 9 },
  gpa: { min: 0.0, max: 4.0 },
  experience: { hoursCeiling: 100000 },
  freshness: {
    researchStaleDays: 90,
    promptStaleDays: 60,
    citationInformationalDays: 365,
  },
}
```

Rules for changes to the snapshot:
- Every change bumps `snapshotVersion` (kebab-cased date + tag).
- Snapshot changes require an entry in `contract/review-log.md`.
- The freeze test (§5.4, §7.4) refuses a change to the snapshot
  without a matching review-log entry.

### 1.18 field-level normalization rules
- **Strings:** NFKC unicode normalize, trim leading/trailing whitespace, collapse ≥ 2 internal whitespace to single space.
- **URLs:** must be `https:` unless the citation is explicitly `offlineDoc`.
- **ISO dates:** `YYYY-MM-DD`; timestamps `YYYY-MM-DDTHH:MM:SSZ` in UTC.
- **Enums:** validated against the policy snapshot (§1.17) or the
  frozen constant table in `entities/index.js`; both are checked in
  parity tests.
- **IDs:** UUID v4 unless the field name declares otherwise.

---

## 2. User-facing validation messages

Format: `{ ruleId, message, target UI surface }`.

### 2.1 Numeric-range rules

| ruleId | message | surface |
|---|---|---|
| `mcat.total.range` | MCAT total must be between 472 and 528. | InlineFieldError |
| `mcat.section.range` | Each MCAT section score must be between 118 and 132. | InlineFieldError |
| `mcat.sum-mismatch` | MCAT total ({total}) must equal the sum of the four section scores ({sum}). | InlineFieldError |
| `mcat.date.stale` | MCAT scores older than 4 years may not be accepted by some schools you are applying to. | Warning banner |
| `mcat.attempts.exceeded` | AAMC lifetime cap is 4 attempts. Remove or void an earlier attempt. | InlineFieldError |
| `mcat.voided.contradiction` | A voided attempt cannot have section scores. | InlineFieldError |
| `preview.range` | AAMC PREview score must be between 1 and 9. | InlineFieldError |
| `gpa.range` | GPA must be between 0.00 and 4.00. | InlineFieldError |
| `gpa.sgpa.range` | Science GPA (BCPM) must be between 0.00 and 4.00. | InlineFieldError |
| `experience.hours.negative` | Total hours cannot be negative. | InlineFieldError |
| `experience.hours.ceiling` | Total hours over 100,000 is not accepted. | InlineFieldError |
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
| `draft.school-claim.agent-uncited` | Agent-generated school claim needs a matching school citation. | DraftValidationPanel |
| `draft.school-claim.applicant-uncited` | Consider adding a citation for this school-specific note. | DraftValidationPanel |
| `draft.evidence.unconfirmed` | This evidence item is marked unconfirmed, so it cannot be used in a draft yet. | InlineCitationBadge |
| `draft.evidence.orphan` | Draft cites an evidence ID that no longer exists in your bank. | BlockingModal |
| `draft.citation.orphan` | Draft cites a school-citation ID that no longer exists. | BlockingModal |
| `interview.stories.min` | We recommend prepping at least 3 stories per school. | Warning banner |
| `evidence.activity.orphan` | This evidence links to an activity that no longer exists. | InlineFieldError |
| `doNotUseTopics.scope.orphan` | This do-not-use topic is scoped to a school not in your list. | InlineFieldError |

### 2.3 Freshness / staleness rules

| ruleId | message | surface |
|---|---|---|
| `research.stale` | School research for {schoolName} was last updated {n} days ago. Refresh before running current-cycle steps. | Warning banner |
| `research.stale.currentCycleBlock` | School research is required for a current-cycle deadline and is stale or uncited — refresh before continuing. | BannerAtSurface |
| `prompt.stale` | This prompt was retrieved {n} days ago — verify the school still uses this wording. | Warning banner |
| `prompt.stale.uncited` | This prompt has no source citation and is older than 60 days — add a citation or re-retrieve. | BannerAtSurface |
| `citation.stale` | Citation is older than 12 months. | Informational tag |
| `citation.stale.currentCycleBlock` | Citation used for a current-cycle requirement is over 12 months old — replace or reconfirm. | BannerAtSurface |

### 2.4 Draft output rules (surfaces: `DraftValidationPanel`)

| ruleId | message |
|---|---|
| `draft.claim.uncited` | This applicant claim is not tied to any evidence ID. |
| `draft.doNotUseTopics.hit` | Draft contains language matching a do-not-use topic: "{topicKey}". |
| `draft.placeholder.third-person` | Draft contains "the applicant" / "fictional applicant" / placeholder text — this must be rewritten in first person. |
| `draft.copied-evidence` | Draft contains text copied verbatim from an evidence item — rewrite in your own words. |
| `draft.copied-evidence.export-block` | Draft still contains copied evidence text — resolve before export or approval. |
| `draft.wordLimit.exceeded` | Draft is {n} words over the {limit}-word prompt limit. |
| `draft.charLimit.exceeded` | Draft is {n} characters over the {limit}-character prompt limit. |
| `draft.underfilled` | Draft is only {pct}% of the available length — consider adding depth. |
| `draft.repeated-story` | You have used this evidence in {n} other drafts already this cycle. |
| `draft.generic-fit` | The school-fit language reads generic — cite a specific program, faculty, or curricular feature. |
| `draft.interview-defensibility.unconfirmed-sensitive` | Draft uses unconfirmed or sensitive evidence — confirm before applicant-facing review. |
| `draft.interview-defensibility.thin` | This claim is supported but thin — add depth for interview defensibility. |

### 2.5 Sensitivity rules

| ruleId | message |
|---|---|
| `evidence.sensitivity.unconfirmed` | This evidence has a sensitivity tag ({tag}) — please confirm before allowing it in drafts. |
| `evidence.sensitivity.patient-info` | This evidence appears to contain patient-identifiable information. Please redact before continuing. |

---

## 3. Blocking vs warning vs informational classification

Final severities per reviewer v0.2.

### 3.1 Blocking rules
- All numeric-range violations in §2.1 (MCAT, PREview, GPA)
- `mcat.sum-mismatch`, `mcat.attempts.exceeded`, `mcat.voided.contradiction`
- `activity.description.limit` at export
- `activity.mostMeaningful.essay.limit` at export
- `activity.mostMeaningful.cap`, `activity.count.cap`
- `schoolList.count.cap` (soft ceiling; blocks export)
- `draft.wordLimit.exceeded`, `draft.charLimit.exceeded`
- `draft.evidence.missing`
- `draft.evidence.unconfirmed`
- `draft.evidence.orphan`, `draft.citation.orphan`
- `draft.doNotUseTopics.hit`
- `draft.placeholder.third-person`
- `draft.copied-evidence.export-block` (see §6.2 for phase)
- `draft.school-claim.agent-uncited`
- `draft.interview-defensibility.unconfirmed-sensitive`
- `interpretation.axis.mismatch`
- `research.citations.missing` (blocks school-fit run only)
- `research.stale.currentCycleBlock`
- `prompt.source-citation.missing`
- `prompt.stale.uncited`
- `citation.stale.currentCycleBlock`
- `evidence.sensitivity.patient-info`

### 3.2 Warning rules
- `mcat.date.stale`
- `research.stale`
- `prompt.stale`
- `draft.copied-evidence` (during drafting phase; escalates to `export-block` on approval attempt)
- `draft.school-claim.applicant-uncited`
- `draft.underfilled`
- `draft.repeated-story`
- `draft.generic-fit`
- `draft.interview-defensibility.thin`
- `evidence.sensitivity.unconfirmed`
- `interview.stories.min`

### 3.3 Informational rules
- `citation.stale`
- `schoolList.tier.distribution`
- `activity.hourBreakdown.byYear.missing`
- `preview.optional-cycle`

### 3.4 Machine-readable rule shape

Every rule in `src/features/admissions/validation/rules.js` follows:

```
{
  ruleId,                // stable string
  severity,              // "blocking" | "warning" | "informational"
  scope,                 // "field" | "entity" | "cross-entity" | "output"
  target,                // ["entityKey"] or ["draftText"] etc.
  messageTemplate,       // e.g. "MCAT total must be ..."
  metadataTemplate,      // e.g. { totalMin: number, totalMax: number }
  phase,                 // optional: "drafting" | "export" | "approval" — for phase-scoped severities
}
```

The registry is a frozen object; a Zod meta-schema in the test suite
verifies every rule matches this shape.

---

## 4. Backend validation mirror

Backend is **Node.js / Express** (same runtime family as the portal),
not Python. Backend mirror target file:

`mcat-study-app-backend/domains/admissions/lib/validators.js`

Backend is authoritative on data integrity; portal validation is a
UX-side courtesy that keeps invalid data out of the pipeline early.
Any input from the portal is untrusted by the backend.

### 4.1 Rules that MUST be mirrored

All rules in §3.1 (blocking) plus these §3.2 warnings with integrity
implications:

| Portal ruleId | Backend responsibility |
|---|---|
| MCAT/PREview/GPA ranges, sum-mismatch, attempts, voided contradiction | Reject at API boundary |
| Experience hours (year-sum, negative, ceiling) | Reject at API boundary |
| Activity description/most-meaningful-essay/most-meaningful cap/activity count | Reject at API boundary |
| `schoolList.count.cap` | Reject at API boundary |
| `draft.evidence.unconfirmed`, `draft.evidence.orphan`, `draft.citation.orphan` | Reject at draft-persistence boundary |
| `draft.evidence.missing`, `draft.school-claim.agent-uncited` | Reject on status transition to `applicant-approved` |
| `draft.doNotUseTopics.hit` | Reject on status transition to `ready-for-review` |
| `draft.placeholder.third-person`, `draft.copied-evidence.export-block` | Reject on status transition to `applicant-approved` |
| `interpretation.axis.mismatch` | Reject at persistence |
| `prompt.source-citation.missing` | Reject at persistence |
| `research.citations.missing` | Reject at `/run-school-fit` endpoint |
| `evidence.sensitivity.patient-info` | Reject at persistence |
| `draft.interview-defensibility.unconfirmed-sensitive` | Reject on status transition to `applicant-approved` |
| Freshness (`research.stale`, `prompt.stale`, `citation.stale`) | **NOT** enforced backend-side; surfaced as read-only metadata; `updatedAt` remains authoritative. |

### 4.2 Target file (backend)

`mcat-study-app-backend/domains/admissions/lib/validators.js`
with companion `admissions/lib/rules.js` mirroring the portal shape.

Backend enforcement endpoints (naming only — implementation deferred
to Gate 4):

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
- `POST /api/admissions/applicant/drafts/:id/transition`
- `POST /api/admissions/school-fit/run`

### 4.3 Error shape

- **HTTP 422 Unprocessable Entity** with a stable body:
  ```
  { error: "validation", violations: [ { ruleId, target, message, metadata } ] }
  ```
- Backend emits its own copy of the message from its local rules
  registry — parity is verified against `admissions.contract.json`
  (§5), not by cross-import.

### 4.4 Implementation timing

**Backend changes are out of scope for Gate 3.** Gate 3 only names
the target file and endpoint list so the portal contract is authored
with backend parity in mind. Backend implementation is a separately
scoped Gate 4 effort.

---

## 5. Contract source of truth (drift prevention)

**Option C is approved.**

### 5.1 Options considered

**Option A — shared npm package.** Both portal and backend import
from `@528ai/admissions-validation`. Because both sides now share a
Node.js runtime, cross-language codegen isn't a blocker — but
publishing infrastructure the org doesn't yet have is. Correct
end-state; wrong Gate 3 tool.

**Option B — generated JSON Schema.** Portal is authoritative; a build
step emits `admissions.schema.json`. Cross-runtime safe; expresses
most cross-entity rules only with custom keywords. Non-trivial today.

**Option C — duplicated schemas + snapshot + parity tests.** Each
repo owns its schemas. A **contract snapshot**
(`admissions.contract.json`) lists {ruleId, severity, scope, target,
metadataTemplate, messageTemplate} plus entity summaries. Both test
suites verify their local schemas match the snapshot. Drift fails
CI. This is what Gate 3 implements.

### 5.2 Contract snapshot proposal

`src/features/admissions/validation/contract/admissions.contract.json`:

```
{
  "contractVersion": "gate3-2026-07",
  "policySnapshotVersion": "2026-07-gate3",
  "entities": { /* required-field summaries per §1 */ },
  "rules": [
    { "ruleId": "mcat.total.range",
      "severity": "blocking",
      "scope": "field",
      "target": ["mcat.totalScore"],
      "messageTemplate": "MCAT total must be between 472 and 528.",
      "metadataTemplate": {}, "phase": null },
    ...
  ]
}
```

Parity tests (Gate 3 portal; Gate 4 backend):

- `contract.parity.test.js` — every snapshot rule has a matching
  local rule and vice versa (by `ruleId`), with matching
  `severity`, `scope`, `messageTemplate`, `phase`.
- `contract.freeze.test.js` — the snapshot's SHA-256 is byte-frozen
  against a checked-in expected hash; any change requires updating
  the hash + the review log.
- `contract/review-log.md` — every contract version bump requires a
  reviewer-approved entry naming the change.

### 5.3 Deprecation & migration policy
- Rules are never silently removed. A removed rule is retained with
  `deprecated: true` and `deprecatedAt`.
- Severity may only tighten between contract versions (informational
  → warning → blocking); loosening requires a documented reviewer note.

---

## 6. Draft / output validation

Output rules apply to `drafts.draftText` and any generated output.

### 6.1 Citation rules

- **`draft.claim.uncited`** — every applicant claim (see §6.5)
  MUST have ≥ 1 `evidenceId` attached (via `sentenceIndex`).
- **`draft.school-claim.agent-uncited`** — every school-specific
  sentence whose `authorType === "agent"` MUST have ≥ 1 school
  citation attached. **Blocking.**
- **`draft.school-claim.applicant-uncited`** — every school-specific
  sentence whose `authorType === "applicant"` should have ≥ 1
  school citation attached. **Warning** — kept as a warning because
  applicant-authored notes may be based on unrecorded conversations
  or campus visits the applicant does not want to formalize.

### 6.2 Forbidden content rules

Matching semantics used across §6.2:

1. **Normalize** — NFKC unicode; casefold; trim; collapse ≥ 2
   whitespace to one space; strip zero-width characters (U+200B,
   U+FEFF, etc.); replace typographic quotes with straight quotes.
2. **Tokenize** — split on non-alphanumeric-non-apostrophe
   characters; drop empty tokens.
3. **Phrase-match** — a phrase (tokenized identically) matches iff
   its token sequence appears as a contiguous subsequence of the
   draft's token sequence.

- **`draft.doNotUseTopics.hit`** — any phrase from any
  `doNotUseTopics.matchPhrases` on this applicant matches per
  above. **Blocking.**
- **`draft.unsupported.claim`** — a sentence classified as a claim
  that lacks any linked evidence at export time. **Blocking.**
- **`draft.copied-evidence`** — draft contains a contiguous
  15-token span identical (post-normalize/tokenize) to any evidence
  narrative on this applicant. **Warning** during drafting;
  **blocking** (`draft.copied-evidence.export-block`) at status
  transition to `applicant-approved`.
- **`draft.placeholder.third-person`** — the tokenized draft
  contains any of the phrase set {"the applicant", "fictional
  applicant", "applicant name", "tbd"} OR any bracket placeholder
  `[…]` (post-normalize). **Blocking.**

### 6.3 Length rules
- **`draft.wordLimit.exceeded`** — `wordCount > promptId.wordLimit`. **Blocking.**
- **`draft.charLimit.exceeded`** — `charCount > promptId.charLimit`. **Blocking.**
- **`draft.underfilled`** — `wordCount < 0.6 × wordLimit` OR
  `charCount < 0.6 × charLimit`. **Warning.**

### 6.4 Story-hygiene rules
- **`draft.repeated-story`** — same `evidenceId` cited in > 2
  drafts this cycle. **Warning.**
- **`draft.generic-fit`** — school-fit paragraph mentions no school
  name, no program name, and attaches no citation. **Warning.**
- **`draft.interview-defensibility.unconfirmed-sensitive`** — a
  claim uses an unconfirmed or sensitivity-tagged evidence item.
  **Blocking.**
- **`draft.interview-defensibility.thin`** — a claim is confirmed
  but backed by a single small evidence item; the panel encourages
  more depth. **Warning.**

### 6.5 Sentence classifier

Rule-based only. **No external LLM, no external API.**

- **Applicant claim heuristic:** first-person subject ("I", "my",
  "we") AND an experiential verb from
  `admissionsPolicySnapshot.claimVerbs` OR a quantitative claim
  ("N hours", "N patients", "N publications").
- **School claim heuristic:** sentence contains the linked school's
  `officialSchoolName`, or a program name from that school's
  `keyPrograms`, or a faculty name from any citation on that
  school whose `verifierNote` calls that faculty name out.

The classifier is intentionally over-cautious; false positives cost
the applicant an extra citation attach, false negatives cost
integrity.

### 6.6 Rejection / correction affordances
- **Fix in place** — portal opens the field/sentence at the problem.
- **Override with rationale** — warning-tier only; recorded in
  `draftAuditLog[]`.
- **Save as draft-in-progress** — always allowed; status simply
  cannot advance until blocking issues resolve.

---

## 7. Test plan

All tests are portal-side under Vitest. No real network, no real
applicant data. Every fixture is synthetic and carries
`SYNTHETIC_FIXTURE=true`.

### 7.1 Numeric-range tests
- MCAT total 471 → blocking; 529 → blocking; 472/528 boundaries → accepted
- MCAT section 117/133 → blocking; 118/132 → accepted
- MCAT sum mismatch (total=500, sections sum to 490) → blocking
- PREview 0, 10 → blocking; 1, 9 → accepted
- GPA −0.01, 4.01 → blocking; 0.00, 4.00 → accepted

### 7.2 Reference / integrity tests
- Duplicate evidence IDs on same applicant → blocking
- Prompt schoolId not in school list → blocking
  (`prompt.school.orphan`)
- School research with `citationRefs=[]` when school-fit is run →
  blocking (`research.citations.missing`)
- Draft with school-specific agent-authored claim, no
  `schoolCitations[]` → blocking
  (`draft.school-claim.agent-uncited`)
- Draft with school-specific applicant-authored note, no
  `schoolCitations[]` → warning
  (`draft.school-claim.applicant-uncited`)
- Draft cites `evidenceId` not in bank → blocking
- Draft cites `citationId` not in citations table → blocking
- Unconfirmed sensitive evidence used in draft → blocking
  (`draft.interview-defensibility.unconfirmed-sensitive`)

### 7.3 Content / output tests
- doNotUseTopics phrase match — normalized token subsequence hits →
  blocking
- doNotUseTopics phrase match — false-positive guard: substring
  "leader" MUST NOT match phrase "eader" (word-boundary safe)
- doNotUseTopics phrase match — homoglyph guard: draft with "cаncer"
  (Cyrillic а) still matches "cancer" (NFKC-safe)
- Placeholder markers — "the applicant" / "TBD" / bracket
  placeholders → blocking
- Copied evidence — 15-token near-verbatim span → warning during
  drafting, blocking on approval transition
- Word limit — 1001 words vs 1000-word limit → blocking
- Char limit — 5001 chars vs 5000-char limit → blocking
- Underfilled — 550 words vs 1000-word limit → warning
- Repeated story — same evidenceId in 3 drafts → warning
- Generic school-fit paragraph → warning
- Interview-defensibility split — unconfirmed evidence → blocking;
  confirmed but thin → warning

### 7.4 Contract parity / freeze / policy tests
- Every portal `ruleId` present in `admissions.contract.json`
- Every snapshot rule present in portal `rules.js`
- `severity`, `scope`, `messageTemplate`, `phase` match per rule
- Every entity's required-field set in the Zod schema matches the
  snapshot's entity summary
- `admissions.contract.json` SHA-256 matches the checked-in expected
  hash (freeze test)
- `admissionsPolicySnapshot.snapshotVersion` matches the snapshot's
  `policySnapshotVersion`

### 7.5 Fixture discipline tests
- No fixture may populate any field marked `sensitive: true` in an
  entity schema with a value that looks like real PII.
- Every fixture file must export `SYNTHETIC_FIXTURE = true`.
- Fixture-discipline test walks the fixtures directory and fails
  the suite on any violation.

### 7.6 Determinism
- Contract parity + freeze tests are deterministic (no `Date.now`,
  no `Math.random`, no filesystem walks that depend on order).

---

## 8. Scope restrictions

Gate 3 will NOT:

- **Connect to production.** vitest fetch guard remains active. No
  Vercel prod env changes.
- **Add migrations.** 528-backend `mcat-study-app-backend` is not
  touched. Backend validators are named (§4) but not implemented.
- **Introduce UAT schema.** No DB schema, ORM model, or SQL change.
- **Include private applicant data.** Every fixture is synthetic;
  §7.5 test enforces.
- **Use external providers.** Sentence classifier (§6.5) is local
  and rule-based. No LLM, no scoring API, no parser-as-a-service.
- **Execute agents.** No LangGraph, no orchestration runtime.
- **Do Gate 4 work.** Backend mirror, agent wiring, real applicant
  storage, MSAR ingestion are deferred.
- **Enable feature flags.** `NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED`
  and backend `ADMISSIONS_COPILOT_ENABLED` remain unset.

---

## 9. Deliverable summary

### 9.1 Files Gate 3 will produce

Under `src/features/admissions/validation/`:

- `admissionsPolicySnapshot.js` — versioned external-policy object (§1.17)
- `entities/*.js` — one Zod schema per entity in §1
- `entities/index.js` — barrel + shared enums
- `rules.js` — frozen rule registry (§3.4)
- `messages.js` — user-facing messages keyed by ruleId (§2)
- `output/normalize.js` — text-normalization pipeline (§6.2)
- `output/tokenize.js` — tokenization + phrase-subsequence match
- `output/draftClassifier.js` — sentence classifier (§6.5)
- `output/draftValidator.js` — draft rule runner (§6)
- `contract/admissions.contract.json` — snapshot (§5.2)
- `contract/review-log.md` — audit log (§5.2)
- `fixtures/synthetic/**` — synthetic-only fixtures
- `__tests__/**` — the full plan in §7

### 9.2 What Gate 3 will NOT ship
- No backend code
- No UI expansion beyond what supports validation tests
- No agent runtime
- No real endpoints wired
- No feature flag enabled

### 9.3 Resolved decisions (from v0.1 open questions)

All prior open questions are resolved per reviewer v0.2:

| # | Question | Resolution |
|---|---|---|
| 1 | Severity of `draft.copied-evidence`, `interpretation.axis.mismatch`, `mcat.date.stale` | Copied-evidence warning→blocking on approval; axis-mismatch blocking; MCAT-date-stale warning |
| 2 | Sentence classifier heuristics | Kept as-is, verbs list moved to `admissionsPolicySnapshot.claimVerbs` |
| 3 | Contract source of truth | **Option C approved** — duplicated + snapshot + parity + freeze + review log |
| 4 | Freshness thresholds | 60d prompt, 90d research, 12mo citation informational; current-cycle escalation rule per §3 |
| 5 | doNotUseTopics semantics | Normalized phrase/token matching; no user regex |
| 6 | Backend endpoint list | Endpoint list confirmed; implementation is Gate 4 |
| 7 | Interview-defensibility severity | Split: unconfirmed-sensitive = blocking; confirmed-thin = warning |
