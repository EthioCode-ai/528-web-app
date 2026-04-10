"use client";

import Link from "next/link";

const SECTIONS = [
  { code: "chem_phys", name: "Chem/Phys", topics: 8, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { code: "cars", name: "CARS", topics: 6, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { code: "bio_biochem", name: "Bio/Biochem", topics: 8, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { code: "psych_soc", name: "Psych/Soc", topics: 8, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
];

export default function SectionDrillPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">📚 Section Drill</h1>
        <p className="text-sm text-slate-500 mt-1">
          Focus on a specific MCAT section. Each drill runs unlimited questions until you exit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.code}
            href={`/diagnostic?section=${s.code}`}
            className={`${s.bg} border ${s.border} rounded-2xl p-6 hover:shadow-md transition-all`}
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.name}</p>
            <p className={`text-sm mt-1 ${s.color} opacity-70`}>{s.topics} topics</p>
            <p className={`text-xs mt-4 ${s.color} opacity-60`}>Tap to start →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
