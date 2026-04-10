import { create } from "zustand";

const useThemeStore = create((set) => ({
  dark: typeof window !== "undefined" ? localStorage.getItem("theme") === "dark" : false,

  toggle: () =>
    set((state) => {
      const next = !state.dark;
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return { dark: next };
    }),

  initialize: () => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    set({ dark: isDark });
  },
}));

export default useThemeStore;
