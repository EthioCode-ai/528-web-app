"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import useAuthStore from "@/stores/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      setAuth(data.token, data.user);
      router.push("/verify-email");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
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
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        Already have an account?{" "}
        <a href="/login" className="text-[#1a56db] font-semibold hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
