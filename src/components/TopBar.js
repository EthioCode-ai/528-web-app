"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useAuthStore from "@/stores/authStore";

// Top-right header floating on the dashboard's main content area.
// Holds notification bell, achievements trophy, and an avatar dropdown
// with profile / settings / logout. Bell + trophy are visual placeholders
// until the backend ships notifications and achievements endpoints.
export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";
  const initial = (displayName[0] || "U").toUpperCase();

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-2 px-5 py-4">
      {/* Bell */}
      <button
        type="button"
        onClick={() => alert("No new notifications — coming soon.")}
        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>

      {/* Trophy */}
      <button
        type="button"
        onClick={() => alert("Achievements coming soon.")}
        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
        aria-label="Achievements"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V4.5a4.5 4.5 0 11-9 0V3.75m9 0h2.25a.75.75 0 01.75.75v1.5a3.75 3.75 0 01-3 3.675M16.5 3.75h-9m0 0H5.25a.75.75 0 00-.75.75v1.5a3.75 3.75 0 003 3.675M12 13.5V18m0 0h-3m3 0h3m-7.5 2.25h9" />
        </svg>
      </button>

      {/* Avatar + dropdown */}
      <div className="relative ml-1" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <div className="w-9 h-9 rounded-full bg-[#1a56db] text-white font-bold text-sm flex items-center justify-center">
            {initial}
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              {user?.email && (
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              )}
            </div>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
              role="menuitem"
            >
              Profile & Settings
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer border-t border-slate-100"
              role="menuitem"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
