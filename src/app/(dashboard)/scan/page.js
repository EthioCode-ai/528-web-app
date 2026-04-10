"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";

export default function ScanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscription_tier || "free";
  const isElite = tier === "elite" || tier === "vip";

  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [chatMode, setChatMode] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setExplanation(null);
    setError(null);
    setChatMode(null);
    setChatMessages([]);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const mimeType = file.type || "image/jpeg";
      setImageData({ base64, mimeType });
      await analyzeImage(base64, mimeType);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64, mimeType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/scan/explain", {
        method: "POST",
        body: JSON.stringify({ image: base64, mimeType }),
      });
      setExplanation(data.explanation);
    } catch (err) {
      if (err.message?.includes("403")) {
        setError("This feature requires 528 Elite.");
      } else {
        setError(err.message || "Failed to analyze image. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleStartChat = async (mode) => {
    setChatMode(mode);
    setChatMessages([]);
    setChatLoading(true);
    try {
      const data = await apiFetch("/scan/chat", {
        method: "POST",
        body: JSON.stringify({ explanation, mode, conversationHistory: [], message: null }),
      });
      setChatMessages([{ role: "assistant", content: data.reply }]);
    } catch {
      setChatMessages([{ role: "assistant", content: "Sorry, I had trouble starting. Please try again." }]);
    }
    setChatLoading(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");

    const updated = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(updated);
    setChatLoading(true);

    try {
      const history = updated.slice(1).map((m) => ({ role: m.role, content: m.content }));
      const data = await apiFetch("/scan/chat", {
        method: "POST",
        body: JSON.stringify({ explanation, mode: chatMode, conversationHistory: history, message: null }),
      });
      setChatMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch {
      setChatMessages([...updated, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    }
    setChatLoading(false);
  };

  const handleReset = () => {
    setImageData(null);
    setImagePreview(null);
    setExplanation(null);
    setError(null);
    setChatMode(null);
    setChatMessages([]);
    setChatInput("");
  };

  // ── Lock screen ──
  if (!isElite) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">MCAT Scanner</h1>
          <p className="text-sm font-semibold text-[#1a56db] mb-4">AI-Powered Image Analysis</p>
          <div className="w-10 h-0.5 bg-[#1a56db]/30 mx-auto mb-4" />
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Scan any textbook question, formula, or diagram and get an instant MCAT-focused explanation with interactive tutoring.
          </p>
          <div className="text-left mb-6 space-y-1.5">
            <p className="text-sm text-slate-500">✦  Scan questions from any MCAT prep book</p>
            <p className="text-sm text-slate-500">✦  Instant AI breakdown of formulas and diagrams</p>
            <p className="text-sm text-slate-500">✦  Socratic tutoring on scanned content</p>
            <p className="text-sm text-slate-500">✦  ELI5 mode for simplified explanations</p>
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
        <h1 className="text-lg font-extrabold text-slate-900">MCAT Scanner</h1>
        <div className="w-16" />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Instructions */}
      {!imagePreview && !loading && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📸</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Scan Any MCAT Content</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-md mx-auto">
            Upload a photo of a textbook question, formula, diagram, or notes. 528 AI will analyze it, explain it, and teach you the concept.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#1a56db] text-white font-bold text-base py-4 rounded-xl cursor-pointer hover:bg-[#1648b8] mb-3"
          >
            📷 Upload Image
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          {imagePreview && (
            <img src={imagePreview} alt="Scan preview" className="w-full max-h-64 object-contain rounded-xl mb-4" />
          )}
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Analyzing your image...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-10">
          {imagePreview && (
            <img src={imagePreview} alt="Scan preview" className="w-full max-h-64 object-contain rounded-xl mb-4" />
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-700">{error}</p>
          </div>
          <button onClick={handleReset} className="border-2 border-[#1a56db] text-[#1a56db] font-bold text-sm px-6 py-3 rounded-xl cursor-pointer hover:bg-[#1a56db]/5">
            Try Again
          </button>
        </div>
      )}

      {/* Result */}
      {explanation && !loading && (
        <div>
          {imagePreview && (
            <img src={imagePreview} alt="Scan preview" className="w-full max-h-64 object-contain rounded-xl mb-4 border border-slate-200" />
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
            <h3 className="text-base font-bold text-[#1a56db] mb-3">MCAT Analysis</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{explanation}</p>
          </div>

          {/* Teaching buttons */}
          {!chatMode && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Want to go deeper?</h3>
              {[
                { mode: "socratic", icon: "🧑‍🏫", label: "Teach Me This", desc: "Socratic tutoring with guided questions", color: "border-emerald-500 text-emerald-600" },
                { mode: "eli5", icon: "🧠", label: "Explain Like I'm 5", desc: "Simple analogies, zero jargon", color: "border-amber-500 text-amber-600" },
                { mode: "freeform", icon: "❓", label: "Ask a Question", desc: "Free-form Q&A about this content", color: "border-[#1a56db] text-[#1a56db]" },
              ].map((btn) => (
                <button
                  key={btn.mode}
                  onClick={() => handleStartChat(btn.mode)}
                  className={`w-full flex items-center gap-3 bg-white border-2 rounded-xl p-4 mb-2.5 text-left cursor-pointer hover:bg-slate-50 transition-colors ${btn.color.split(" ")[0]}`}
                >
                  <span className="text-2xl">{btn.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${btn.color.split(" ")[1]}`}>{btn.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{btn.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Chat */}
          {chatMode && (
            <div className="bg-slate-50 border border-[#1a56db]/20 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#1a56db]">
                  {chatMode === "socratic" ? "🧑‍🏫 Socratic Tutor" : chatMode === "eli5" ? "🧠 ELI5 Mode" : "❓ Q&A"}
                </p>
                <button onClick={() => { setChatMode(null); setChatMessages([]); }} className="text-slate-400 hover:text-slate-600 text-base cursor-pointer">✕</button>
              </div>

              <div className="max-h-64 overflow-y-auto mb-3 flex flex-col gap-2">
                {chatMessages.map((m, i) => (
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
                {chatLoading && <p className="text-xs text-slate-400 italic">Thinking...</p>}
                <div ref={chatEndRef} />
              </div>

              {chatMode !== "eli5" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={chatMode === "socratic" ? "Type your answer..." : "Ask a question..."}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1a56db]"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-[#1a56db] text-white text-sm font-semibold px-4 rounded-lg cursor-pointer hover:bg-[#1648b8] disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              )}

              {chatMode === "eli5" && chatMessages.length > 0 && (
                <button
                  onClick={() => handleStartChat("freeform")}
                  className="w-full border border-[#1a56db]/30 text-[#1a56db] text-sm font-semibold py-2.5 rounded-lg mt-2 cursor-pointer hover:bg-[#1a56db]/5"
                >
                  Have a question? Tap to ask →
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 bg-[#1a56db] text-white font-bold text-sm py-3.5 rounded-xl cursor-pointer hover:bg-[#1648b8]">
              Scan Another
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 rounded-xl px-4 flex items-center justify-center cursor-pointer hover:bg-slate-50">
              <span className="text-xl">📷</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
