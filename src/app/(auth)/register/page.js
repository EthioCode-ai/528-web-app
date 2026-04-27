"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { track } from "@/lib/analytics";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Portal mount flag — needed because document.body is undefined on the
  // server. The video iframe is portaled to <body> so it escapes the auth
  // card's backdrop-filter containing block; otherwise position:fixed
  // resolves relative to the card (which lands the video center-screen).
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsDuplicate(false);
    setLoading(true);

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      setAuth(data.token, data.user);
      track("signup_completed", { userId: data.user?.id });
      router.push("/verify-email");
    } catch (err) {
      if (err.status === 409) {
        setIsDuplicate(true);
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Pictory promo video — portaled to <body> so it sits at the true
          bottom-right of the viewport, outside the card's backdrop-filter
          containing block. Hidden below 1100px so it never overlaps the
          card on tablets/phones. */}
      {portalReady &&
        createPortal(
          <div
            className="hidden min-[1100px]:block"
            style={{
              position: "fixed",
              bottom: 32,
              right: 32,
              width: 480,
              height: 270,
              zIndex: 50,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.25)",
            }}
          >
            <iframe
              src="https://video.pictory.ai/embed/202604242044173853848a7aab788444bb891b413b623b858/20260424221006845Ufd4A0FN5BTYamU"
              title="528 AI: The MCAT Engine"
              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>,
          document.body
        )}

      {/* Mobile-app QR panel — same portal pattern as the video so it
          anchors to the viewport, not the card's backdrop-filter context.
          Hidden below md so it never crowds the form on small screens.
          Apple QR is generated on-the-fly by api.qrserver.com encoding
          the App Store URL; Google Play card is a placeholder until the
          Android build ships. */}
      {portalReady &&
        createPortal(
          <div
            className="hidden min-[1100px]:flex"
            style={{
              position: "fixed",
              bottom: 32,
              left: 32,
              gap: 12,
              zIndex: 50,
            }}
          >
            {/* Apple App Store — LIVE */}
            <div className="w-[180px] rounded-xl bg-slate-900 border border-slate-700 p-3 flex flex-col items-center text-center shadow-lg">
              <div className="self-end mb-2 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE
              </div>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=https%3A%2F%2Fapps.apple.com%2Fus%2Fapp%2F528-ai-mcat-study-engine%2Fid6760100060"
                alt="Scan to install 528 AI on iOS"
                className="w-32 h-32 rounded bg-white p-1"
              />
              <p className="text-cyan-400 text-xs font-bold mt-2">Apple App Store</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Scan to download on iOS</p>
              <a
                href="https://apps.apple.com/us/app/528-ai-mcat-study-engine/id6760100060"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 px-3 py-1.5 rounded-full bg-cyan-400 text-slate-900 text-[11px] font-bold hover:bg-cyan-300 transition-colors inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a1 1 0 011 1v9.586l3.293-3.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L9 13.586V4a1 1 0 011-1z" />
                </svg>
                Download · LIVE
              </a>
            </div>

            {/* Google Play — Coming Soon placeholder */}
            <div className="w-[180px] rounded-xl bg-slate-900 border border-slate-700 p-3 flex flex-col items-center text-center shadow-lg">
              <div className="self-end mb-2 h-[18px]" />
              <div className="w-32 h-32 rounded bg-slate-800/60 border border-slate-700 flex flex-col items-center justify-center gap-1.5">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <rect x="6" y="2.5" width="12" height="19" rx="2.25" />
                  <line x1="11" y1="18.5" x2="13" y2="18.5" strokeLinecap="round" />
                </svg>
                <p className="text-slate-400 text-[10px] font-semibold">Google Play<br/>QR Code</p>
              </div>
              <p className="text-slate-300 text-xs font-bold mt-2">Google Play Store</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Scan to download on Android</p>
              <button
                type="button"
                disabled
                className="mt-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-semibold cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>,
          document.body
        )}

      <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-[13px] font-semibold text-gray-700 mb-1.5"
          >
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            className="w-full px-3.5 py-3 text-[15px] border border-gray-300 rounded-[10px] outline-none text-gray-900 bg-gray-50 font-[Inter]"
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-[13px] font-semibold text-gray-700 mb-1.5"
          >
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className="w-full px-3.5 py-3 text-[15px] border border-gray-300 rounded-[10px] outline-none text-gray-900 bg-gray-50 font-[Inter]"
          />
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="email"
          className="block text-[13px] font-semibold text-gray-700 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3.5 py-3 text-[15px] border border-gray-300 rounded-[10px] outline-none text-gray-900 bg-gray-50 font-[Inter]"
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="password"
          className="block text-[13px] font-semibold text-gray-700 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          className="w-full px-3.5 py-3 text-[15px] border border-gray-300 rounded-[10px] outline-none text-gray-900 bg-gray-50 font-[Inter]"
        />
      </div>

      {isDuplicate && (
        <div className="mb-4 text-center">
          <p className="text-red-600 text-[13px] mb-2">
            An account with this email already exists. Please sign in or use a different email address.
          </p>
          <Link
            href="/login"
            className="text-[#1a56db] text-[13px] font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      )}
      {error && !isDuplicate && (
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
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-[#1a56db] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </form>
    </>
  );
}
