import { create } from "zustand";

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
    } catch {
      set({ initialized: true });
    }
  },

  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user, initialized: true });
  },

  setUser: (user) => set({ user }),

  updateProfile: async (data) => {
    try {
      const { apiFetch } = await import("@/lib/api");
      const res = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      set({ user: { ...get().user, ...res } });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    document.cookie = "bc_token=; path=/; max-age=0";
    set({ token: null, user: null, initialized: true });
  },
}));

export default useAuthStore;
