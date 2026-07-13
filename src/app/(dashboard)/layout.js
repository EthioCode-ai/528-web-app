"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import useThemeStore from "@/stores/themeStore";
import PeriodicTableModal from "@/components/PeriodicTableModal";
import TopBar from "@/components/TopBar";

// Admissions Copilot — inserted after Study Plan in the visible list
// only when the caller is tier ∈ {elite, vip}. Non-Elite users don't
// see the entry; Elite users without the admissions_copilot entitlement
// see it but land on /admissions/unavailable via the backend feature-
// gate detection. Client-side hiding is UX; backend gate is truth.
const admissionsLink = {
  href: "/admissions",
  label: "Admissions",
  badge: "Elite+",
  icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222",
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/diagnostic", label: "Diagnostic", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/section-drill", label: "Section Drill", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { href: "/study-group", label: "Study Group", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/journal", label: "Wrong Answers", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/flashcards", label: "Flashcards", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { href: "/study-plan", label: "Study Plan", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/scan", label: "Scanner", icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const tierStyles = {
  free: "bg-gray-100 text-gray-600",
  scholar: "bg-blue-100 text-blue-700",
  elite: "bg-amber-600 text-white",
  vip: "bg-purple-100 text-purple-700",
};

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initTheme = useThemeStore((s) => s.initialize);
  const darkMode = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [collapsed, setCollapsed] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      initialize();
      initTheme();
    }
  }, []);

  if (!isAuthenticated()) return null;

  // Show loading while fetching user
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tier = user?.subscription_tier || "free";
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";
  const mainMargin = collapsed ? "ml-[68px]" : "ml-60";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen ${sidebarWidth} bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col transition-all duration-200 z-30`}>
        {/* Logo + Collapse toggle */}
        <div className={`relative ${collapsed ? "px-2" : "px-5"} pt-5 pb-4 border-b border-slate-100`}>
          {!collapsed && (
            <div className="flex flex-col items-center w-full">
              <img src="/logo.png" alt="528 AI" className="w-[120px] h-[120px] mb-2" />
              <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">MCAT Study Engine</p>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <img src="/logo.png" alt="528 AI" className="w-10 h-10" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} py-3 overflow-y-auto`}>
          {(() => {
            // Insert Admissions after Study Plan only for Elite / VIP.
            const showAdmissions = tier === "elite" || tier === "vip";
            const idx = navLinks.findIndex((l) => l.href === "/study-plan");
            const visibleLinks = showAdmissions && idx >= 0
              ? [...navLinks.slice(0, idx + 1), admissionsLink, ...navLinks.slice(idx + 1)]
              : navLinks;
            return visibleLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                data-testid={link.href === "/admissions" ? "sidebar-admissions-link" : undefined}
                className={`flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${collapsed ? "px-0 py-2.5" : "px-3 py-2"} rounded-lg text-[16px] font-medium mb-0.5 transition-colors ${
                  isActive
                    ? "bg-[#1a56db]/10 text-[#1a56db] dark:bg-[#1a56db]/25 dark:text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/50 dark:hover:text-white"
                }`}
              >
                <svg
                  className={`${collapsed ? "w-5 h-5" : "w-[18px] h-[18px]"} flex-shrink-0`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {!collapsed && (
                  <span className="inline-flex items-center gap-1.5">
                    {link.label}
                    {link.badge ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-600 text-white">
                        {link.badge}
                      </span>
                    ) : null}
                  </span>
                )}
              </Link>
            );
            });
          })()}

          {/* Periodic Table — opens a global modal (preserves current page state) */}
          <button
            type="button"
            onClick={() => setTableOpen(true)}
            title={collapsed ? "Periodic Table" : undefined}
            className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${collapsed ? "px-0 py-2.5" : "px-3 py-2"} rounded-lg text-[16px] font-medium mb-0.5 transition-colors cursor-pointer text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/50 dark:hover:text-white`}
          >
            {/* Atom glyph */}
            <svg
              className={`${collapsed ? "w-5 h-5" : "w-[18px] h-[18px]"} flex-shrink-0`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <ellipse cx="12" cy="12" rx="10" ry="4" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)" />
            </svg>
            {!collapsed && "Periodic Table"}
          </button>
        </nav>

        {/* Unlock Elite — hidden for Elite/VIP and when sidebar collapsed */}
        {!collapsed && tier !== "elite" && tier !== "vip" && (
          <div className="mx-3 mb-3 rounded-xl border border-[#1a56db]/20 bg-gradient-to-b from-[#1a56db]/8 to-[#1a56db]/4 p-4 text-center">
            <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-white flex items-center justify-center shadow-sm">
              {/* Crown */}
              <svg className="w-5 h-5 text-[#1a56db]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
              </svg>
            </div>
            <p className="text-[13px] font-bold text-slate-800 mb-1">Unlock Elite</p>
            <p className="text-[11px] text-slate-500 leading-snug mb-3">
              Get full access to AI tutors, premium analytics, and unlimited practice.
            </p>
            <Link
              href="/settings"
              className="block w-full bg-[#1a56db] text-white text-[12px] font-bold py-2 rounded-lg hover:bg-[#1648b8] transition-colors"
            >
              Upgrade to Elite
            </Link>
          </div>
        )}

        {/* User info + Logout */}
        <div className={`${collapsed ? "px-2" : "px-4"} pb-4 border-t border-slate-100 pt-3`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} mb-2`}>
            <div className={`${collapsed ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs"} rounded-full bg-[#1a56db] flex items-center justify-center text-white font-bold flex-shrink-0`}>
              {displayName[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">{displayName}</p>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${tierStyles[tier] || tierStyles.free}`}>
                  {tier}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`${collapsed ? "w-full flex justify-center" : "w-full text-left px-3"} text-[12px] font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors cursor-pointer`}
          >
            {collapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            ) : (
              "Log out"
            )}
          </button>
        </div>

        {/* Light/Dark mode toggle — full-width at bottom of sidebar */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (darkMode ? "Switch to light mode" : "Switch to dark mode") : undefined}
          className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3 mx-3 mb-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-700/50 dark:hover:text-white cursor-pointer transition-colors border border-slate-100`}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              {darkMode ? (
                // Sun glyph
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              ) : (
                // Moon glyph
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              )}
            </svg>
            {!collapsed && <span>{darkMode ? "Dark Mode" : "Light Mode"}</span>}
          </div>
          {!collapsed && (
            <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${darkMode ? "bg-[#1a56db]" : "bg-slate-200"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${darkMode ? "left-[18px]" : "left-0.5"}`} />
            </span>
          )}
        </button>
      </aside>

      {/* Main content */}
      <main className={`${mainMargin} flex-1 bg-[var(--bg-main)] min-h-screen transition-all duration-200`}>
        {/* Top-right header — notifications, achievements, avatar dropdown */}
        <div className="max-w-6xl mx-auto flex justify-end px-6 lg:px-10">
          <TopBar />
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-8 lg:px-10">
          {children}
        </div>
      </main>

      <PeriodicTableModal open={tableOpen} onClose={() => setTableOpen(false)} />
    </div>
  );
}
