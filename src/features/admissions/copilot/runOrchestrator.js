// Composes the six engines in order and returns the full run report.
// See plan v0.2 §4.2. Runs under the runGuard so any unapproved
// fetch escaping an engine throws immediately.

import { v5 as uuidv5 } from "uuid";
import { isCopilotDevModeAllowed } from "./isCopilotDevModeAllowed.js";
import { withRunGuard } from "./runGuard.js";
import { runPromptInterpretation } from "./engines/promptInterpretation.js";
import { runStoryMatch } from "./engines/storyMatch.js";
import { runSchoolFit } from "./engines/schoolFit.js";
import { runDraftGeneration } from "./engines/draftGeneration.js";
import { runDraftIntegrity } from "./engines/draftIntegrity.js";
import { runInterviewQuestions } from "./engines/interviewQuestions.js";
import {
  GATE4_RUN_NAMESPACE_UUID,
  GATE4_RUN_SEED,
  RUN_PHASE,
} from "./constants.js";

/**
 * @param {object} inputs a GATE4_FIXTURE_BUNDLE-shaped object
 * @param {object} [opts]
 * @param {number} [opts.seed=GATE4_RUN_SEED]
 * @param {(phase: string) => void} [opts.onPhase]
 * @param {boolean} [opts.skipDevModeGate=false]  // tests may bypass
 * @returns {Promise<object>} runReport
 */
export async function runOrchestrator(inputs, opts = {}) {
  const seed = opts.seed ?? GATE4_RUN_SEED;
  const onPhase = opts.onPhase || (() => {});
  if (!opts.skipDevModeGate && !isCopilotDevModeAllowed()) {
    throw new Error(
      "runOrchestrator: refused — isCopilotDevModeAllowed() is false. " +
        "Set NODE_ENV=development AND NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED=1 " +
        "for local development. Never enable in production."
    );
  }

  return await withRunGuard(async () => {
    const runId = uuidv5(
      `run::${inputs.prompt.promptId}::${seed}`,
      GATE4_RUN_NAMESPACE_UUID
    );

    onPhase(RUN_PHASE.INTERPRETING);
    const interpretation = runPromptInterpretation({
      prompt: inputs.prompt,
      schoolResearch: inputs.schoolResearch,
    });

    onPhase(RUN_PHASE.MATCHING);
    const matches = runStoryMatch({
      interpretation,
      evidenceItems: inputs.evidenceItems,
      seed,
    });

    onPhase(RUN_PHASE.FITTING);
    const fitBrief = runSchoolFit({
      schoolResearch: inputs.schoolResearch,
      schoolListEntry: inputs.schoolListEntry,
      citations: inputs.citations,
    });

    onPhase(RUN_PHASE.DRAFTING);
    const draft = runDraftGeneration({
      prompt: inputs.prompt,
      schoolListEntry: inputs.schoolListEntry,
      evidenceItems: inputs.evidenceItems,
      matches,
      fitBrief,
      seed,
    });

    onPhase(RUN_PHASE.CHECKING);
    const integrityDrafting = runDraftIntegrity({
      draft,
      prompt: inputs.prompt,
      evidenceItems: inputs.evidenceItems,
      citations: inputs.citations,
      doNotUseTopics: inputs.doNotUseTopics,
      schoolListEntry: inputs.schoolListEntry,
      schoolResearch: inputs.schoolResearch,
      phase: "drafting",
    });

    onPhase(RUN_PHASE.INTERVIEWING);
    const interviewPack = runInterviewQuestions({
      schoolResearch: inputs.schoolResearch,
      schoolListEntry: inputs.schoolListEntry,
      citations: inputs.citations,
      matches,
      interviewPrepInputs: inputs.interviewPrepInputs,
    });

    onPhase(RUN_PHASE.DONE);
    return {
      runId,
      seed,
      contractVersion: null,
      interpretation,
      matches,
      fitBrief,
      draft,
      integrity: integrityDrafting,
      interviewPack,
    };
  });
}
