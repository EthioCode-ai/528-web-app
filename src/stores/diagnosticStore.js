import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";

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
      // Backend may cap totalQuestions for free-tier users (10 for first-ever,
      // 5 for subsequent). Read the authoritative value from the response so
      // the progress header doesn't flash the requested count before correcting.
      const effectiveTotal = data.total_questions || totalQuestions;
      set({ attemptId: data.id, totalQuestions: effectiveTotal, loading: false });
      track("diagnostic_started", { attemptId: data.id, totalQuestions: effectiveTotal });
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
      track("section_drill_started", { attemptId: data.id, sectionCode });
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

      if (!isCorrect) {
        // Fires once per wrong answer at the moment the backend confirms
        // isCorrect === false. Distinct from wrong_answer_reviewed
        // (journal/page.js:69) which fires when a user opens a previously
        // wrong answer for review. userAnswer + correctAnswer are NOT
        // passed — the sensitive-key denylist would strip "answer_text"
        // anyway; explicit omission for clarity.
        track("wrong_answer_logged", {
          attempt_id: attemptId,
          question_id: question?.id,
          subject: section,
          topic,
          subtopic: question?.subtopic,
          difficulty: question?.difficulty,
        });
      }

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
    const { attemptId, sectionFilter } = get();
    if (!attemptId) return;
    set({ loading: true });
    try {
      const data = await apiFetch(`/diagnostic/${attemptId}/complete`, {
        method: "POST",
      });
      set({ results: data, loading: false });
      track("diagnostic_completed", {
        attemptId,
        sectionFilter,
        correct: data?.correct,
        total: data?.total,
        accuracy: data?.total ? Math.round((data.correct / data.total) * 100) : null,
      });
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
