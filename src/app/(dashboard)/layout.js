"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import useThemeStore from "@/stores/themeStore";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/diagnostic", label: "Diagnostic", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/tutor", label: "AI Tutor", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { href: "/flashcards", label: "Flashcards", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { href: "/journal", label: "Wrong Answers", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/study-plan", label: "Study Plan", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/scan", label: "Scanner", icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const tierStyles = {
  free: "bg-gray-100 text-gray-600",
  scholar: "bg-blue-100 text-blue-700",
  elite: "bg-yellow-100 text-yellow-700",
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
  const [collapsed, setCollapsed] = useState(false);

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
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"} pt-5 pb-4 border-b border-slate-100`}>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-extrabold text-[#1a56db] tracking-tight leading-tight">528 AI</h1>
              <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">MCAT Study Engine</p>
            </div>
          )}
          {collapsed && (
            <h1 className="text-lg font-extrabold text-[#1a56db]">5</h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer transition-colors"
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
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={`flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${collapsed ? "px-0 py-2.5" : "px-3 py-2"} rounded-lg text-[13px] font-medium mb-0.5 transition-colors ${
                  isActive
                    ? "bg-[#1a56db]/10 text-[#1a56db]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
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
                {!collapsed && link.label}
              </Link>
            );
          })}
        </nav>

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
      </aside>

      {/* Main content */}
      <main className={`${mainMargin} flex-1 bg-[var(--bg-main)] min-h-screen transition-all duration-200`}>
        <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
