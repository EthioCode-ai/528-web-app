"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";

const BLOCK_COLORS = {
  content_review: "border-indigo-500 text-indigo-600",
  practice: "border-emerald-500 text-emerald-600",
  flashcards: "border-amber-500 text-amber-600",
  passage_practice: "border-purple-500 text-purple-600",
  full_length: "border-red-500 text-red-600",
};

const BLOCK_ICONS = {
  content_review: "📖",
  practice: "✏️",
  flashcards: "🃏",
  passage_practice: "📄",
  full_length: "🎯",
};

export default function StudyPlanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscription_tier || "free";
  const isElite = tier === "elite" || tier === "vip";

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [needsTestDate, setNeedsTestDate] = useState(false);
  const [planStale, setPlanStale] = useState(false);

  useEffect(() => {
    if (isElite) {
      loadPlan();
    } else {
      setLoading(false);
    }
  }, []);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/study-plan/current");
      setPlan(data);
      if (data?.test_date && user?.test_date) {
        const planDate = new Date(data.test_date).toDateString();
        const userDate = new Date(user.test_date).toDateString();
        setPlanStale(planDate !== userDate);
      }
    } catch (err) {
      if (err.message?.includes("400")) setNeedsTestDate(true);
      else setPlan(null);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await apiFetch("/study-plan/generate", { method: "POST" });
      setPlan(data);
      setPlanStale(false);
      setSelectedWeek(0);
      alert("Your personalized study plan is ready!");
    } catch (err) {
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("test date") || msg.includes("test_date") || msg.includes("400")) {
        setNeedsTestDate(true);
        alert("Set your MCAT test date in Settings first, then come back to generate your plan.");
      } else {
        alert("Failed to generate study plan. Try again.");
      }
    }
    setGenerating(false);
  };

  const planData = plan?.plan_json;
  const weeks = planData?.weeks || [];
  const currentWeek = weeks[selectedWeek];

  // ── Lock screen ──
  if (!isElite) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Study Plan</h1>
          <p className="text-sm font-semibold text-[#1a56db] mb-4">AI-Powered MCAT Roadmap</p>
          <div className="w-10 h-0.5 bg-[#1a56db]/30 mx-auto mb-4" />
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            {tier === "scholar"
              ? "Study Plan is available on the 528 Elite plan. Upgrade to get a personalized week-by-week MCAT study roadmap."
              : "Study Plan is not available on the Free plan. Upgrade to 528 Elite to get a personalized week-by-week MCAT study roadmap."}
          </p>
          <div className="text-left mb-6 space-y-1.5">
            <p className="text-sm text-slate-500">✦  AI builds a plan from your diagnostic results</p>
            <p className="text-sm text-slate-500">✦  Week-by-week schedule with daily blocks</p>
            <p className="text-sm text-slate-500">✦  Adapts to your target score and test date</p>
            <p className="text-sm text-slate-500">✦  Milestones and study recommendations</p>
          </div>
          <a href="/settings" className="inline-block bg-[#1a56db] text-white font-bold text-base px-8 py-3.5 rounded-xl hover:bg-[#1648b8]">
            Upgrade to 528 Elite – $49/mo
          </a>
          <button onClick={() => router.push("/dashboard")} className="block mx-auto mt-4 text-sm text-slate-400 hover:text-slate-600 cursor-pointer">← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold text-[#1a56db] hover:underline cursor-pointer">← Back</button>
        <h1 className="text-lg font-extrabold text-slate-900">Study Plan</h1>
        <div className="w-16" />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 mt-3">Loading plan...</p>
        </div>
      ) : !plan ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📅</p>
          <h2 className="text-lg font-bold text-slate-800 mb-2">No Study Plan Yet</h2>
          <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto leading-relaxed">
            Generate a personalized study plan based on your diagnostic results, target score, and available study time.
          </p>
          {needsTestDate ? (
            <a href="/settings" className="inline-block border-2 border-[#1a56db] text-[#1a56db] font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#1a56db]/5">
              Set Test Date in Settings →
            </a>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`bg-[#1a56db] text-white font-bold text-base px-8 py-3.5 rounded-xl cursor-pointer ${generating ? "opacity-50" : "hover:bg-[#1648b8]"}`}
            >
              {generating ? "Generating your plan..." : "🧬 Generate My Study Plan"}
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Stale banner */}
          {planStale && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-amber-700 mb-3">⚠️ Your exam date has changed since this plan was created.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="border-2 border-[#1a56db] text-[#1a56db] font-bold text-sm px-5 py-2 rounded-lg cursor-pointer hover:bg-[#1a56db]/5"
              >
                {generating ? "Regenerating..." : "Regenerate Plan"}
              </button>
            </div>
          )}

          {/* Summary */}
          {planData && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
              {weeks.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-[#1a56db]">
                    📅 {weeks.length}-week plan → Exam: {plan?.test_date ? new Date(plan.test_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set"}
                  </p>
                  <p className="text-xs text-slate-400">Week {selectedWeek + 1} of {weeks.length}</p>
                </div>
              )}
              {planData.summary && <p className="text-sm text-slate-600 leading-relaxed">{planData.summary}</p>}
            </div>
          )}

          {/* Week tabs */}
          {weeks.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {weeks.map((w, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedWeek(i)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-center min-w-[80px] cursor-pointer transition-colors ${
                    selectedWeek === i
                      ? "bg-[#1a56db]/10 border-[#1a56db]"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className={`text-xs font-bold ${selectedWeek === i ? "text-[#1a56db]" : "text-slate-500"}`}>
                    Wk {w.week_number || i + 1}
                  </p>
                  {w.theme && (
                    <p className={`text-[10px] mt-0.5 truncate max-w-[80px] ${selectedWeek === i ? "text-[#1a56db]" : "text-slate-400"}`}>
                      {w.theme}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Day cards */}
          {currentWeek?.days?.map((day, dayIdx) => (
            <div key={dayIdx} className="bg-white border border-slate-200 rounded-xl p-5 mb-2.5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">{day.day}</h3>
              {day.blocks?.map((block, blockIdx) => {
                const colorClass = BLOCK_COLORS[block.type] || "border-slate-400 text-slate-600";
                const icon = BLOCK_ICONS[block.type] || "📌";
                return (
                  <div key={blockIdx} className={`border-l-[3px] pl-3 mb-3 ${colorClass.split(" ")[0]}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{icon}</span>
                      <span className={`text-[11px] font-bold tracking-wide ${colorClass.split(" ")[1]}`}>
                        {(block.type || "").replace(/_/g, " ").toUpperCase()}
                      </span>
                      {block.duration_minutes && (
                        <span className="text-[11px] text-slate-400 ml-auto">{block.duration_minutes} min</span>
                      )}
                    </div>
                    {block.section && <p className="text-sm font-semibold text-slate-800 mt-1">{block.section}</p>}
                    {block.topic && <p className="text-xs text-slate-500 mt-0.5">{block.topic}</p>}
                    {block.notes && <p className="text-xs text-slate-400 mt-1 italic leading-relaxed">{block.notes}</p>}
                  </div>
                );
              })}
              {(!day.blocks || day.blocks.length === 0) && (
                <p className="text-sm text-slate-400 text-center py-2">🌿 Rest Day</p>
              )}
            </div>
          ))}

          {/* Milestones */}
          {planData?.milestones?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-2.5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">🏆 Milestones</h3>
              {planData.milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1a56db] mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-slate-600 leading-relaxed">{m}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {planData?.recommendations?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">💡 Recommendations</h3>
              {planData.recommendations.map((r, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed mb-1">• {r}</p>
              ))}
            </div>
          )}

          {/* Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full border-2 border-[#1a56db] text-[#1a56db] font-bold text-sm py-3.5 rounded-xl cursor-pointer hover:bg-[#1a56db]/5"
          >
            {generating ? "Regenerating..." : "↻ Regenerate Plan"}
          </button>
        </div>
      )}
    </div>
  );
}
