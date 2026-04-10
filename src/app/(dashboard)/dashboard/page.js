"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useAuthStore from "@/stores/authStore";
import { apiFetch } from "@/lib/api";

const SECTION_COLORS = {
  "Chem/Phys": "text-blue-600",
  "CARS": "text-purple-600",
  "Bio/Biochem": "text-emerald-600",
  "Psych/Soc": "text-amber-600",
};

const SECTIONS = [
  { code: "chem_phys", name: "Chem/Phys", topics: 8, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { code: "cars", name: "CARS", topics: 6, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { code: "bio_biochem", name: "Bio/Biochem", topics: 8, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  { code: "psych_soc", name: "Psych/Soc", topics: 8, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
];

function daysUntil(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscription_tier || "free";

  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [wrongAnswerCount, setWrongAnswerCount] = useState(0);
  const [showFocusInfo, setShowFocusInfo] = useState(false);

  useEffect(() => {
    apiFetch("/diagnostic/gap-analysis").then(setGapAnalysis).catch(() => {});
    apiFetch("/wrong-answers/stats")
      .then((data) => {
        const due = data?.bySection?.reduce((sum, s) => sum + parseInt(s.due_for_review), 0) || 0;
        setWrongAnswerCount(due);
      })
      .catch(() => {});
  }, []);

  const hasStats = gapAnalysis && gapAnalysis.totalQuestionsAnswered > 0;
  const readiness = gapAnalysis?.readinessEstimate;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {`Hello${user?.first_name ? `, ${user.first_name}` : ""}`}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Ready to study?</p>
      </div>

      {/* ── Stats Bar ── */}
      {hasStats ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#1a56db]">{gapAnalysis.totalQuestionsAnswered}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Questions</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-extrabold text-[#1a56db]">{gapAnalysis.overallAccuracy}%</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Accuracy</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              {readiness && readiness.confidenceLevel !== "insufficient" ? (
                <p className="text-2xl font-extrabold text-[#1a56db]">{readiness.low}-{readiness.high}</p>
              ) : (
                <p className="text-2xl font-extrabold text-slate-300">--</p>
              )}
              {readiness?.confidenceLevel === "early" && <p className="text-[9px] text-amber-500">Early estimate</p>}
              {readiness?.confidenceLevel === "developing" && <p className="text-[9px] text-amber-500">Developing</p>}
              <p className="text-[11px] text-slate-400 mt-0.5">Readiness</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Target Score", value: user?.target_score || "—", color: "text-blue-600 bg-blue-50" },
            { label: "Days Until Exam", value: daysUntil(user?.test_date), color: "text-emerald-600 bg-emerald-50" },
            { label: "Subscription", value: { free: "Free", scholar: "Scholar", elite: "Elite", vip: "VIP" }[tier] || "Free", color: "text-purple-600 bg-purple-50" },
            { label: "Study Streak", value: 0, color: "text-amber-600 bg-amber-50" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{stat.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Per-Section Scores (when readiness data exists) ── */}
      {readiness?.perSection && readiness.confidenceLevel !== "insufficient" && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"].map((name) => {
            const score = readiness.perSection[name];
            const sc = SECTION_COLORS[name];
            if (!score) return null;
            return (
              <div key={name} className="bg-white rounded-xl border border-slate-200 p-3 text-center shadow-sm">
                <p className={`text-[11px] font-semibold ${sc}`}>{name}</p>
                <p className={`text-xl font-extrabold mt-1 ${sc}`}>{score}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Two-column layout: Primary actions left, Secondary right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Left column — primary study actions (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Adaptive Knowledge Diagnostic */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-2xl mb-2">🧬</p>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Adaptive Knowledge Diagnostic</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              20 AI-generated questions that adapt to your performance in real-time. The engine identifies your weakest topics and drills deeper.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {SECTIONS.map((s) => (
                <span key={s.code} className={`${s.bg} ${s.color} border ${s.border} text-xs font-medium px-3 py-1 rounded-full`}>
                  {s.name}
                </span>
              ))}
            </div>
            <Link
              href="/diagnostic"
              className="block w-full bg-[#1a56db] text-white text-center font-bold text-[15px] py-3.5 rounded-xl hover:bg-[#1648b8] transition-colors"
            >
              Start Diagnostic →
            </Link>
          </div>

          {/* Section Drill */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-2xl mb-2">📚</p>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Section Drill</h2>
            <p className="text-sm text-slate-500 mb-4">Focus on a specific MCAT section:</p>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map((s) => (
                <Link
                  key={s.code}
                  href={`/diagnostic?section=${s.code}`}
                  className={`${s.bg} border ${s.border} rounded-xl p-4 hover:shadow-md transition-all`}
                >
                  <p className={`text-sm font-bold ${s.color}`}>{s.name}</p>
                  <p className={`text-xs mt-1 ${s.color} opacity-70`}>{s.topics} topics</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — feature cards (1/3 width) */}
        <div className="flex flex-col gap-4">
          {/* Wrong Answer Journal */}
          <Link href="/journal" className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xl">📕</p>
              {wrongAnswerCount > 0 && (
                <span className="bg-amber-400 text-slate-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {wrongAnswerCount} due
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1a56db] transition-colors">Wrong Answer Journal</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Review every question you&apos;ve gotten wrong. Spaced repetition ensures missed concepts keep coming back.
            </p>
          </Link>

          {/* Flashcards */}
          <Link href="/flashcards" className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <p className="text-xl mb-2">🃏</p>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1a56db] transition-colors">Flashcards</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              AI-generated flashcards with spaced repetition. Review your weak areas or create your own.
            </p>
          </Link>

          {/* Study Plan */}
          <Link href="/study-plan" className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <p className="text-xl mb-2">📅</p>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1a56db] transition-colors">Study Plan</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Get a personalized weekly study plan based on your diagnostic results, target score, and available time.
            </p>
          </Link>

          {/* MCAT Scanner */}
          <Link href="/scan" className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <p className="text-xl mb-2">📸</p>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#1a56db] transition-colors">MCAT Scanner</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Scan any textbook question, formula, or diagram and get an instant AI-powered MCAT breakdown.
            </p>
          </Link>
        </div>
      </div>

      {/* ── Focus Areas ── */}
      {gapAnalysis && gapAnalysis.weakAreas?.length > 0 && (
        <div className="relative bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
          <button
            onClick={() => setShowFocusInfo(true)}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#1a56db]/10 text-[#1a56db] flex items-center justify-center text-xs font-bold hover:bg-[#1a56db]/20 cursor-pointer transition-colors"
            title="How Focus Areas work"
            aria-label="Focus Areas info"
          >
            i
          </button>
          <h2 className="text-base font-bold text-slate-900 mb-1">⚠️ Focus Areas</h2>
          <p className="text-sm text-slate-500 mb-4">These topics need the most attention:</p>
          {gapAnalysis.weakAreas
            .filter((w, i, arr) => arr.findIndex((a) => a.section === w.section) === i)
            .slice(0, 4)
            .map((w, i) => {
              const sc = SECTION_COLORS[w.section] || "text-slate-600";
              const masteryRaw = w.mastery ?? w.weighted_accuracy ?? w.accuracy;
              const masteryVal = masteryRaw == null ? null : Math.round(masteryRaw);
              return (
                <div key={i} className="mb-3">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${sc.replace("text-", "bg-")}`} />
                    <span className="text-sm text-slate-800 font-medium flex-1">
                      {w.topic} <span className="text-slate-400">({w.section})</span>
                    </span>
                    <span className={`text-sm font-bold tabular-nums w-12 text-right ${
                      masteryVal == null ? "text-slate-300" : masteryVal < 30 ? "text-red-500" : "text-amber-500"
                    }`}>
                      {masteryVal == null ? "—" : `${masteryVal}%`}
                    </span>
                  </div>
                  {w.subtopics?.length > 0 && (
                    <div className="ml-[18px] border-l border-slate-100 pl-3">
                      {w.subtopics.slice(0, 3).map((st, j) => {
                        const stRaw = st.mastery ?? st.weighted_accuracy ?? st.accuracy;
                        const stVal = stRaw == null ? null : Math.round(stRaw);
                        return (
                          <div key={j} className="flex items-center py-0.5">
                            <span className="text-xs text-slate-500 flex-1">{st.name}</span>
                            <span className={`text-sm font-bold tabular-nums w-12 text-right ${
                              stVal == null ? "text-slate-300" : stVal < 30 ? "text-red-500" : "text-amber-500"
                            }`}>
                              {stVal == null ? "—" : `${stVal}%`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Focus Areas Info Modal */}
      {showFocusInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowFocusInfo(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFocusInfo(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 pr-8">How Focus Areas Work</h3>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                Focus Areas surfaces the topics where your weighted accuracy is below 50%, so
                you know exactly where to spend your study time.
              </p>

              <div>
                <p className="font-semibold text-slate-800 mb-1">Topic Mastery (e.g., 20%)</p>
                <p>
                  Stored persistently as a smoothed score that blends your historical accuracy with
                  recent results, weighted by question difficulty. A fresh wrong answer starts at
                  20%; a fresh correct answer starts at 50%. As you keep practicing, the number
                  moves toward your true mastery level.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-1">Subtopic Accuracy (e.g., 0%)</p>
                <p>
                  Raw percentage of correct answers within that specific subtopic. 0% means you
                  haven&apos;t answered any subtopic question correctly yet — even a single right
                  answer will move it.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-1">Why they differ</p>
                <p>
                  Topic mastery uses a smoothed formula to prevent panic from one bad answer.
                  Subtopic accuracy is unsmoothed and shows raw performance. Both are accurate;
                  they just measure slightly different things.
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-1">How to improve a score</p>
                <p>
                  Run a Section Drill or Diagnostic that touches these topics. Each correct answer
                  raises your mastery; each wrong answer lowers it. Topics disappear from this list
                  once they cross 50%.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowFocusInfo(false)}
              className="w-full mt-6 bg-[#1a56db] text-white text-sm font-bold py-3 rounded-xl hover:bg-[#1648b8] cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
