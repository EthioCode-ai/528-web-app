// Engine-by-engine unit tests. Each engine is deterministic given
// the Gate 4 fixture bundle + seed. Byte-identical output across
// runs.

import { describe, test, expect } from "vitest";
import { GATE4_FIXTURE_BUNDLE } from "../../validation/fixtures/synthetic/gate4.js";
import { runPromptInterpretation } from "../engines/promptInterpretation.js";
import { runStoryMatch } from "../engines/storyMatch.js";
import { runSchoolFit } from "../engines/schoolFit.js";
import { runDraftGeneration } from "../engines/draftGeneration.js";
import { runDraftIntegrity } from "../engines/draftIntegrity.js";
import { runInterviewQuestions } from "../engines/interviewQuestions.js";
import { GATE4_RUN_SEED } from "../constants.js";

describe("promptInterpretation", () => {
  test("returns a Zod-valid interpretation for mission-fit", () => {
    const out = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    expect(out.keyAxes.length).toBeGreaterThan(0);
    expect(out.expectedThemes.length).toBeGreaterThan(0);
    expect(out.confirmed).toBe(true);
  });

  test("keyAxes subset of schoolResearch.fitAxes", () => {
    const out = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    const known = new Set(GATE4_FIXTURE_BUNDLE.schoolResearch.fitAxes.map((a) => a.axisKey));
    for (const k of out.keyAxes) expect(known.has(k)).toBe(true);
  });
});

describe("storyMatch", () => {
  test("returns matches ordered by score", () => {
    const interp = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    const out = runStoryMatch({
      interpretation: interp,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      seed: GATE4_RUN_SEED,
    });
    for (let i = 1; i < out.matches.length; i++) {
      expect(out.matches[i - 1].score >= out.matches[i].score).toBe(true);
    }
  });

  test("byte-identical on rerun with same seed", () => {
    const interp = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    const a = runStoryMatch({
      interpretation: interp,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      seed: GATE4_RUN_SEED,
    });
    const b = runStoryMatch({
      interpretation: interp,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      seed: GATE4_RUN_SEED,
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("schoolFit", () => {
  test("emits ≥ 1 statement per fit axis", () => {
    const out = runSchoolFit({
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      citations: GATE4_FIXTURE_BUNDLE.citations,
    });
    expect(out.fitStatements.length).toBe(
      GATE4_FIXTURE_BUNDLE.schoolResearch.fitAxes.length
    );
    for (const s of out.fitStatements) {
      expect(s.citationRefs.length).toBeGreaterThan(0);
    }
  });

  test("throws if no school-scoped citation exists", () => {
    const citations = GATE4_FIXTURE_BUNDLE.citations.map((c) => ({
      ...c,
      schoolScopeId: null,
    }));
    expect(() =>
      runSchoolFit({
        schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
        schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
        citations,
      })
    ).toThrow(/school-claim.agent-uncited would fire/);
  });
});

describe("draftGeneration", () => {
  test("emits a Zod-valid draft (mission-fit path)", () => {
    const interp = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    const matches = runStoryMatch({
      interpretation: interp,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      seed: GATE4_RUN_SEED,
    });
    const fitBrief = runSchoolFit({
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      citations: GATE4_FIXTURE_BUNDLE.citations,
    });
    const draft = runDraftGeneration({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      matches,
      fitBrief,
      seed: GATE4_RUN_SEED,
    });
    expect(draft.authorType).toBe("agent");
    expect(draft.sentenceIndex.length).toBeGreaterThanOrEqual(6);
    expect(draft.sentenceIndex.length).toBeLessThanOrEqual(8);
    // Every applicant-claim has evidence links
    for (const s of draft.sentenceIndex) {
      if (s.classifiedAs === "applicant-claim") {
        expect(s.linkedEvidenceIds.length).toBeGreaterThan(0);
      }
      if (s.classifiedAs === "school-claim") {
        expect(s.linkedCitationIds.length).toBeGreaterThan(0);
      }
    }
  });

  test("refuses categories other than mission-fit in Gate 4", () => {
    const badPrompt = { ...GATE4_FIXTURE_BUNDLE.prompt, category: "diversity" };
    expect(() =>
      runDraftGeneration({
        prompt: badPrompt,
        schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
        evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
        matches: { matches: [{ evidenceId: "x", score: 1, reasonCodes: [] }, { evidenceId: "y", score: 1, reasonCodes: [] }] },
        fitBrief: { fitStatements: [{ axisKey: "mission-service", brief: "b", programName: "P", citationRefs: ["c"] }] },
        seed: 0,
      })
    ).toThrow(/supports only mission-fit/);
  });

  test("throws (never falls back) on unknown evidenceType", () => {
    const badEvidence = {
      ...GATE4_FIXTURE_BUNDLE.evidenceItems[0],
      evidenceType: "other-unknown",
    };
    expect(() =>
      runDraftGeneration({
        prompt: GATE4_FIXTURE_BUNDLE.prompt,
        schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
        evidenceItems: [badEvidence, GATE4_FIXTURE_BUNDLE.evidenceItems[1]],
        matches: { matches: [
          { evidenceId: badEvidence.evidenceId, score: 1, reasonCodes: [] },
          { evidenceId: GATE4_FIXTURE_BUNDLE.evidenceItems[1].evidenceId, score: 1, reasonCodes: [] },
        ] },
        fitBrief: { fitStatements: [{ axisKey: "mission-service", brief: "b", programName: "P", citationRefs: ["c"] }] },
        seed: 0,
      })
    ).toThrow(/no curated paraphrase/);
  });
});

describe("draftIntegrity (on healthy fixture)", () => {
  test("no blocking hits during drafting phase", () => {
    const interp = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    const matches = runStoryMatch({
      interpretation: interp,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      seed: GATE4_RUN_SEED,
    });
    const fitBrief = runSchoolFit({
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      citations: GATE4_FIXTURE_BUNDLE.citations,
    });
    const draft = runDraftGeneration({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      matches,
      fitBrief,
      seed: GATE4_RUN_SEED,
    });
    const integrity = runDraftIntegrity({
      draft,
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      citations: GATE4_FIXTURE_BUNDLE.citations,
      doNotUseTopics: GATE4_FIXTURE_BUNDLE.doNotUseTopics,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
      phase: "drafting",
    });
    expect(integrity.blocking).toEqual([]);
  });
});

describe("interviewQuestions", () => {
  test("emits one question per fit axis", () => {
    const interp = runPromptInterpretation({
      prompt: GATE4_FIXTURE_BUNDLE.prompt,
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
    });
    const matches = runStoryMatch({
      interpretation: interp,
      evidenceItems: GATE4_FIXTURE_BUNDLE.evidenceItems,
      seed: GATE4_RUN_SEED,
    });
    const out = runInterviewQuestions({
      schoolResearch: GATE4_FIXTURE_BUNDLE.schoolResearch,
      schoolListEntry: GATE4_FIXTURE_BUNDLE.schoolListEntry,
      citations: GATE4_FIXTURE_BUNDLE.citations,
      matches,
      interviewPrepInputs: GATE4_FIXTURE_BUNDLE.interviewPrepInputs,
    });
    expect(out.questions.length).toBe(
      GATE4_FIXTURE_BUNDLE.schoolResearch.fitAxes.length
    );
    for (const q of out.questions) {
      expect(q.sourceCitationId).toBeTruthy();
      expect(q.expectedThemes.length).toBeGreaterThan(0);
      expect(q.mappedEvidenceIds.length).toBeGreaterThan(0);
    }
  });
});
