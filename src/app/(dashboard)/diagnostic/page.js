"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useDiagnosticStore from "@/stores/diagnosticStore";
import useTutorStore from "@/stores/tutorStore";
import useAuthStore from "@/stores/authStore";
import DataTable from "@/components/DataTable";
import QuestionChart from "@/components/QuestionChart";
import QuestionDiagram from "@/components/QuestionDiagram";

const SECTION_COLORS = {
  "Chem/Phys": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  "CARS": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  "Bio/Biochem": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  "Psych/Soc": { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
};

const DIFFICULTY_COLORS = {
  easy: { bg: "bg-emerald-50", text: "text-emerald-600" },
  medium: { bg: "bg-amber-50", text: "text-amber-600" },
  hard: { bg: "bg-red-50", text: "text-red-600" },
};

export default function DiagnosticPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscription_tier || "free";
  const isFree = tier === "free";

  const {
    question, questionNumber, totalQuestions, selected, submitted, isCorrect,
    loading, sectionFilter, stats, results, startDiagnostic, startSectionDrill,
    selectAnswer, submitAnswer, fetchNextQuestion, completeDiagnostic, reset,
  } = useDiagnosticStore();

  const {
    messages, loading: tutorLoading, startSession, sendMessage, reset: resetTutor,
  } = useTutorStore();

  const [showTutor, setShowTutor] = useState(false);
  const [tutorInput, setTutorInput] = useState("");
  const [startTime, setStartTime] = useState(Date.now());
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-start diagnostic or section drill on mount
  useEffect(() => {
    if (!started) {
      setStarted(true);
      if (sectionParam) {
        startSectionDrill(sectionParam);
      } else {
        startDiagnostic(20);
      }
    }
    return () => {
      reset();
      resetTutor();
    };
  }, []);

  // Reset per-question state
  useEffect(() => {
    setStartTime(Date.now());
    setShowTutor(false);
    resetTutor();
  }, [question]);

  // Scroll tutor chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Navigate to results
  useEffect(() => {
    if (results) {
      // Results shown inline — no navigation needed
    }
  }, [results]);

  const handleSubmit = async () => {
    if (!selected) return;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    await submitAnswer(timeSpent);
  };

  const handleOpenTutor = async () => {
    setShowTutor(true);
    await startSession(question, selected, question.correct, null);
  };

  const handleTutorSend = async () => {
    if (!tutorInput.trim()) return;
    const msg = tutorInput;
    setTutorInput("");
    await sendMessage(msg);
  };

  const handleNext = async () => {
    resetTutor();
    setShowTutor(false);
    if (!sectionFilter && questionNumber >= totalQuestions) {
      await completeDiagnostic();
    } else {
      await fetchNextQuestion();
    }
  };

  const handleExit = () => {
    reset();
    router.push("/dashboard");
  };

  // Build section stats from detailed stats
  const sectionStats = {};
  Object.entries(stats).forEach(([key, val]) => {
    const section = key.split("|")[0];
    if (!sectionStats[section]) sectionStats[section] = { correct: 0, total: 0 };
    sectionStats[section].correct += val.correct;
    sectionStats[section].total += val.total;
  });

  // ── Loading state ──
  if (loading && !question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-3xl mb-3">🧬</p>
        <p className="text-sm text-slate-500">Generating your question...</p>
        <div className="mt-4 w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Results state ──
  if (results) {
    const correct = results.correct || 0;
    const total = results.total || totalQuestions;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    let scoreColor = "text-red-600";
    let scoreBg = "bg-red-50";
    if (pct >= 70) { scoreColor = "text-emerald-600"; scoreBg = "bg-emerald-50"; }
    else if (pct >= 50) { scoreColor = "text-amber-600"; scoreBg = "bg-amber-50"; }

    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6 text-center">
          Diagnostic Complete
        </h1>
        <div className={`rounded-xl p-8 mb-6 text-center ${scoreBg}`}>
          <p className={`text-5xl font-extrabold tracking-tight ${scoreColor}`}>
            {correct} / {total}
          </p>
          <p className={`text-lg font-semibold mt-2 ${scoreColor}`}>
            {pct}% correct
          </p>
        </div>
        {results.breakdown && results.breakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Breakdown by Section</h2>
            <div className="flex flex-col gap-3">
              {results.breakdown.map((item) => {
                const itemPct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
                let barColor = "bg-red-500";
                if (itemPct >= 70) barColor = "bg-emerald-500";
                else if (itemPct >= 50) barColor = "bg-amber-500";
                return (
                  <div key={item.section || item.topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{item.section || item.topic}</span>
                      <span className="text-xs font-semibold text-slate-500">{item.correct}/{item.total} ({itemPct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${itemPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <a href="/journal" className="flex-1 py-3.5 rounded-xl text-[15px] font-bold text-[#1a56db] border-2 border-[#1a56db] text-center hover:bg-[#1a56db]/5 transition-colors">
            Review Wrong Answers
          </a>
          <button onClick={() => { reset(); setStarted(false); setTimeout(() => { setStarted(true); startDiagnostic(20); }, 50); }} className="flex-1 py-3.5 rounded-xl text-[15px] font-bold text-white bg-[#1a56db] hover:bg-[#1648b8] cursor-pointer">
            New Diagnostic
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const secStyle = SECTION_COLORS[question.section] || { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  const diffStyle = DIFFICULTY_COLORS[question.difficulty] || DIFFICULTY_COLORS.medium;
  const progress = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handleExit}
          className="text-xs font-semibold text-[#1a56db] border border-[#1a56db] rounded-lg px-3 py-1.5 hover:bg-[#1a56db]/5 transition-colors cursor-pointer"
        >
          ← Exit
        </button>
        <span className="text-sm text-slate-500">
          {sectionFilter ? "Section Drill" : "Diagnostic"} – Q{questionNumber}
          {!sectionFilter ? `/${totalQuestions}` : ""}
        </span>
      </div>

      {/* Progress bar */}
      {!sectionFilter && (
        <div className="h-1 bg-slate-200 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-[#1a56db] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Mini stats */}
      {Object.keys(sectionStats).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(sectionStats).map(([sec, val]) => {
            const s = SECTION_COLORS[sec] || { bg: "bg-slate-50", text: "text-slate-600" };
            return (
              <span key={sec} className={`${s.bg} ${s.text} text-[11px] font-medium px-2 py-0.5 rounded-md`}>
                {sec}: {val.correct}/{val.total}
              </span>
            );
          })}
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`${secStyle.bg} ${secStyle.text} border ${secStyle.border} text-[11px] font-medium px-2.5 py-0.5 rounded-full`}>
            {question.section}
          </span>
          <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
            {question.topic}
          </span>
          <span className={`${diffStyle.bg} ${diffStyle.text} text-[11px] font-medium px-2.5 py-0.5 rounded-full`}>
            {question.difficulty}
          </span>
        </div>

        {/* Stem */}
        <p className="text-[15px] leading-relaxed text-slate-800 mb-5">
          {question.stem}
        </p>

        {/* Visuals */}
        {question.visuals && question.visuals.length > 0 && question.visuals.map((visual, idx) => {
          if (visual.type === "table") {
            return <DataTable key={idx} title={visual.title} headers={visual.headers} rows={visual.rows} />;
          }
          if (visual.type === "chart") {
            return <QuestionChart key={idx} chartType={visual.chartType} title={visual.title} xLabel={visual.xLabel} yLabel={visual.yLabel} datasets={visual.datasets} />;
          }
          if (visual.type === "diagram") {
            return <QuestionDiagram key={idx} url={visual.url} title={visual.title} />;
          }
          return null;
        })}

        {/* Choices */}
        <div className="flex flex-col gap-2.5 mb-5">
          {Object.entries(question.choices).map(([letter, text]) => {
            let cardClass = "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50";

            if (submitted) {
              if (letter === question.correct) {
                cardClass = "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-200";
              } else if (letter === selected) {
                cardClass = "bg-red-50 border-red-400 ring-1 ring-red-200";
              } else {
                cardClass = "bg-white border-slate-100 opacity-60";
              }
            } else if (letter === selected) {
              cardClass = "bg-[#1a56db]/5 border-[#1a56db] ring-2 ring-[#1a56db]/20";
            }

            return (
              <button
                key={letter}
                type="button"
                onClick={() => selectAnswer(letter)}
                disabled={submitted}
                className={`flex items-center gap-4 p-3.5 rounded-xl border text-left transition-all ${submitted ? "" : "cursor-pointer"} ${cardClass}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  submitted && letter === question.correct
                    ? "bg-emerald-500 text-white"
                    : submitted && letter === selected
                      ? "bg-red-500 text-white"
                      : letter === selected
                        ? "bg-[#1a56db] text-white"
                        : "bg-slate-100 text-slate-500"
                }`}>
                  {letter}
                </span>
                <span className={`text-sm font-medium ${
                  submitted && letter === question.correct
                    ? "text-emerald-700"
                    : submitted && letter === selected
                      ? "text-red-700"
                      : letter === selected
                        ? "text-[#1a56db]"
                        : "text-slate-700"
                }`}>
                  {text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Submit button */}
        {!submitted && (
          <button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white tracking-tight ${
              !selected || loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-[#1a56db] cursor-pointer hover:bg-[#1648b8]"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Answer"
            )}
          </button>
        )}

        {/* Post-submit feedback */}
        {submitted && (
          <div>
            {/* Correct / Incorrect box */}
            <div className={`rounded-xl border p-4 mt-2 mb-4 ${
              isCorrect
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}>
              <p className={`font-bold text-[15px] mb-2 ${isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {question.explanation}
              </p>
            </div>

            {/* Socratic Tutor — gated */}
            {!isCorrect && !showTutor && (
              isFree ? (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-center mb-4">
                  <p className="text-2xl mb-2">🔒</p>
                  <p className="text-sm font-bold text-slate-800 mb-1">Socratic Tutor</p>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Upgrade to Scholar to get personalized AI tutoring that walks you through why you got it wrong.
                  </p>
                  <a
                    href="/settings"
                    className="inline-block bg-[#1a56db] text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-[#1648b8] transition-colors"
                  >
                    Unlock with Scholar – $29/mo
                  </a>
                </div>
              ) : (
                <button
                  onClick={handleOpenTutor}
                  className="w-full border-2 border-amber-400 text-amber-600 font-semibold text-sm py-3 rounded-xl mb-4 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  🧑‍🏫 Open Socratic Tutor
                </button>
              )
            )}

            {/* Tutor chat */}
            {showTutor && !isFree && (
              <div className="bg-slate-50 rounded-xl border border-amber-200 p-4 mb-4">
                <p className="text-xs font-semibold text-amber-600 mb-3">🧑‍🏫 Socratic Tutor</p>

                {/* Messages */}
                <div className="max-h-52 overflow-y-auto mb-3 flex flex-col gap-2">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                        m.role === "user"
                          ? "self-end bg-[#1a56db]/10 text-slate-800"
                          : "self-start bg-white border border-slate-200 text-slate-700"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {tutorLoading && (
                    <p className="text-xs text-slate-400 italic">Thinking...</p>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTutorSend()}
                    placeholder="Ask a question..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1a56db] focus:ring-1 focus:ring-[#1a56db]/20"
                  />
                </div>
                <button
                  onClick={handleTutorSend}
                  disabled={tutorLoading}
                  className={`w-full mt-2 py-2.5 rounded-lg text-sm font-semibold text-white ${
                    tutorLoading ? "bg-blue-300 cursor-not-allowed" : "bg-[#1a56db] cursor-pointer hover:bg-[#1648b8]"
                  }`}
                >
                  Send
                </button>
                <button
                  onClick={() => sendMessage("Can you explain this more simply?", { eli5: true })}
                  disabled={tutorLoading}
                  className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold text-[#1a56db] border border-[#1a56db]/30 hover:bg-[#1a56db]/5 transition-colors cursor-pointer"
                >
                  🧠 Explain Like I&apos;m 5
                </button>
              </div>
            )}

            {/* Next / View Results button */}
            <button
              onClick={handleNext}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white tracking-tight ${
                loading ? "bg-blue-300 cursor-not-allowed" : "bg-[#1a56db] cursor-pointer hover:bg-[#1648b8]"
              }`}
            >
              {!sectionFilter && questionNumber >= totalQuestions
                ? "View Results →"
                : "Next Question →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
