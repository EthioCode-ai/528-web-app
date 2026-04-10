import { create } from "zustand";
import { apiFetch } from "@/lib/api";

const useTutorStore = create((set, get) => ({
  sessionId: null,
  messages: [],
  loading: false,

  startSession: async (questionJson, userAnswer, correctAnswer, topicId) => {
    set({ loading: true, messages: [] });
    try {
      const data = await apiFetch("/tutor/start", {
        method: "POST",
        body: JSON.stringify({ questionJson, userAnswer, correctAnswer, topicId }),
      });
      set({
        sessionId: data.sessionId,
        messages: [data.message],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  sendMessage: async (content, options = {}) => {
    const { sessionId } = get();
    if (!sessionId || !content.trim()) return;

    const userMsg = { role: "user", content: content.trim() };
    set((state) => ({ messages: [...state.messages, userMsg], loading: true }));

    try {
      const data = await apiFetch(`/tutor/${sessionId}/message`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim(), eli5: options.eli5 || false }),
      });
      set((state) => ({
        messages: [...state.messages, data.message],
        loading: false,
      }));
    } catch {
      set({ loading: false });
    }
  },

  resolveSession: async (resolution = "understood") => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      await apiFetch(`/tutor/${sessionId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution }),
      });
    } catch {}
    set({ sessionId: null, messages: [] });
  },

  reset: () => set({ sessionId: null, messages: [], loading: false }),
}));

export default useTutorStore;
