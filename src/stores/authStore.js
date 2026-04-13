import { create } from "zustand";
import { identify as phIdentify, reset as phReset } from "@/lib/analytics";

// Shape the properties we send to PostHog identify(). Null/undefined props
// are dropped so we don't overwrite existing values with empties.
function userToProps(user) {
  if (!user) return {};
  const props = {};
  if (user.email) props.email = user.email;
  if (user.first_name) props.first_name = user.first_name;
  if (user.last_name) props.last_name = user.last_name;
  if (user.subscription_tier) props.subscription_tier = user.subscription_tier;
  if (user.subscription_plan) props.subscription_plan = user.subscription_plan;
  if (user.target_score) props.target_score = user.target_score;
  if (user.test_date) props.test_date = user.test_date;
  return props;
}

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
      if (user?.id) phIdentify(user.id, userToProps(user));
    } catch {
      set({ initialized: true });
    }
  },

  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user, initialized: true });
    // Fresh login/register — identify immediately so signup_completed and
    // subsequent events in the same session attach to the real user.
    if (user?.id) phIdentify(user.id, userToProps(user));
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
      // Refresh person properties so PostHog has the latest tier, target
      // score, exam date, etc. identify() is idempotent when called with
      // the same distinct_id — it just merges properties.
      if (merged?.id) phIdentify(merged.id, userToProps(merged));
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
