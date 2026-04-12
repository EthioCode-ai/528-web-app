"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import { apiFetch } from "@/lib/api";
import Markdown from "@/components/Markdown";
import DataTable from "@/components/DataTable";
import QuestionChart from "@/components/QuestionChart";
import QuestionMolecule from "@/components/QuestionMolecule";
import QuestionPathway from "@/components/QuestionPathway";

// ============================================================
// Active Study Group session page
// ============================================================
// Hydrates a session by id, renders the three-persona chat,
// drives the phase machine via /message, swaps the input UI
// to A/B/C/D buttons during quiz/confirm phases, and shows a
// results card with the mastery delta on completion.
// ============================================================

const PHASES = [
  { key: "explain", label: "Explain", persona: "professor" },
  { key: "socratic", label: "Socratic", persona: "peer" },
  { key: "quiz", label: "Quiz", persona: "quizmaster" },
  { key: "gap_reexplain", label: "Re-explain", persona: "professor" },
  { key: "confirm", label: "Confirm", persona: "quizmaster" },
];

const PERSONA_META = {
  professor: {
    label: "Professor",
    initial: "P",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-l-blue-500",
    ring: "ring-blue-500",
    dotBg: "bg-blue-500",
    avatarBg: "bg-blue-100",
  },
  peer: {
    label: "Socratic Peer",
    initial: "S",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-l-amber-500",
    ring: "ring-amber-500",
    dotBg: "bg-amber-500",
    avatarBg: "bg-amber-100",
  },
  quizmaster: {
    label: "Quizmaster",
    initial: "Q",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-l-emerald-500",
    ring: "ring-emerald-500",
    dotBg: "bg-emerald-500",
    avatarBg: "bg-emerald-100",
  },
};

function currentPhasePersona(phase) {
  return PHASES.find((p) => p.key === phase)?.persona || null;
}

function extractLetter(text) {
  if (typeof text !== "string") return null;
  const m = text.match(/\b([A-Da-d])\b/);
  return m ? m[1].toUpperCase() : null;
}

function inputPlaceholder(phase) {
  switch (phase) {
    case "explain":
      return "Ask the Professor anything, or say 'ready' to continue…";
    case "socratic":
      return "Answer the Peer's question…";
    case "gap_reexplain":
      return "Ask the Professor for clarification, or say 'ready' to continue…";
    default:
      return "Type a message…";
  }
}

// ============================================================
// Page component
// ============================================================

export default function SessionPage({ params }) {
  // Next.js 16: client-side params is a Promise — unwrap with React 19's use()
  const { sessionId } = use(params);
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [phase, setPhase] = useState(null);
  const [quizProgress, setQuizProgress] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [completionData, setCompletionData] = useState(null);

  const transcriptRef = useRef(null);

  // ----- Hydrate on mount -----
  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch(`/study-group/${sessionId}`);
        if (cancelled) return;
        setSession(data.session);
        setMessages(data.messages || []);
        setPhase(data.session.current_phase);
        setQuizProgress({
          correct: data.session.quiz_correct || 0,
          total: data.session.quiz_total || 0,
        });
        if (data.session.status === "completed") {
          try {
            const c = await apiFetch(`/study-group/${sessionId}/complete`, { method: "POST" });
            if (!cancelled) setCompletionData(c);
          } catch {
            // results card optional — don't block transcript view
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [initialized, sessionId]);

  // ----- Auto-scroll on new messages -----
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Map of quiz_question_id → user's answer (letter + correctness)
  // for rendering already-answered quiz cards in their post-grade state.
  const userAnswerByQuestionId = useMemo(() => {
    const map = {};
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (
        m.persona === "quizmaster" &&
        m.message_type === "question" &&
        m.quiz_question_json
      ) {
        for (let j = i + 1; j < messages.length; j++) {
          if (messages[j].persona === "user") {
            map[m.id] = {
              letter: extractLetter(messages[j].content),
              isCorrect: messages[j].is_correct,
            };
            break;
          }
          // Don't cross another quiz question
          if (
            messages[j].persona === "quizmaster" &&
            messages[j].message_type === "question"
          ) {
            break;
          }
        }
      }
    }
    return map;
  }, [messages]);

  // The most recent quizmaster question that has not yet been answered.
  // This is the one whose A/B/C/D buttons should be live.
  const activeQuizQuestionId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.persona === "user") return null;
      if (
        m.persona === "quizmaster" &&
        m.message_type === "question" &&
        m.quiz_question_json
      ) {
        return m.id;
      }
    }
    return null;
  }, [messages]);

  // ----- Send a message -----
  async function send(content) {
    const trimmed = content.trim();
    if (sending || !trimmed) return;
    setSending(true);
    setError(null);

    // Optimistic user bubble
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      persona: "user",
      phase,
      message_type: "answer",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const result = await apiFetch(`/study-group/${sessionId}/message`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed }),
      });
      setMessages((prev) => [...prev, ...(result.messages || [])]);
      setPhase(result.phase);
      setQuizProgress(result.quizProgress || { correct: 0, total: 0 });

      if (result.phase === "completed" && result.sessionStatus === "completed") {
        try {
          const c = await apiFetch(`/study-group/${sessionId}/complete`, { method: "POST" });
          setCompletionData(c);
        } catch {
          // non-fatal
        }
      }
    } catch (err) {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  // ----- Loading / error states -----
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !session) {
    const isNotFound = /not found|404/i.test(error);
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm mt-12">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isNotFound ? "Session not found" : "Something went wrong"}
        </h2>
        <p className="text-sm text-slate-500 mb-5">
          {isNotFound
            ? "This study group session doesn't exist or you don't have access to it."
            : error}
        </p>
        <button
          onClick={() => router.push("/study-group")}
          className="bg-[#1a56db] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1648b8] transition-colors"
        >
          Back to Study Group
        </button>
      </div>
    );
  }

  const speakingPersona = sending ? currentPhasePersona(phase) : null;
  const isCompleted = phase === "completed" || session?.status === "completed";
  const isAbandoned = session?.status === "abandoned";
  const isInteractive = !isCompleted && !isAbandoned;
  const isQuizPhase = phase === "quiz" || phase === "confirm";

  return (
    <div className="max-w-4xl">
      {/* Header strip — three persona seats + topic */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(PERSONA_META).map(([key, meta]) => (
              <PersonaSeat
                key={key}
                meta={meta}
                active={speakingPersona === key || currentPhasePersona(phase) === key}
                speaking={speakingPersona === key}
              />
            ))}
          </div>
          <div className="text-right min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topic</p>
            <p className="font-bold text-slate-900 truncate">{session?.topic_name || "—"}</p>
            <p className="text-xs text-slate-500">{session?.section_name}</p>
          </div>
        </div>
      </div>

      {/* Phase progress */}
      <PhaseProgress phase={phase} quizProgress={quizProgress} />

      {/* Transcript */}
      <div
        ref={transcriptRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto mt-4 mb-4"
        style={{ maxHeight: "calc(100vh - 420px)", minHeight: "420px" }}
      >
        <div className="p-6 space-y-5">
          {messages.map((m, i) => {
            const prevPhase = i > 0 ? messages[i - 1].phase : null;
            const showDivider = prevPhase && prevPhase !== m.phase;
            return (
              <div key={m.id || `msg-${i}`}>
                {showDivider && <PhaseDivider from={prevPhase} to={m.phase} />}
                <MessageBubble
                  message={m}
                  isActiveQuiz={isInteractive && activeQuizQuestionId === m.id}
                  userAnswer={userAnswerByQuestionId[m.id]}
                  onAnswer={(letter) => send(letter)}
                  sending={sending}
                />
              </div>
            );
          })}
          {sending && isInteractive && (
            <ThinkingIndicator persona={speakingPersona || "professor"} />
          )}
        </div>
      </div>

      {/* Abandoned session notice — read-only, no input */}
      {isAbandoned && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-700">This session was abandoned</p>
              <p className="text-xs text-slate-500">
                Read-only — you can review the transcript above, but new messages can't be sent.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/study-group")}
            className="bg-[#1a56db] text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#1648b8] transition-colors flex-shrink-0"
          >
            Back to Study Group
          </button>
        </div>
      )}

      {/* Input bar — hidden during quiz/confirm (buttons live in quiz cards), when completed, and when abandoned */}
      {isInteractive && !isQuizPhase && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex items-end gap-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={sending}
            placeholder={inputPlaceholder(phase)}
            rows={2}
            className="flex-1 resize-none outline-none text-sm text-slate-900 placeholder-slate-400 px-3 py-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-[#1a56db] text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1648b8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Send
          </button>
        </form>
      )}

      {isInteractive && isQuizPhase && !activeQuizQuestionId && !sending && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500 text-center">
          Waiting for the next question…
        </div>
      )}

      {/* Results card */}
      {isCompleted && (
        <ResultsCard
          data={completionData}
          quizProgress={quizProgress}
          onBackToList={() => router.push("/study-group")}
          onDashboard={() => router.push("/dashboard")}
        />
      )}

      {/* Inline error toast (for in-session errors after hydration) */}
      {error && session && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function PersonaSeat({ meta, active, speaking }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${
        active
          ? `${meta.bg} ${meta.text} border-current`
          : "bg-slate-50 text-slate-400 border-slate-100"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          active ? `${meta.avatarBg} ${meta.text}` : "bg-slate-200 text-slate-500"
        } ${speaking ? "ring-2 ring-current ring-offset-2 ring-offset-white" : ""}`}
      >
        {meta.initial}
      </div>
      <div className="text-xs">
        <p className="font-bold leading-tight">{meta.label}</p>
        {speaking && <p className="text-[10px] opacity-70 leading-tight">thinking…</p>}
      </div>
    </div>
  );
}

function PhaseProgress({ phase, quizProgress }) {
  const currentIdx = PHASES.findIndex((p) => p.key === phase);
  const isCompleted = phase === "completed";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {PHASES.map((p, i) => {
          const stepIsCurrent = !isCompleted && i === currentIdx;
          const stepIsDone = isCompleted || i < currentIdx;
          return (
            <div key={p.key} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-2 rounded-full transition-colors ${
                  stepIsDone
                    ? "bg-emerald-400"
                    : stepIsCurrent
                    ? "bg-[#1a56db]"
                    : "bg-slate-200"
                }`}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  stepIsCurrent
                    ? "text-[#1a56db]"
                    : stepIsDone
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
      {(phase === "quiz" || phase === "confirm") && quizProgress.total > 0 && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          Quiz progress: <span className="font-bold text-slate-700">{quizProgress.correct}/{quizProgress.total}</span>
        </p>
      )}
    </div>
  );
}

function PhaseDivider({ from, to }) {
  const labels = {
    explain: "Explain",
    socratic: "Socratic check",
    quiz: "Quiz",
    gap_reexplain: "Gap re-explain",
    confirm: "Confirm",
    completed: "Complete",
  };
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Moving to {labels[to] || to}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function PersonaAvatar({ meta }) {
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${meta.avatarBg} ${meta.text}`}
    >
      {meta.initial}
    </div>
  );
}

function MessageBubble({ message, isActiveQuiz, userAnswer, onAnswer, sending }) {
  if (message.persona === "user") {
    return <UserBubble content={message.content} />;
  }

  const meta = PERSONA_META[message.persona] || PERSONA_META.professor;

  // Quiz question
  if (
    message.persona === "quizmaster" &&
    message.message_type === "question" &&
    message.quiz_question_json
  ) {
    return (
      <QuizCard
        message={message}
        meta={meta}
        isActive={isActiveQuiz}
        userAnswer={userAnswer}
        onAnswer={onAnswer}
        sending={sending}
      />
    );
  }

  // Quizmaster grading feedback
  if (message.persona === "quizmaster" && message.message_type === "feedback") {
    const isCorrect = /^correct\./i.test(message.content);
    const isIncorrect = /^incorrect\./i.test(message.content);
    const styleBg = isCorrect
      ? "bg-emerald-50 border-l-emerald-500 text-emerald-900"
      : isIncorrect
      ? "bg-red-50 border-l-red-500 text-red-900"
      : `${meta.bg} ${meta.border} text-slate-800`;
    return (
      <div className="flex items-start gap-3">
        <PersonaAvatar meta={meta} />
        <div className={`flex-1 max-w-2xl px-4 py-3 rounded-xl border-l-4 text-sm ${styleBg}`}>
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    );
  }

  // Generic persona message (Professor explain / Peer probe / etc.)
  return (
    <div className="flex items-start gap-3">
      <PersonaAvatar meta={meta} />
      <div className={`flex-1 max-w-2xl ${meta.bg} px-4 py-3 rounded-xl border-l-4 ${meta.border}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.text} mb-1`}>
          {meta.label}
        </p>
        <div className="text-sm text-slate-800">
          <Markdown>{message.content}</Markdown>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-2xl bg-[#1a56db] text-white px-4 py-3 rounded-xl">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function QuizCard({ message, meta, isActive, userAnswer, onAnswer, sending }) {
  const q = message.quiz_question_json;
  const correctLetter = q.correct;
  const userPick = userAnswer?.letter || null;
  const answered = userPick != null;

  return (
    <div className="flex items-start gap-3">
      <PersonaAvatar meta={meta} />
      <div className={`flex-1 max-w-2xl ${meta.bg} px-4 py-3 rounded-xl border-l-4 ${meta.border}`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${meta.text} mb-2`}>
          Quizmaster
        </p>
        {q.concept && (
          <p className="text-[11px] text-slate-500 mb-2">
            <span className="font-bold">Tests:</span> {q.concept}
            {q.difficulty && (
              <span className="ml-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {q.difficulty}
              </span>
            )}
          </p>
        )}
        <div className="text-sm text-slate-800 mb-3">
          <Markdown>{q.stem}</Markdown>
        </div>
        {/* Visuals (tables, charts) — same dispatch as the diagnostic page */}
        {q.visuals && q.visuals.length > 0 && q.visuals.map((visual, idx) => {
          if (visual.type === "table") {
            return <DataTable key={idx} title={visual.title} headers={visual.headers} rows={visual.rows} />;
          }
          if (visual.type === "chart") {
            return <QuestionChart key={idx} chartType={visual.chartType} title={visual.title} xLabel={visual.xLabel} yLabel={visual.yLabel} datasets={visual.datasets} />;
          }
          if (visual.type === "molecule") {
            return <QuestionMolecule key={idx} smiles={visual.smiles} title={visual.title} />;
          }
          if (visual.type === "pathway") {
            return <QuestionPathway key={idx} syntax={visual.syntax} title={visual.title} />;
          }
          return null;
        })}
        <div className="grid grid-cols-1 gap-2">
          {["A", "B", "C", "D"].map((letter) => {
            const choice = q.choices?.[letter];
            if (!choice) return null;
            const isCorrectAnswer = letter === correctLetter;
            const isUserPick = letter === userPick;

            let style;
            let icon = null;
            if (!answered) {
              style =
                isActive && !sending
                  ? "border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer text-slate-800"
                  : "border-slate-200 bg-white text-slate-500 cursor-not-allowed opacity-70";
            } else if (isCorrectAnswer) {
              style = "border-emerald-500 bg-emerald-50 text-emerald-900";
              icon = <span className="text-emerald-600 font-bold">✓</span>;
            } else if (isUserPick) {
              style = "border-red-400 bg-red-50 text-red-900";
              icon = <span className="text-red-600 font-bold">✗</span>;
            } else {
              style = "border-slate-100 bg-slate-50 text-slate-400";
            }

            return (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  if (isActive && !sending && !answered) onAnswer(letter);
                }}
                disabled={answered || !isActive || sending}
                className={`text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all ${style}`}
              >
                <span className="font-bold flex-shrink-0">{letter}.</span>
                <span className="flex-1">{choice}</span>
                {icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator({ persona }) {
  const meta = PERSONA_META[persona] || PERSONA_META.professor;
  return (
    <div className="flex items-start gap-3">
      <PersonaAvatar meta={meta} />
      <div className={`${meta.bg} px-4 py-3 rounded-xl border-l-4 ${meta.border}`}>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${meta.dotBg} animate-bounce`} style={{ animationDelay: "0ms" }} />
          <span className={`w-2 h-2 rounded-full ${meta.dotBg} animate-bounce`} style={{ animationDelay: "150ms" }} />
          <span className={`w-2 h-2 rounded-full ${meta.dotBg} animate-bounce`} style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function ResultsCard({ data, quizProgress, onBackToList, onDashboard }) {
  // Prefer the /complete response, but fall back to local quizProgress if it
  // hasn't arrived yet (e.g. transient network error after auto-call).
  const masteryBefore =
    data?.masteryBefore == null ? null : Math.round(parseFloat(data.masteryBefore));
  const masteryAfter =
    data?.masteryAfter == null ? null : Math.round(parseFloat(data.masteryAfter));
  const masteryDelta = data?.masteryDelta == null ? null : data.masteryDelta;
  const quizCorrect = data?.quizCorrect ?? quizProgress.correct;
  const quizTotal = data?.quizTotal ?? quizProgress.total;
  const accuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-7 text-white shadow-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Session complete</p>
          <h2 className="text-2xl font-bold">Nice work.</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Quiz</p>
          <p className="text-3xl font-bold leading-none">
            {quizCorrect}<span className="opacity-70 text-xl">/{quizTotal}</span>
          </p>
          <p className="text-xs opacity-80 mt-1">{accuracy}% accuracy</p>
        </div>
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Mastery</p>
          {masteryBefore != null && masteryAfter != null ? (
            <>
              <p className="text-3xl font-bold leading-none">
                {masteryBefore}% → {masteryAfter}%
              </p>
              {masteryDelta != null && masteryDelta !== 0 && (
                <p className="text-xs opacity-80 mt-1">
                  {masteryDelta > 0 ? "+" : ""}
                  {masteryDelta} points
                </p>
              )}
            </>
          ) : masteryAfter != null ? (
            <>
              <p className="text-3xl font-bold leading-none">{masteryAfter}%</p>
              <p className="text-xs opacity-80 mt-1">First time on this topic</p>
            </>
          ) : (
            <p className="text-sm opacity-80">No mastery data</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onBackToList}
          className="bg-white text-emerald-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          Back to Study Group
        </button>
        <button
          onClick={onDashboard}
          className="bg-white/15 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-white/25 transition-colors"
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
