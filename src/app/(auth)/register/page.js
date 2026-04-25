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
