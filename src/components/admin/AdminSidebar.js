"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import useAdminTheme from "@/stores/adminThemeStore";
import Badge from "@/components/admin/ui/Badge";

const NAV = [
  { href: "/admin",                label: "Overview",      enabled: true,  iconPath: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/admin/users",          label: "Users",         enabled: true,  iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/admin/subscriptions",  label: "Subscriptions", enabled: true,  iconPath: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { href: "/admin/usage",          label: "Usage",         enabled: true,  iconPath: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/admin/cache",          label: "Cache",         enabled: false, phase: 3, iconPath: "M4 7v10c0 2 4 4 8 4s8-2 8-4V7M4 7c0 2 4 4 8 4s8-2 8-4M4 7c0-2 4-4 8-4s8 2 8 4" },
  { href: "/admin/content",        label: "Content",       enabled: false, phase: 3, iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/admin/engine",         label: "Engine",        enabled: false, phase: 4, iconPath: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/admin/system",         label: "System",        enabled: false, phase: 4, iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function AdminSidebar({ collapsed, setCollapsed }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const dark = useAdminTheme((s) => s.dark);
  const toggleTheme = useAdminTheme((s) => s.toggle);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Admin";

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";

  return (
    <aside className={`fixed top-0 left-0 h-screen ${sidebarWidth} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 z-30`}>
      {/* Header */}
      <div className={`relative ${collapsed ? "px-2" : "px-5"} pt-5 pb-4 border-b border-slate-100 dark:border-slate-800`}>
        {!collapsed ? (
          <div className="flex flex-col items-center w-full">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/>
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">Admin Console</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/>
              </svg>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
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

      {/* Nav */}
      <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} py-3 overflow-y-auto`}>
        {NAV.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const baseClasses = `flex items-center ${collapsed ? "justify-center" : ""} gap-3 ${collapsed ? "px-0 py-2.5" : "px-3 py-2"} rounded-lg text-[15px] font-medium mb-0.5 transition-colors`;

          if (!link.enabled) {
            return (
              <div
                key={link.href}
                title={collapsed ? `${link.label} — Phase ${link.phase}` : undefined}
                className={`${baseClasses} text-slate-300 dark:text-slate-600 cursor-not-allowed select-none`}
              >
                <svg className={`${collapsed ? "w-5 h-5" : "w-[18px] h-[18px]"} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.iconPath} />
                </svg>
                {!collapsed && (
                  <>
                    <span className="flex-1">{link.label}</span>
                    <Badge variant="outline" className="text-[9px] py-0 h-4 px-1.5">P{link.phase}</Badge>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`${baseClasses} ${
                isActive
                  ? "bg-purple-600/10 text-purple-700 dark:bg-purple-600/30 dark:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <svg className={`${collapsed ? "w-5 h-5" : "w-[18px] h-[18px]"} flex-shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={link.iconPath} />
              </svg>
              {!collapsed && link.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className={`${collapsed ? "px-2" : "px-4"} pb-2 border-t border-slate-100 dark:border-slate-800 pt-3`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"} mb-2`}>
          <div className={`${collapsed ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs"} rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {displayName[0]}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{displayName}</p>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                vip
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`${collapsed ? "w-full flex justify-center" : "w-full text-left px-3"} text-[12px] font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-colors cursor-pointer`}
        >
          {collapsed ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          ) : "Log out"}
        </button>
      </div>

      {/* Theme toggle (admin-only) */}
      <button
        onClick={toggleTheme}
        title={collapsed ? (dark ? "Switch to light mode" : "Switch to dark mode") : undefined}
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3 mx-3 mb-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors border border-slate-100 dark:border-slate-800`}
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            {dark ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            )}
          </svg>
          {!collapsed && <span>{dark ? "Dark" : "Light"}</span>}
        </div>
        {!collapsed && (
          <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${dark ? "bg-purple-600" : "bg-slate-200"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${dark ? "left-[18px]" : "left-0.5"}`} />
          </span>
        )}
      </button>
    </aside>
  );
}
