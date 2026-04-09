"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";

export default function VerifyEmailPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  function handleChange(index, value) {
    if (value && !/^\d$/.test(value)) return;

    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...code];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setCode(next);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await apiFetch("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: user?.email, code: fullCode }),
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-center text-sm text-gray-500 mb-6">
        We sent a 6-digit code to{" "}
        <span className="font-semibold text-gray-700">
          {user?.email || "your email"}
        </span>
      </p>

      <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-[10px] outline-none focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/20 font-[Inter]"
          />
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-[13px] mb-4 text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3.5 text-[15px] font-bold text-white rounded-[10px] font-[Inter] tracking-tight ${
          loading
            ? "bg-blue-300 cursor-not-allowed"
            : "bg-[#1a56db] cursor-pointer hover:bg-[#1648b8]"
        }`}
      >
        {loading ? "Verifying..." : "Verify Email"}
      </button>
    </form>
  );
}
