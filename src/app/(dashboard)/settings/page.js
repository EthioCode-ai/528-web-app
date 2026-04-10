"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import useDiagnosticStore from "@/stores/diagnosticStore";
import useThemeStore from "@/stores/themeStore";

export default function SettingsPage() {
  const router = useRouter();
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
