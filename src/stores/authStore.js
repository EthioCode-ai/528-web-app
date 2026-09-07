import { create } from "zustand";
import { identify as phIdentify, reset as phReset } from "@/lib/analytics";

const useAuthStore = create((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  user: null,
  initialized: false,

  isAuthenticated: () => !!get().token,

  initialize: async () => {
    const token = get().token;
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { apiFetch } = await import("@/lib/api");
      const user = await apiFetch("/auth/me");
      set({ user, initialized: true });
      // Attach analytics identity to the existing (anonymous) session so
      // prior events get stitched to this user.
      if (user?.id) phIdentify(user.id);
    } catch {
      set({ initialized: true });
    }
  },

  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user, initialized: true });
    // Fresh login/register — identify immediately so signup_completed and
    // subsequent events in the same session attach to the real user.
    if (user?.id) phIdentify(user.id);
  },

  setUser: (user) => set({ user }),

  updateProfile: async (data) => {
    try {
      const { apiFetch } = await import("@/lib/api");
      const res = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      const merged = { ...get().user, ...res };
      set({ user: merged });
      if (merged?.id) phIdentify(merged.id);
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    // Reset PostHog BEFORE clearing auth state — this ends the identified
    // session cleanly so the next user (or fresh anonymous session) starts
    // with a new distinct_id instead of inheriting the old one.
    phReset();
    localStorage.removeItem("token");
    document.cookie = "bc_token=; path=/; max-age=0";
    set({ token: null, user: null, initialized: true });
  },
}));

export default useAuthStore;
