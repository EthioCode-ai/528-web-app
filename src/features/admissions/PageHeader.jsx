"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Shared sub-navigation for admissions pages. Renders a top strip
// with the section name, a short subtitle, and a horizontal tab
// row of the primary admissions stages. Tabs highlight active by
// pathname prefix match.

const TABS = [
  { href: "/admissions", label: "Overview" },
  { href: "/admissions/profile", label: "Profile" },
  { href: "/admissions/metrics", label: "Scores" },
  { href: "/admissions/experiences", label: "Experiences" },
  { href: "/admissions/schools", label: "Schools" },
  { href: "/admissions/prompts", label: "Prompts" },
  { href: "/admissions/drafts", label: "Drafts" },
  { href: "/admissions/interviews", label: "Interviews" },
  { href: "/admissions/settings", label: "Settings" },
];

function isActive(pathname, href) {
  if (href === "/admissions") return pathname === "/admissions";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PageHeader({ title, subtitle }) {
  const pathname = usePathname() || "";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1a56db]">
          Admissions Copilot
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      <nav
        className="max-w-5xl mx-auto px-6 overflow-x-auto"
        aria-label="Admissions sub-navigation"
      >
        <ul className="flex gap-1 text-[13px]">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={
                    "inline-block px-3 py-2 rounded-t-md border-b-2 -mb-px transition-colors " +
                    (active
                      ? "border-[#1a56db] text-[#1a56db] font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-900")
                  }
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
