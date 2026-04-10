import { create } from "zustand";

const useAuthStore = create((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  user: null,

  isAuthenticated: () => !!get().token,

  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user });
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
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
