"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import useDiagnosticStore from "@/stores/diagnosticStore";
import useThemeStore from "@/stores/themeStore";

// ============================================================
// Subscription helpers (module-level — pure functions)
// ============================================================

// Column order in the pricing table — left to right
const PLAN_INTERVALS = [
  { key: "monthly", label: "Monthly", planSuffix: "_monthly" },
  { key: "6month",  label: "6 Months", planSuffix: "_6month" },
  { key: "annual",  label: "Annual",  planSuffix: "_annual" },
];

// Row order in the pricing table — top to bottom
const PLAN_TIERS = [
  {
    tier: "scholar",
    label: "Scholar",
    description: "AI-adaptive diagnostics, flashcards, and study plan",
    accent: { ring: "ring-blue-200", bg: "bg-blue-50", text: "text-blue-700", btn: "bg-[#1a56db] hover:bg-[#1648b8]" },
  },
  {
    tier: "elite",
    label: "Elite",
    description: "Everything in Scholar + Power Study Group + Tutor sessions",
    accent: { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-700", btn: "bg-amber-500 hover:bg-amber-600" },
  },
];

function formatPriceAmount(price) {
  if (price?.unit_amount == null) return "—";
  return `$${(price.unit_amount / 100).toFixed(2)}`;
}

function intervalLabel(price) {
  if (!price?.interval) return "";
  if (price.interval === "month" && price.interval_count === 1) return "/ month";
  if (price.interval === "month" && price.interval_count === 6) return "every 6 months";
  if (price.interval === "year" && price.interval_count === 1) return "/ year";
  return "";
}

// Compute savings vs the same tier's monthly plan, returns rounded % or null.
function computeSavingsPercent(price, prices) {
  if (!price?.unit_amount || !price.interval) return null;
  const monthly = prices.find(
    (p) => p.tier === price.tier && p.plan.endsWith("_monthly")
  );
  if (!monthly?.unit_amount) return null;
  let months;
  if (price.interval === "month") months = price.interval_count || 1;
  else if (price.interval === "year") months = (price.interval_count || 1) * 12;
  else return null;
  if (months <= 1) return null;
  const equivMonthly = price.unit_amount / months;
  const pct = Math.round((1 - equivMonthly / monthly.unit_amount) * 100);
  return pct > 0 ? pct : null;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const diagnosticReset = useDiagnosticStore((s) => s.reset);
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [targetScore, setTargetScore] = useState(String(user?.target_score || "510"));
  const [examDate, setExamDate] = useState(user?.test_date ? user.test_date.split("T")[0] : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ----- Subscription state -----
  const tier = user?.subscription_tier || "free";
  const isElite = tier === "elite" || tier === "vip";
  const currentPlan = user?.subscription_plan || null;

  const [prices, setPrices] = useState(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState(null);
  const [subscribingPriceId, setSubscribingPriceId] = useState(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch the 6 prices on mount unless the user is already Elite/VIP
  // (Elite users see the manage-subscription card, no pricing table).
  useEffect(() => {
    if (isElite) return;
    let cancelled = false;
    setPricesLoading(true);
    apiFetch("/stripe/prices")
      .then((data) => {
        if (cancelled) return;
        setPrices(Array.isArray(data) ? data : []);
        setPricesLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setPricesError(err.message || "Failed to load pricing");
        setPricesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isElite]);

  // Handle ?success=true after a successful Stripe checkout return.
  // 1) Refresh user data so the tier badge / pricing table reflect the
  //    new subscription (set server-side via webhook).
  // 2) Show the success banner.
  // 3) Strip ?success from the URL so refresh doesn't re-fire it.
  useEffect(() => {
    if (searchParams?.get("success") !== "true") return;
    let cancelled = false;
    setShowSuccess(true);
    apiFetch("/auth/me")
      .then((freshUser) => {
        if (!cancelled && freshUser) setUser(freshUser);
      })
      .catch(() => {
        // Non-fatal — banner still shows; tier will catch up on next load
      });
    router.replace("/settings", { scroll: false });
    const fadeTimer = setTimeout(() => {
      if (!cancelled) setShowSuccess(false);
    }, 10000);
    return () => {
      cancelled = true;
      clearTimeout(fadeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe(priceId) {
    if (subscribingPriceId) return;
    setSubscribingPriceId(priceId);
    setStripeError(null);
    try {
      const result = await apiFetch("/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ priceId }),
      });
      if (!result?.url) throw new Error("No checkout URL returned");
      // External redirect — must use window.location, not router.push
      window.location.href = result.url;
    } catch (err) {
      setStripeError(err.message || "Failed to start checkout");
      setSubscribingPriceId(null);
    }
  }

  async function handleManagePortal() {
    if (managingPortal) return;
    setManagingPortal(true);
    setStripeError(null);
    try {
      const result = await apiFetch("/stripe/portal", { method: "POST" });
      if (!result?.url) throw new Error("No portal URL returned");
      window.location.href = result.url;
    } catch (err) {
      setStripeError(err.message || "Failed to open portal");
      setManagingPortal(false);
    }
  }

  const handleSave = async () => {
    let testDate = null;
    if (examDate) {
      const d = new Date(examDate);
      if (d < new Date()) {
        alert("Exam date must be in the future.");
        return;
      }
      testDate = d.toISOString();
    }

    setSaving(true);
    setSaved(false);
    const success = await updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      targetScore: parseInt(targetScore) || 510,
      testDate,
    });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Failed to save changes.");
    }
  };

  const handleResetProgress = async () => {
    if (!confirm("This will permanently delete ALL your diagnostic results, flashcards, study plans, tutor sessions, and mastery scores. This cannot be undone.")) return;

    setResetting(true);
    try {
      const data = await apiFetch("/auth/reset-progress", { method: "POST" });
      if (data?.user) setUser(data.user);
      diagnosticReset();
      useDiagnosticStore.setState({ gapAnalysis: null });
      alert("Your progress has been reset.");
      router.push("/dashboard");
    } catch {
      alert("Failed to reset progress.");
    }
    setResetting(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("This will permanently delete your account and all associated data. This cannot be undone.")) return;

    try {
      await apiFetch("/auth/account", { method: "DELETE" });
      logout();
      window.location.href = "/login";
    } catch {
      alert("Failed to delete account. Please try again.");
    }
  };

  const handleSignOut = () => {
    if (!confirm("Are you sure you want to sign out?")) return;
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success banner — shown after Stripe checkout return */}
      {showSuccess && (
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 mb-6 shadow-lg flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wider opacity-90">Subscription activated</p>
              <p className="text-base font-semibold">Welcome aboard. Your account has been upgraded.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-white/80 hover:text-white text-xl font-bold flex-shrink-0 leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold text-[#1a56db] hover:underline cursor-pointer">← Back</button>
        <h1 className="text-lg font-extrabold text-slate-900">Settings</h1>
        <div className="w-16" />
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-5">Profile</h2>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[15px] text-slate-900 outline-none focus:border-[#1a56db]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[15px] text-slate-900 outline-none focus:border-[#1a56db]"
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email</label>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[15px] text-slate-400">
            {user?.email || ""}
          </div>
        </div>

        {/* Target score */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Target MCAT Score</label>
          <input
            type="number"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder="e.g. 510"
            min={472}
            max={528}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[15px] text-slate-900 outline-none focus:border-[#1a56db]"
          />
          <p className="text-[11px] text-slate-400 mt-1">Range: 472 — 528</p>
        </div>

        {/* Exam date */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">MCAT Exam Date</label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-[15px] text-slate-900 outline-none focus:border-[#1a56db]"
          />
          {examDate && (
            <button onClick={() => setExamDate("")} className="text-xs text-[#1a56db] mt-1.5 cursor-pointer hover:underline">
              Clear date
            </button>
          )}
          <p className="text-[11px] text-slate-400 mt-1">Used to customize your study plan timeline</p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white cursor-pointer ${
            saving ? "bg-blue-300" : saved ? "bg-emerald-500" : "bg-[#1a56db] hover:bg-[#1648b8]"
          }`}
        >
          {saving ? "Saving..." : saved ? "✔ Saved" : "Save Changes"}
        </button>
      </div>

      {/* Subscription */}
      <div id="subscription" className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900">Subscription</h2>
          {(tier === "scholar" || isElite) && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
              isElite ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
            }`}>
              {isElite ? "Elite" : "Scholar"}
            </span>
          )}
        </div>

        {stripeError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
            <span>{stripeError}</span>
            <button onClick={() => setStripeError(null)} className="text-red-500 hover:text-red-700 font-bold" aria-label="Dismiss error">×</button>
          </div>
        )}

        {/* ELITE / VIP — manage card only, no pricing table */}
        {isElite && (
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">Current plan</p>
                <p className="text-2xl font-extrabold leading-tight">You're on Elite</p>
              </div>
            </div>
            <p className="text-sm text-white/90 mb-5">
              Full access to Power Study Group, AI tutor sessions, unlimited diagnostics, and everything else. Manage your billing, change plans, or cancel any time through the Stripe portal.
            </p>
            <button
              onClick={handleManagePortal}
              disabled={managingPortal}
              className="bg-white text-amber-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {managingPortal ? "Opening portal…" : "Manage subscription"}
            </button>
          </div>
        )}

        {/* FREE / SCHOLAR — pricing table */}
        {!isElite && (
          <>
            <p className="text-sm text-slate-500 mb-5">
              Pick a plan to unlock more of 528 AI. Cancel any time.
            </p>

            {pricesLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {pricesError && !pricesLoading && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                Couldn&apos;t load pricing. Refresh the page to try again.
              </div>
            )}

            {!pricesLoading && !pricesError && prices && prices.length > 0 && (
              <div className="space-y-5">
                {PLAN_TIERS.map((tierMeta) => (
                  <div key={tierMeta.tier}>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className={`text-sm font-bold uppercase tracking-wider ${tierMeta.accent.text}`}>
                        {tierMeta.label}
                      </h3>
                      <p className="text-xs text-slate-400">{tierMeta.description}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PLAN_INTERVALS.map((interval) => {
                        const price = prices.find(
                          (p) => p.tier === tierMeta.tier && p.plan === `${tierMeta.tier}${interval.planSuffix}`
                        );
                        if (!price) {
                          return (
                            <div key={interval.key} className="rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400 text-center">
                              {interval.label} unavailable
                            </div>
                          );
                        }
                        const savings = computeSavingsPercent(price, prices);
                        const isAnnual = interval.key === "annual";
                        const isCurrent = currentPlan === price.plan;
                        const isThisLoading = subscribingPriceId === price.id;
                        return (
                          <div
                            key={price.id}
                            className={`relative rounded-xl border-2 p-4 transition-all ${
                              isCurrent
                                ? `border-slate-300 bg-slate-50`
                                : isAnnual
                                ? `border-emerald-300 bg-emerald-50/30 ring-1 ${tierMeta.accent.ring}`
                                : `border-slate-200 hover:border-slate-300`
                            }`}
                          >
                            {isAnnual && !isCurrent && (
                              <span className="absolute -top-2 left-3 text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded">
                                Best value
                              </span>
                            )}
                            {savings && !isCurrent && (
                              <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-0.5 rounded">
                                Save {savings}%
                              </span>
                            )}
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              {interval.label}
                            </p>
                            <p className="text-2xl font-extrabold text-slate-900 leading-none mb-1">
                              {formatPriceAmount(price)}
                            </p>
                            <p className="text-[11px] text-slate-400 mb-3">{intervalLabel(price)}</p>
                            {isCurrent ? (
                              <button
                                disabled
                                className="w-full bg-slate-200 text-slate-500 font-bold text-sm py-2.5 rounded-lg cursor-not-allowed"
                              >
                                Current plan
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSubscribe(price.id)}
                                disabled={subscribingPriceId !== null}
                                className={`w-full ${tierMeta.accent.btn} text-white font-bold text-sm py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors`}
                              >
                                {isThisLoading ? "Starting…" : "Subscribe"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-slate-400 text-center pt-2">
                  Secure checkout powered by Stripe. Cancel any time from this page.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-[var(--bg-card)] border border-slate-200 dark:border-[var(--border-color)] rounded-2xl p-6 mb-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-[var(--text-primary)] mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-[var(--text-primary)]">Dark Mode</p>
            <p className="text-xs text-slate-400 mt-0.5">Switch between light and dark themes</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
              dark ? "bg-[#1a56db]" : "bg-slate-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                dark ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-2xl p-6 mb-4 shadow-sm">
        <h2 className="text-base font-bold text-red-500 mb-4">Danger Zone</h2>

        <button
          onClick={handleResetProgress}
          disabled={resetting}
          className="w-full border-2 border-red-300 rounded-xl p-4 text-left mb-3 cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <p className="text-sm font-bold text-red-500">Reset All Progress</p>
          <p className="text-xs text-slate-500 mt-1">Delete all diagnostic results, flashcards, study plans, tutor sessions, and mastery scores</p>
        </button>

        <button
          onClick={handleDeleteAccount}
          className="w-full border-2 border-red-300 rounded-xl p-4 text-left cursor-pointer hover:bg-red-50 transition-colors"
        >
          <p className="text-sm font-bold text-red-500">Delete Account</p>
          <p className="text-xs text-slate-500 mt-1">Permanently delete your account and all associated data. This cannot be undone.</p>
        </button>
      </div>

      {/* Footer */}
      <div className="text-center mt-5 mb-2 space-y-3">
        <a href="https://neuromart.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 underline hover:text-slate-600">
          Privacy Policy
        </a>
        <a href="mailto:support@neuromart.ai" className="block text-sm text-slate-400 underline hover:text-slate-600">
          Contact Support
        </a>
        <p className="text-[11px] text-slate-300 mt-2">528 AI v1.0.0 | Powered by Neuromart</p>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full border border-slate-200 rounded-xl py-3.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer mt-2 mb-8"
      >
        Sign Out
      </button>
    </div>
  );
}
