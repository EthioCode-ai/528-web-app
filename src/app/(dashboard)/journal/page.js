"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";

const SECTION_COLORS = {
  "Chem/Phys": { bg: "bg-blue-50", text: "text-blue-600" },
  "CARS": { bg: "bg-purple-50", text: "text-purple-600" },
  "Bio/Biochem": { bg: "bg-emerald-50", text: "text-emerald-600" },
  "Psych/Soc": { bg: "bg-amber-50", text: "text-amber-600" },
};

const FILTERS = ["All", "Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc", "Due for Review"];

export default function WrongAnswerJournalPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isFree = (user?.subscription_tier || "free") === "free";

  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "Due for Review") params.set("review_due", "true");
      else if (filter !== "All") params.set("section", filter);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [entriesData, statsData] = await Promise.all([
        apiFetch(`/wrong-answers${qs}`),
        apiFetch("/wrong-answers/stats"),
      ]);
      setEntries(entriesData);
      setStats(statsData);
    } catch {
      // silent
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const dueCount = stats?.bySection?.reduce((sum, s) => sum + parseInt(s.due_for_review), 0) || 0;

  const handleReview = async (understood) => {
    if (!selectedEntry || reviewing) return;
    setReviewing(true);
    try {
      const data = await apiFetch(`/wrong-answers/${selectedEntry.id}/review`, {
        method: "POST",
        body: JSON.stringify({ understood }),
      });
      alert(
        understood
          ? `Nice! Next review in ${data.nextReviewDays} day${data.nextReviewDays > 1 ? "s" : ""}.`
          : "No worries — this will come back tomorrow. Keep at it!"
      );
      setSelectedEntry(null);
      loadData();
    } catch {
      alert("Failed to record review.");
    }
    setReviewing(false);
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    if (!confirm("Remove this question from your review queue?")) return;
    try {
      await apiFetch(`/wrong-answers/${selectedEntry.id}`, { method: "DELETE" });
      setSelectedEntry(null);
      loadData();
    } catch {
      alert("Failed to remove entry.");
    }
  };

  const truncate = (text, len = 100) =>
    text && text.length > len ? text.slice(0, len) + "..." : text || "";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/dashboard")} className="text-xs font-semibold text-[#1a56db] border border-[#1a56db] rounded-lg px-3 py-1.5 hover:bg-[#1a56db]/5 cursor-pointer">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-slate-900">📕 Wrong Answer Journal</h1>
      </div>

      {/* Free tier banner */}
      {isFree && (
        <div className="bg-[#1a56db]/5 border border-[#1a56db]/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-slate-600 mb-3">
            📋 View-only mode — Upgrade to Scholar to unlock reviews, AI explanations, and spaced repetition.
          </p>
          <a href="/settings" className="inline-block bg-[#1a56db] text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#1648b8]">
            Upgrade – $29/mo
          </a>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-5">
          <div className="flex items-center justify-around divide-x divide-slate-100">
            <div className="flex-1 text-center px-2">
              <p className="text-xl font-extrabold text-[#1a56db]">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total</p>
            </div>
            <div className="flex-1 text-center px-2">
              <p className={`text-xl font-extrabold ${dueCount > 0 ? "text-amber-500" : "text-[#1a56db]"}`}>{dueCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Due for Review</p>
            </div>
            {stats.bySection?.map((s) => {
              const sc = SECTION_COLORS[s.section] || { text: "text-slate-600" };
              return (
                <div key={s.section} className="flex-1 text-center px-2">
                  <p className={`text-lg font-extrabold ${sc.text}`}>{s.total}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.section}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
              filter === f
                ? "bg-[#1a56db]/10 border-[#1a56db] text-[#1a56db] font-semibold"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {f}{f === "Due for Review" && dueCount > 0 ? ` (${dueCount})` : ""}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-base font-bold text-slate-800 mb-1">
            {filter === "Due for Review" ? "Nothing due for review!" : "No wrong answers yet!"}
          </p>
          <p className="text-sm text-slate-500">
            {filter === "Due for Review"
              ? "You're all caught up. Keep studying!"
              : "Every question you get wrong will appear here for review."}
          </p>
        </div>
      )}

      {/* Entries */}
      {!loading && entries.map((entry) => {
        const q = entry.question_json || {};
        const sc = SECTION_COLORS[entry.section] || { bg: "bg-slate-50", text: "text-slate-600" };
        const isDue = entry.next_review && new Date(entry.next_review) <= new Date();

        return (
          <button
            key={entry.id}
            onClick={() => setSelectedEntry(entry)}
            className={`w-full text-left bg-white rounded-xl border p-4 mb-2.5 hover:shadow-md transition-all cursor-pointer ${
              isDue ? "border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`${sc.bg} ${sc.text} text-[11px] font-medium px-2 py-0.5 rounded-md`}>{entry.section}</span>
              <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-2 py-0.5 rounded-md">
                {entry.topic}{q.subtopic ? ` › ${q.subtopic}` : ""}
              </span>
              {isDue && <span className="bg-amber-50 text-amber-600 text-[11px] font-medium px-2 py-0.5 rounded-md">Due</span>}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-2">{truncate(q.stem)}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                You: <span className="text-red-500 font-medium">{entry.user_answer}</span>
                {"  "}Correct: <span className="text-emerald-500 font-medium">{entry.correct_answer}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {entry.review_count > 0 ? `Reviewed ${entry.review_count}x` : "Not reviewed"}
              </p>
            </div>
          </button>
        );
      })}

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedEntry(null)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {(() => {
                const q = selectedEntry.question_json || {};
                const sc = SECTION_COLORS[selectedEntry.section] || { bg: "bg-slate-50", text: "text-slate-600" };

                return (
                  <>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className={`${sc.bg} ${sc.text} text-[11px] font-medium px-2.5 py-0.5 rounded-full`}>{selectedEntry.section}</span>
                      <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                        {selectedEntry.topic}{q.subtopic ? ` › ${q.subtopic}` : ""}
                      </span>
                      {selectedEntry.difficulty && (
                        <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-2.5 py-0.5 rounded-full">{selectedEntry.difficulty}</span>
                      )}
                    </div>

                    {/* Stem */}
                    <p className="text-sm text-slate-800 leading-relaxed mb-5">{q.stem}</p>

                    {/* Choices */}
                    {q.choices && Object.entries(q.choices).map(([letter, text]) => {
                      const isUser = letter === selectedEntry.user_answer;
                      const isCorrect = letter === selectedEntry.correct_answer;
                      let cardClass = "bg-white border-slate-200";
                      if (isCorrect) cardClass = "bg-emerald-50 border-emerald-400";
                      else if (isUser) cardClass = "bg-red-50 border-red-400";

                      return (
                        <div key={letter} className={`flex items-start gap-3 border rounded-xl p-3 mb-2 ${cardClass}`}>
                          <span className={`text-sm font-bold ${isCorrect ? "text-emerald-600" : isUser ? "text-red-600" : "text-slate-400"}`}>{letter}.</span>
                          <span className="text-sm text-slate-700 flex-1">{text}</span>
                          {isUser && !isCorrect && <span className="text-xs text-red-500 font-semibold">(You)</span>}
                          {isCorrect && <span className="text-xs text-emerald-500 font-semibold">✔</span>}
                        </div>
                      );
                    })}

                    {/* Explanation */}
                    {isFree ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4 mb-4 text-center">
                        <p className="text-2xl mb-2">🔒</p>
                        <p className="text-sm font-bold text-slate-800 mb-1">AI Explanation</p>
                        <p className="text-xs text-slate-500 mb-4">Upgrade to Scholar to see detailed AI explanations for every wrong answer.</p>
                        <a href="/settings" className="inline-block bg-[#1a56db] text-white text-sm font-bold px-5 py-2.5 rounded-lg">
                          Unlock with Scholar – $29/mo
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-50 rounded-xl p-4 mt-4 mb-5">
                          <p className="text-xs font-bold text-[#1a56db] mb-2">Explanation</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{selectedEntry.explanation || q.explanation}</p>
                        </div>

                        <p className="text-sm font-semibold text-slate-800 text-center mb-3">Do you understand this concept now?</p>
                        <div className="flex gap-3 mb-4">
                          <button
                            onClick={() => handleReview(true)}
                            disabled={reviewing}
                            className="flex-1 bg-emerald-500 text-white text-sm font-bold py-3 rounded-xl hover:bg-emerald-600 cursor-pointer disabled:opacity-50"
                          >
                            {reviewing ? "..." : "✅ I understand now"}
                          </button>
                          <button
                            onClick={() => handleReview(false)}
                            disabled={reviewing}
                            className="flex-1 border-2 border-amber-400 text-amber-600 text-sm font-bold py-3 rounded-xl hover:bg-amber-50 cursor-pointer disabled:opacity-50"
                          >
                            🔄 Still confused
                          </button>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              {!isFree && (
                <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-600 cursor-pointer">Remove</button>
              )}
              <button
                onClick={() => setSelectedEntry(null)}
                className="bg-[#1a56db] text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-[#1648b8] cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
