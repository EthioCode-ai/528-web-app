import { create } from "zustand";
import { apiFetch } from "@/lib/api";

const useDiagnosticStore = create((set, get) => ({
  attemptId: null,
  question: null,
  questionNumber: 0,
  totalQuestions: 20,
  selected: null,
  submitted: false,
  isCorrect: null,
  loading: false,
  results: null,
  sectionFilter: null,
  stats: {},
  gapAnalysis: null,
  trialExpired: false,
  _topicId: null,
  _sectionId: null,

  startDiagnostic: async (totalQuestions = 20) => {
    set({ loading: true, results: null, stats: {}, questionNumber: 0, sectionFilter: null, trialExpired: false });
    try {
      const data = await apiFetch("/diagnostic/start", {
        method: "POST",
        body: JSON.stringify({ totalQuestions }),
      });
      set({ attemptId: data.id, totalQuestions, loading: false });
      await get().fetchNextQuestion();
      return true;
    } catch (err) {
      if (err.message?.includes("trial_expired")) {
        set({ loading: false, trialExpired: true });
      } else {
        set({ loading: false });
      }
      return false;
    }
  },

  startSectionDrill: async (sectionCode) => {
    set({ loading: true, results: null, stats: {}, questionNumber: 0, sectionFilter: sectionCode, trialExpired: false });
    try {
      const data = await apiFetch("/diagnostic/start", {
        method: "POST",
        body: JSON.stringify({ totalQuestions: 100, sectionCode }),
      });
      set({ attemptId: data.id, totalQuestions: 100, loading: false });
      await get().fetchNextQuestion();
      return true;
    } catch (err) {
      if (err.message?.includes("trial_expired")) {
        set({ loading: false, sectionFilter: null, trialExpired: true });
      } else {
        set({ loading: false, sectionFilter: null });
      }
      return false;
    }
  },

  fetchNextQuestion: async () => {
    const { attemptId, sectionFilter } = get();
    if (!attemptId) return;
    set({ loading: true, selected: null, submitted: false, isCorrect: null });
    try {
      const url = sectionFilter
        ? `/diagnostic/${attemptId}/next?section=${sectionFilter}`
        : `/diagnostic/${attemptId}/next`;
      const data = await apiFetch(url);
      set({
        question: data.question,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions,
        loading: false,
        _topicId: data.topicId,
        _sectionId: data.sectionId,
      });
    } catch (err) {
      if (err.message?.includes("completed")) {
        await get().completeDiagnostic();
      } else {
        set({ loading: false });
      }
    }
  },

  selectAnswer: (letter) => {
    if (!get().submitted) {
      set({ selected: letter });
    }
  },

  submitAnswer: async (timeSpent) => {
    const { attemptId, question, selected, _topicId, _sectionId } = get();
    if (!selected || !question) return;

    set({ loading: true });
    try {
      const data = await apiFetch(`/diagnostic/${attemptId}/answer`, {
        method: "POST",
        body: JSON.stringify({
          topicId: _topicId,
          sectionId: _sectionId,
          questionJson: question,
          userAnswer: selected,
          timeSpent,
        }),
      });

      const isCorrect = data.isCorrect;
      const section = question.section || "Unknown";
      const topic = question.topic || "Unknown";
      const key = `${section}|${topic}`;

      set((state) => ({
        submitted: true,
        isCorrect,
        loading: false,
        stats: {
          ...state.stats,
          [key]: {
            correct: (state.stats[key]?.correct || 0) + (isCorrect ? 1 : 0),
            total: (state.stats[key]?.total || 0) + 1,
          },
        },
      }));

      get().getGapAnalysis();
    } catch {
      set({ loading: false });
    }
  },

  completeDiagnostic: async () => {
    const { attemptId } = get();
    if (!attemptId) return;
    set({ loading: true });
    try {
      const data = await apiFetch(`/diagnostic/${attemptId}/complete`, {
        method: "POST",
      });
      set({ results: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  getGapAnalysis: async () => {
    try {
      const data = await apiFetch("/diagnostic/gap-analysis");
      set({ gapAnalysis: data });
      return data;
    } catch {
      return null;
    }
  },

  reset: () =>
    set({
      attemptId: null,
      question: null,
      questionNumber: 0,
      selected: null,
      submitted: false,
      isCorrect: null,
      loading: false,
      results: null,
      sectionFilter: null,
      stats: {},
      trialExpired: false,
    }),
}));

export default useDiagnosticStore;
