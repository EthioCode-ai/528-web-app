"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/diagnostic", label: "Diagnostic", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/tutor", label: "AI Tutor", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
  { href: "/flashcards", label: "Flashcards", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { href: "/journal", label: "Wrong Answer Journal", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/study-plan", label: "Study Plan", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/scan", label: "MCAT Scanner", icon: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" },
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
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated()) return null;

  const tier = user?.subscription_tier || "free";
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-slate-200 flex flex-col font-[Inter]">
        {/* Logo */}
        <div className="px-6 pt-7 pb-6 border-b border-slate-100">
          <h1 className="text-xl font-extrabold text-[#1a56db] tracking-tight">
            528 AI
          </h1>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5 tracking-wide uppercase">
            MCAT Study Engine
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium mb-0.5 transition-colors ${
                  isActive
                    ? "bg-[#1a56db]/10 text-[#1a56db]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <svg
                  className="w-[18px] h-[18px] flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={link.icon}
                  />
                </svg>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="px-4 pb-5 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#1a56db] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {displayName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 truncate">
                {displayName}
              </p>
              <span
                className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${tierStyles[tier] || tierStyles.free}`}
              >
                {tier}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-[13px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 bg-slate-100 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
