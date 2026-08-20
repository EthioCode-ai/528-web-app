"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { track, identify } from "@/lib/analytics";

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

  // Portal mount flag — document.body is unavailable during server rendering.
  // The mobile-app QR panel is portaled to <body> once the page mounts.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  // Fire signup_started once per browser session — not per remount.
  // Register page can remount during React refresh in dev and on some
  // navigation patterns; sessionStorage guards against double-firing
  // to GA4 within the same tab session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "__signup_started_fired";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    track("signup_started", { source: "signup_form" });
  }, []);

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
      identify(data.user?.id);
      // Both PostHog and GA4 receive signup_completed as the canonical
      // event name. No legacy dual-capture needed — this IS the name
      // existing PostHog dashboards already know.
      track("signup_completed", {
        source: "email",
        user_tier: "free",
      });
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
      {/* Mobile-app QR panel — same portal pattern as the video so it
          anchors to the viewport, not the card's backdrop-filter context.
          Hidden below 1100px to avoid crowding the auth card. Transparent
          (no card chrome) so the photo's coffee mug shows through; QR is
          intentionally small but still scannable at standard reading
          distance from a phone. */}
      {portalReady &&
        createPortal(
          <div
            className="hidden min-[1100px]:flex"
            style={{
              position: "fixed",
              bottom: 24,
              left: 24,
              gap: 16,
              zIndex: 50,
            }}
          >
            {/* Apple App Store — LIVE */}
            <div className="flex flex-col items-center text-center" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
              <div className="mb-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-bold inline-flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                LIVE
              </div>
              <a
                href="https://apps.apple.com/us/app/528-ai-mcat-study-engine/id6760100060"
                target="_blank"
                rel="noopener noreferrer"
                title="Open in App Store"
              >
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=https%3A%2F%2Fapps.apple.com%2Fus%2Fapp%2F528-ai-mcat-study-engine%2Fid6760100060"
                  alt="Scan to install 528 AI on iOS"
                  className="w-20 h-20 rounded bg-white p-1 shadow-md"
                />
              </a>
              <p className="text-white text-[11px] font-bold mt-1.5">Apple App Store</p>
              <p className="text-white/80 text-[9px]">Scan on iOS</p>
            </div>

            {/* Google Play QR */}
            <div className="flex flex-col items-center text-center" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
              <div className="mb-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-bold inline-flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                LIVE
              </div>
              <a
                href="https://play.google.com/store/apps/details?id=com.neuromart.mcatstudyapp"
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Play"
              >
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.neuromart.mcatstudyapp"
                  alt="Scan to install 528 AI on Android"
                  className="w-20 h-20 rounded bg-white p-1 shadow-md"
                />
              </a>
              <p className="text-white text-[11px] font-bold mt-1.5">Google Play Store</p>
              <p className="text-white/80 text-[9px]">Scan on Android</p>
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
