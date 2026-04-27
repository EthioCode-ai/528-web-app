// Admin-only theme store. Completely independent of useThemeStore (the
// student-app theme). Persists to its own localStorage key, NEVER touches
// document.documentElement, NEVER imports or touches the student store.
//
// The admin layout reads `dark` and applies `className={dark ? "dark" : ""}`
// to its own root wrapper div. Tailwind's `dark:` utilities then activate
// only inside admin. Default is dark per "operator-grade dashboard" intent.
import { create } from "zustand";

const STORAGE_KEY = "admin_theme";

function readInitial() {
  if (typeof window === "undefined") return true; // SSR safe — default dark
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return false;
  if (stored === "dark") return true;
  return true; // unset → default dark
}

const useAdminTheme = create((set) => ({
  dark: readInitial(),
  toggle: () =>
    set((state) => {
      const next = !state.dark;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      } catch {}
      return { dark: next };
    }),
  initialize: () => set({ dark: readInitial() }),
}));

export default useAdminTheme;
