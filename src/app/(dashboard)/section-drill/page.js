"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const SECTIONS = [
  { code: "chem_phys", name: "Chem/Phys", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-500" },
  { code: "cars", name: "CARS", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", ring: "ring-purple-500" },
  { code: "bio_biochem", name: "Bio/Biochem", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-500" },
  { code: "psych_soc", name: "Psych/Soc", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-500" },
];

export default function SectionDrillPage() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicError, setTopicError] = useState(null);

  useEffect(() => {
    if (!selectedSection) return;
    let cancelled = false;
    setLoadingTopics(true);
    setTopicError(null);
    apiFetch(`/content/sections/${selectedSection.code}/topics`)
      .then((data) => {
        if (cancelled) return;
        // Content endpoint returns an array of {id, name, section_id, ...}.
        setTopics(Array.isArray(data) ? data : []);
        setLoadingTopics(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setTopicError(err?.message || "Could not load topics.");
        setLoadingTopics(false);
      });
    return () => { cancelled = true; };
  }, [selectedSection]);

  // Step 1: pick a section
  if (!selectedSection) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">📚 Section Drill</h1>
          <p className="text-sm text-slate-500 mt-1">
            Focus on a specific MCAT section. After picking a section you can drill all topics (adaptive) or lock to one.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => setSelectedSection(s)}
              className={`${s.bg} border ${s.border} rounded-2xl p-6 hover:shadow-md transition-all text-left`}
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.name}</p>
              <p className={`text-sm mt-1 ${s.color} opacity-70`}>Pick topics or go adaptive</p>
              <p className={`text-xs mt-4 ${s.color} opacity-60`}>Tap to continue →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: pick a specific topic (or go adaptive)
  const s = selectedSection;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => { setSelectedSection(null); setTopics([]); }}
          className="text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          ← Back to sections
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          <span className={s.color}>{s.name}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pick a topic to lock the drill to it, or start adaptively across all topics in this section.
        </p>
      </div>

      <div className="mb-6">
        <Link
          href={`/diagnostic?section=${s.code}`}
          className={`block ${s.bg} border-2 ${s.border} rounded-xl p-5 hover:shadow-md transition-all`}
        >
          <p className={`text-base font-bold ${s.color}`}>Start adaptive drill</p>
          <p className={`text-xs mt-1 ${s.color} opacity-70`}>
            The engine picks topics based on your weakest areas and mastery data.
          </p>
        </Link>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Or pick one topic</p>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {loadingTopics && (
        <p className="text-sm text-slate-400 py-6 text-center">Loading topics…</p>
      )}

      {topicError && (
        <p className="text-sm text-red-600 py-6 text-center">{topicError}</p>
      )}

      {!loadingTopics && !topicError && topics.length === 0 && (
        <p className="text-sm text-slate-400 py-6 text-center">No topics configured for this section.</p>
      )}

      {!loadingTopics && topics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topics.map((t) => (
            <Link
              key={t.id}
              href={`/diagnostic?section=${s.code}&topic=${t.id}&topicName=${encodeURIComponent(t.name)}`}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-400 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-semibold text-slate-800">{t.name}</p>
              {t.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
