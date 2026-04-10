"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";

const QUALITY_BUTTONS = [
  { label: "Blackout", value: 0, color: "border-red-500 text-red-500", desc: "Didn't know at all" },
  { label: "Hard", value: 2, color: "border-amber-500 text-amber-500", desc: "Struggled to recall" },
  { label: "Good", value: 4, color: "border-emerald-500 text-emerald-500", desc: "Recalled with effort" },
  { label: "Easy", value: 5, color: "border-[#1a56db] text-[#1a56db]", desc: "Instant recall" },
];

export default function FlashcardsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscription_tier || "free";

  const [tab, setTab] = useState("review");
  const [dueCards, setDueCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  useEffect(() => {
    if (tier !== "free") {
      loadDueCards();
      loadAllCards();
    } else {
      setLoading(false);
    }
  }, []);

  const loadDueCards = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/flashcards/due?limit=50");
      setDueCards(data.cards || []);
      setStats(data.stats || null);
      setCurrentIndex(0);
      setFlipped(false);
    } catch {}
    setLoading(false);
  };

  const loadAllCards = async () => {
    try {
      const data = await apiFetch("/flashcards");
      setAllCards(data || []);
    } catch {}
  };

  const handleFlip = () => setFlipped(!flipped);

  const handleRate = async (quality) => {
    const card = dueCards[currentIndex];
    if (!card) return;
    try {
      await apiFetch(`/flashcards/${card.id}/review`, {
        method: "POST",
        body: JSON.stringify({ quality }),
      });
    } catch {}

    if (stats) {
      setStats({ ...stats, due_now: Math.max(0, (parseInt(stats.due_now) || 0) - 1) });
    }

    setFlipped(false);
    if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert(`Session complete! You reviewed ${dueCards.length} cards.`);
      loadDueCards();
    }
  };

  const handleGenerateFromWeak = async () => {
    setGenerating(true);
    try {
      const gapData = await apiFetch("/diagnostic/gap-analysis");
      const weak = gapData?.weakAreas || [];
      if (weak.length === 0) {
        alert("Complete a diagnostic first so we can identify your weak areas.");
        setGenerating(false);
        return;
      }

      const topicsData = await apiFetch("/content/topics");
      const topics = topicsData || [];
      const weakTopic = weak[0];
      const match = topics.find((t) => t.name === weakTopic.topic);
      if (!match) {
        alert("Could not find matching topic.");
        setGenerating(false);
        return;
      }

      const res = await apiFetch("/flashcards/generate", {
        method: "POST",
        body: JSON.stringify({ topicId: match.id, count: 10 }),
      });
      alert(`${res.count} flashcards created for "${weakTopic.topic}"`);
      await loadDueCards();
      await loadAllCards();
    } catch {
      alert("Failed to generate flashcards.");
    }
    setGenerating(false);
  };

  const handleCreateCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    try {
      await apiFetch("/flashcards", {
        method: "POST",
        body: JSON.stringify({ front: newFront.trim(), back: newBack.trim() }),
      });
      setNewFront("");
      setNewBack("");
      setShowCreate(false);
      alert("Your flashcard has been added.");
      await loadDueCards();
      await loadAllCards();
    } catch {
      alert("Failed to create flashcard.");
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm("Delete this flashcard?")) return;
    try {
      await apiFetch(`/flashcards/${cardId}`, { method: "DELETE" });
      setAllCards(allCards.filter((c) => c.id !== cardId));
    } catch {
      alert("Failed to delete.");
    }
  };

  const currentCard = dueCards[currentIndex];

  // ── Free tier lock ──
  if (tier === "free") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Flashcards</h1>
          <p className="text-sm font-semibold text-[#1a56db] mb-4">AI-Powered Spaced Repetition</p>
          <div className="w-10 h-0.5 bg-[#1a56db]/30 mx-auto mb-4" />
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Flashcards are not available on the Free plan. Upgrade to Scholar to unlock AI-generated flashcards with spaced repetition review.
          </p>
          <div className="text-left mb-6 space-y-1.5">
            <p className="text-sm text-slate-500">✦  AI generates cards from your weak areas</p>
            <p className="text-sm text-slate-500">✦  Spaced repetition optimizes retention</p>
            <p className="text-sm text-slate-500">✦  150 cards/month on Scholar plan</p>
          </div>
          <a href="/settings" className="inline-block bg-[#1a56db] text-white font-bold text-base px-8 py-3.5 rounded-xl hover:bg-[#1648b8]">
            Upgrade to Scholar – $29/mo
          </a>
          <button onClick={() => router.push("/dashboard")} className="block mx-auto mt-4 text-sm text-slate-400 hover:text-slate-600 cursor-pointer">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold text-[#1a56db] hover:underline cursor-pointer">
          ← Back
        </button>
        <h1 className="text-lg font-extrabold text-slate-900">Flashcards</h1>
        <button onClick={() => setShowCreate(true)} className="text-sm font-semibold text-[#1a56db] hover:underline cursor-pointer">
          + Add
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-3 mb-5">
          {[
            { label: "Due Now", value: parseInt(stats.due_now) || 0 },
            { label: "Total", value: parseInt(stats.total_cards) || 0 },
            { label: "Mastered", value: parseInt(stats.mastered_cards) || 0 },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-center">
              <p className="text-xl font-extrabold text-[#1a56db]">{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {["review", "browse"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
              tab === t
                ? "bg-[#1a56db]/10 border-[#1a56db] text-[#1a56db]"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {t === "review" ? "📖 Review" : "📋 Browse"}
          </button>
        ))}
      </div>

      {/* REVIEW TAB */}
      {tab === "review" && (
        <div>
          {loading ? (
            <div className="text-center py-16">
              <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400 mt-3">Loading cards...</p>
            </div>
          ) : dueCards.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🎉</p>
              <h2 className="text-lg font-bold text-slate-800 mb-2">No cards due!</h2>
              <p className="text-sm text-slate-500 mb-5">Generate cards from your weak areas or create your own.</p>
              <button
                onClick={handleGenerateFromWeak}
                disabled={generating}
                className={`bg-[#1a56db] text-white font-bold text-sm px-6 py-3 rounded-xl cursor-pointer ${generating ? "opacity-50" : "hover:bg-[#1648b8]"}`}
              >
                {generating ? "Generating..." : "🧬 Generate from Weak Areas"}
              </button>
            </div>
          ) : (
            <div>
              {/* Progress */}
              <p className="text-xs text-slate-400 text-center mb-3">
                {currentIndex + 1} of {dueCards.length}
              </p>

              {/* Card */}
              <div
                onClick={handleFlip}
                className="relative h-60 mb-5 cursor-pointer perspective-1000"
              >
                <div className={`absolute inset-0 transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`} style={{ transformStyle: "preserve-3d" }}>
                  {/* Front */}
                  <div className="absolute inset-0 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center backface-hidden shadow-sm">
                    {currentCard?.section_name && (
                      <p className="text-[11px] text-[#1a56db] font-semibold mb-3">
                        {currentCard.section_name} · {currentCard.topic_name}
                      </p>
                    )}
                    <p className="text-base text-slate-800 leading-relaxed">{currentCard?.front}</p>
                    <p className="absolute bottom-3 text-[11px] text-slate-400">Tap to flip</p>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center [transform:rotateY(180deg)] backface-hidden shadow-sm">
                    <p className="text-[11px] text-emerald-500 font-bold tracking-wider mb-3">ANSWER</p>
                    <p className="text-base text-slate-800 leading-relaxed">{currentCard?.back}</p>
                    {currentCard?.mnemonic && (
                      <p className="text-xs text-amber-500 mt-3 italic">💡 {currentCard.mnemonic}</p>
                    )}
                    <p className="absolute bottom-3 text-[11px] text-slate-400">Rate your recall below</p>
                  </div>
                </div>
              </div>

              {/* Rating buttons — only when flipped */}
              {flipped && (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {QUALITY_BUTTONS.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => handleRate(q.value)}
                      className={`border-2 rounded-xl py-3 text-center cursor-pointer hover:bg-slate-50 transition-colors ${q.color}`}
                    >
                      <p className="text-xs font-bold">{q.label}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{q.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Generate more */}
              <button
                onClick={handleGenerateFromWeak}
                disabled={generating}
                className={`w-full bg-[#1a56db] text-white font-bold text-sm py-3.5 rounded-xl cursor-pointer mt-2 ${generating ? "opacity-50" : "hover:bg-[#1648b8]"}`}
              >
                {generating ? "Generating..." : "🧬 Generate More Cards"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* BROWSE TAB */}
      {tab === "browse" && (
        <div>
          {allCards.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📭</p>
              <h2 className="text-lg font-bold text-slate-800 mb-2">No flashcards yet</h2>
              <p className="text-sm text-slate-500">Generate from weak areas or create your own.</p>
            </div>
          ) : (
            allCards.map((card) => (
              <div key={card.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  {card.section_name && (
                    <p className="text-[11px] text-[#1a56db] font-semibold">{card.section_name}</p>
                  )}
                  <button onClick={() => handleDeleteCard(card.id)} className="text-slate-400 hover:text-red-500 text-base cursor-pointer">✕</button>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">{card.front}</p>
                <div className="h-px bg-slate-100 my-2.5" />
                <p className="text-sm text-slate-600 leading-relaxed">{card.back}</p>
                {card.mnemonic && (
                  <p className="text-xs text-amber-500 mt-2 italic">💡 {card.mnemonic}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Card Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 mb-4">Create Flashcard</h2>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Front (Question)</label>
            <textarea
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              placeholder="What is the rate-limiting enzyme of glycolysis?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 min-h-[70px] outline-none focus:border-[#1a56db] resize-none mb-3"
            />
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Back (Answer)</label>
            <textarea
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              placeholder="Phosphofructokinase-1 (PFK-1)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 min-h-[70px] outline-none focus:border-[#1a56db] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 text-slate-500 font-semibold text-sm py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleCreateCard}
                disabled={!newFront.trim() || !newBack.trim()}
                className={`flex-1 bg-[#1a56db] text-white font-bold text-sm py-2.5 rounded-xl cursor-pointer ${
                  !newFront.trim() || !newBack.trim() ? "opacity-40" : "hover:bg-[#1648b8]"
                }`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
