"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { apiFetch } from "@/lib/api";

// ============================================================
// Study Group landing page
// ============================================================
// - Elite-tier gate: free/scholar users see an upgrade card.
// - Sessions list: past + active sessions, ordered by started_at desc.
// - Inline topic picker for starting a new session, sourced from
//   gap-analysis (weak topics first, then other attempted topics).
// - First-time users (no diagnostic data) see a "run a diagnostic
//   to unlock Study Group" prompt.
// ============================================================

const SECTION_COLORS = {
  "Chem/Phys": { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  "CARS": { text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  "Bio/Biochem": { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  "Psych/Soc": { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

const STATUS_BADGE = {
  active: { label: "In progress", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  abandoned: { label: "Abandoned", className: "bg-slate-100 text-slate-500" },
};

function masteryBarColor(mastery) {
  if (mastery == null) return "bg-slate-200";
  if (mastery < 30) return "bg-red-500";
  if (mastery < 50) return "bg-amber-500";
  if (mastery < 75) return "bg-blue-500";
  return "bg-emerald-500";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function StudyGroupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  const [sessions, setSessions] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const tier = user?.subscription_tier || "free";
  const isElite = tier === "elite" || tier === "vip";

  useEffect(() => {
    if (!initialized) return;
    if (!isElite) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [sess, gap] = await Promise.all([
          apiFetch("/study-group/sessions"),
          apiFetch("/diagnostic/gap-analysis").catch(() => null),
        ]);
        if (cancelled) return;
        setSessions(sess);
        setGapAnalysis(gap);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load study group");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [initialized, isElite]);

  // Build the picker's topic list: weak topics first (with isWeak flag),
  // then other attempted topics deduped by topicId.
  const pickerTopics = useMemo(() => {
    if (!gapAnalysis) return [];
    const weakIds = new Set();
    const weak = (gapAnalysis.weakAreas || [])
      .filter((w) => w.topicId != null)
      .map((w) => {
        weakIds.add(w.topicId);
        return {
          topicId: w.topicId,
          topic: w.topic,
          section: w.section,
          mastery: w.mastery,
          isWeak: true,
        };
      });
    const others = [];
    for (const [secName, sec] of Object.entries(gapAnalysis.sectionScores || {})) {
      for (const t of sec.topics || []) {
        if (t.topicId == null) continue;
        if (weakIds.has(t.topicId)) continue;
        if (!t.attempted || t.attempted < 1) continue;
        others.push({
          topicId: t.topicId,
          topic: t.name,
          section: secName,
          mastery: t.mastery,
          isWeak: false,
        });
      }
    }
    return [...weak, ...others];
  }, [gapAnalysis]);

  async function handleStart(topicId) {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const result = await apiFetch("/study-group/start", {
        method: "POST",
        body: JSON.stringify({ topicId }),
      });
      router.push(`/study-group/${result.sessionId}`);
    } catch (err) {
      setError(err.message || "Failed to start session");
      setStarting(false);
    }
  }

  // ----- Loading -----
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ----- Elite gate -----
  if (!isElite) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Power Study Group</h1>
        <p className="text-slate-500 mb-8">An Elite-tier feature.</p>

        <div className="bg-gradient-to-br from-[#1a56db] to-[#1648b8] rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Elite</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-3">
            Three AI tutors. One topic at a time.<br />20 minutes to mastery.
          </h2>
          <p className="text-white/85 mb-6 max-w-xl">
            Power Study Group pairs you with a Professor who explains the mechanism, a Socratic Peer who probes
            your reasoning, and a Quizmaster who drills you with MCAT-grade questions — all in one structured
            session that updates your mastery in real time.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 bg-white text-[#1a56db] font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Upgrade to Elite
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3 font-bold">P</div>
            <p className="font-bold text-slate-900 text-sm mb-1">The Professor</p>
            <p className="text-xs text-slate-500">Explains the core mechanism, then re-teaches whatever you missed.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3 font-bold">S</div>
            <p className="font-bold text-slate-900 text-sm mb-1">The Socratic Peer</p>
            <p className="text-xs text-slate-500">Probes your reasoning with "but why?" questions until the misconceptions surface.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 font-bold">Q</div>
            <p className="font-bold text-slate-900 text-sm mb-1">The Quizmaster</p>
            <p className="text-xs text-slate-500">Drills you with MCAT-style questions calibrated to your difficulty band.</p>
          </div>
        </div>
      </div>
    );
  }

  // ----- Elite main view -----
  const activeSessions = (sessions || []).filter((s) => s.status === "active");
  const pastSessions = (sessions || []).filter((s) => s.status !== "active");
  const hasAnyTopics = pickerTopics.length > 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Power Study Group</h1>
          <p className="text-slate-500">Three AI tutors. One topic at a time. 20 minutes to mastery.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Start a new session */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Start a new session</h2>
            <p className="text-sm text-slate-500">Pick a topic to work on with the group.</p>
          </div>
          {hasAnyTopics && (
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="bg-[#1a56db] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1648b8] transition-colors"
            >
              {pickerOpen ? "Hide topics" : "Choose topic"}
            </button>
          )}
        </div>

        {!hasAnyTopics && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-600 mb-3">
              You need some diagnostic data before you can start a study group session.
              Run a quick diagnostic to identify your weak topics.
            </p>
            <Link
              href="/diagnostic"
              className="inline-flex bg-[#1a56db] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1648b8] transition-colors"
            >
              Run a diagnostic
            </Link>
          </div>
        )}

        {pickerOpen && hasAnyTopics && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {pickerTopics.map((t) => {
              const masteryVal = t.mastery == null ? null : Math.round(t.mastery);
              const sec = SECTION_COLORS[t.section] || SECTION_COLORS["Chem/Phys"];
              return (
                <button
                  key={t.topicId}
                  onClick={() => handleStart(t.topicId)}
                  disabled={starting}
                  className={`text-left bg-white border rounded-xl p-4 transition-all ${
                    starting
                      ? "opacity-50 cursor-not-allowed border-slate-200"
                      : "border-slate-200 hover:border-[#1a56db] hover:shadow-md cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{t.topic}</p>
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${sec.bg} ${sec.text}`}>
                        {t.section}
                      </span>
                    </div>
                    {t.isWeak && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                        Weak
                      </span>
                    )}
                  </div>
                  {masteryVal != null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Mastery</span>
                        <span className="font-bold text-slate-700">{masteryVal}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${masteryBarColor(masteryVal)}`}
                          style={{ width: `${Math.min(100, masteryVal)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {starting && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
            Starting session…
          </div>
        )}
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Resume in progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* Past sessions */}
      {pastSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Past sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions && sessions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="font-bold text-slate-900 mb-1">No study group sessions yet</p>
          <p className="text-sm text-slate-500">Pick a topic above to start your first one.</p>
        </div>
      )}
    </div>
  );
}

// ----- SessionCard ---------------------------------------------------------

function SessionCard({ session }) {
  const status = STATUS_BADGE[session.status] || STATUS_BADGE.active;
  const sec = SECTION_COLORS[session.section_name] || SECTION_COLORS["Chem/Phys"];
  const before = session.mastery_before == null ? null : parseFloat(session.mastery_before);
  const after = session.mastery_after == null ? null : parseFloat(session.mastery_after);
  const delta = before != null && after != null ? Math.round((after - before) * 10) / 10 : null;

  return (
    <Link
      href={`/study-group/${session.id}`}
      className="block bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#1a56db]/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{session.topic_name || "Untitled topic"}</h3>
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${sec.bg} ${sec.text}`}>
            {session.section_name || "—"}
          </span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${status.className} flex-shrink-0`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-1.5">
        {session.quiz_total > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Quiz</span>
            <span className="font-bold text-slate-700">
              {session.quiz_correct}/{session.quiz_total}
            </span>
          </div>
        )}
        {after != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Mastery</span>
            <span className="font-bold text-slate-700">
              {before != null ? `${Math.round(before)}% → ` : ""}
              {Math.round(after)}%
              {delta != null && delta !== 0 && (
                <span className={delta > 0 ? "text-emerald-600 ml-1" : "text-red-500 ml-1"}>
                  ({delta > 0 ? "+" : ""}
                  {delta})
                </span>
              )}
            </span>
          </div>
        )}
        {session.status === "active" && session.current_phase && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Phase</span>
            <span className="font-bold text-slate-700 capitalize">
              {session.current_phase.replace("_", " ")}
            </span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-3">{formatDate(session.started_at)}</p>
    </Link>
  );
}
