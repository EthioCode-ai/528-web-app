"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

const ALL_TOPICS = [
  "Biology",
  "Biochemistry",
  "Chemistry",
  "Physics",
  "Psychology",
  "Sociology",
  "CARS",
];

const COUNT_OPTIONS = [5, 10, 20, 30];

export default function DiagnosticPage() {
  // State machine: "start" | "quiz" | "results"
  const [phase, setPhase] = useState("start");

  // Start screen
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedCount, setSelectedCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  // Quiz screen
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Results screen
  const [results, setResults] = useState(null);

  const [error, setError] = useState("");

  function toggleTopic(topic) {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleGenerate() {
    if (selectedTopics.length === 0) {
      setError("Select at least one subject.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const data = await apiFetch("/diagnostic/generate", {
        method: "POST",
        body: JSON.stringify({ topics: selectedTopics, count: selectedCount }),
      });
      setQuestions(data.questions);
      setAnswers([]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setPhase("quiz");
    } catch (err) {
      setError(err.message || "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSelectAnswer(choiceIndex) {
    setSelectedAnswer(choiceIndex);
  }

  function handleNext() {
    const updated = [...answers, { questionId: questions[currentIndex].id, answer: selectedAnswer }];
    setAnswers(updated);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
    } else {
      handleSubmit(updated);
    }
  }

  async function handleSubmit(finalAnswers) {
    setSubmitting(true);
    setError("");
    try {
      const data = await apiFetch("/diagnostic/submit", {
        method: "POST",
        body: JSON.stringify({ answers: finalAnswers }),
      });
      setResults(data);
      setPhase("results");
    } catch (err) {
      setError(err.message || "Failed to submit answers.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setPhase("start");
    setSelectedTopics([]);
    setSelectedCount(10);
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setResults(null);
    setError("");
  }

  // ── Start Screen ──
  if (phase === "start") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Diagnostic Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered questions targeting your weak areas
          </p>
        </div>

        {/* Topic selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Select Subjects
          </h2>
          <div className="flex flex-wrap gap-3">
            {ALL_TOPICS.map((topic) => {
              const active = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                    active
                      ? "bg-[#1a56db] text-white border-[#1a56db]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        {/* Count selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Number of Questions
          </h2>
          <div className="flex gap-3">
            {COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setSelectedCount(count)}
                className={`w-16 py-2.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${
                  selectedCount === count
                    ? "bg-[#1a56db] text-white border-[#1a56db]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white tracking-tight ${
            generating
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-[#1a56db] cursor-pointer hover:bg-[#1648b8]"
          }`}
        >
          {generating ? "Generating..." : "Start Diagnostic"}
        </button>
      </div>
    );
  }

  // ── Quiz Screen ──
  if (phase === "quiz") {
    const question = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const choiceLabels = ["A", "B", "C", "D"];

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1a56db] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          {question.topic && (
            <span className="inline-block text-xs font-semibold text-[#1a56db] bg-blue-50 px-2.5 py-1 rounded-md mb-4">
              {question.topic}
            </span>
          )}
          <p className="text-base font-medium text-slate-900 leading-relaxed">
            {question.text}
          </p>
        </div>

        {/* Choices */}
        <div className="flex flex-col gap-3 mb-6">
          {(question.choices || []).map((choice, i) => {
            const isSelected = selectedAnswer === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectAnswer(i)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1a56db]/5 border-[#1a56db] ring-2 ring-[#1a56db]/20"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isSelected
                      ? "bg-[#1a56db] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {choiceLabels[i]}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-[#1a56db]" : "text-slate-700"
                  }`}
                >
                  {choice}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleNext}
          disabled={selectedAnswer === null || submitting}
          className={`w-full py-3.5 rounded-xl text-[15px] font-bold text-white tracking-tight ${
            selectedAnswer === null || submitting
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-[#1a56db] cursor-pointer hover:bg-[#1648b8]"
          }`}
        >
          {submitting ? "Submitting..." : isLast ? "Submit" : "Next"}
        </button>
      </div>
    );
  }

  // ── Results Screen ──
  if (phase === "results" && results) {
    const correct = results.correct || 0;
    const total = results.total || questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    let scoreColor = "text-red-600";
    let scoreBg = "bg-red-50";
    if (pct >= 70) {
      scoreColor = "text-emerald-600";
      scoreBg = "bg-emerald-50";
    } else if (pct >= 50) {
      scoreColor = "text-amber-600";
      scoreBg = "bg-amber-50";
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Diagnostic Results
          </h1>
        </div>

        {/* Score card */}
        <div
          className={`rounded-xl p-8 mb-6 text-center ${scoreBg}`}
        >
          <p className={`text-5xl font-extrabold tracking-tight ${scoreColor}`}>
            {correct} / {total}
          </p>
          <p className={`text-lg font-semibold mt-2 ${scoreColor}`}>
            {pct}% correct
          </p>
        </div>

        {/* Subject breakdown */}
        {results.breakdown && results.breakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Breakdown by Subject
            </h2>
            <div className="flex flex-col gap-3">
              {results.breakdown.map((item) => {
                const itemPct =
                  item.total > 0
                    ? Math.round((item.correct / item.total) * 100)
                    : 0;
                let barColor = "bg-red-500";
                if (itemPct >= 70) barColor = "bg-emerald-500";
                else if (itemPct >= 50) barColor = "bg-amber-500";

                return (
                  <div key={item.topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {item.topic}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {item.correct}/{item.total} ({itemPct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${itemPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href="/journal"
            className="flex-1 py-3.5 rounded-xl text-[15px] font-bold text-[#1a56db] border-2 border-[#1a56db] text-center hover:bg-[#1a56db]/5 transition-colors"
          >
            Review Wrong Answers
          </a>
          <button
            onClick={handleRestart}
            className="flex-1 py-3.5 rounded-xl text-[15px] font-bold text-white bg-[#1a56db] hover:bg-[#1648b8] cursor-pointer"
          >
            Start New Diagnostic
          </button>
        </div>
      </div>
    );
  }

  return null;
}
