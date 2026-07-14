// Zustand store — in-memory only. Locked v0.2 decision 9:
// no localStorage, no sessionStorage. Session-only acknowledgements.

import { create } from "zustand";
import { RUN_PHASE } from "./constants.js";

const initialState = () => ({
  runId: null,
  phase: RUN_PHASE.IDLE,
  seed: null,
  report: null,          // full runOrchestrator return
  fixtures: null,        // the GATE4_FIXTURE_BUNDLE the run consumed
  focusedSentenceId: null,
  acknowledgements: [],  // string[] of ackowledged rule IDs, per session
  errors: [],
});

export const useAdmissionsRunStore = create((set, get) => ({
  ...initialState(),

  // Actions
  reset: () => set(initialState()),

  setPhase: (phase) => set({ phase }),

  loadFixtures: (bundle) =>
    set({ fixtures: bundle, phase: RUN_PHASE.LOADING, errors: [] }),

  completeRun: ({ report }) =>
    set({
      report,
      runId: report.runId,
      seed: report.seed,
      phase: RUN_PHASE.DONE,
    }),

  fail: (message) =>
    set((state) => ({
      phase: RUN_PHASE.ERROR,
      errors: [...state.errors, message],
    })),

  focusSentence: (sentenceId) => set({ focusedSentenceId: sentenceId }),

  acknowledgeWarning: (ruleId) =>
    set((state) =>
      state.acknowledgements.includes(ruleId)
        ? state
        : { acknowledgements: [...state.acknowledgements, ruleId] }
    ),

  clearAcknowledgements: () => set({ acknowledgements: [] }),
}));

// Selector helpers
export const selectHasBlocking = (s) =>
  s.report?.integrity?.blocking?.length > 0 || false;

export const selectAcknowledgedCount = (s) => s.acknowledgements.length;
