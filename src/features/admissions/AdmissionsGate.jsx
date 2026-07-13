"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAdmissionsPortalEnabled } from "./portalFlag";

// Two-layer gate for Admissions Copilot.
//
// Layer 1 — frontend portal flag (NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED)
//   When unset, the portal preview is DARK for everyone, including
//   elite/vip. No /api/admissions/health probe happens — the gate
//   short-circuits and redirects direct navigation to
//   /admissions/unavailable. This lets us merge the skeleton to main
//   without exposing the surface until we explicitly enable it.
//
// Layer 2 — backend feature-gate detection (only runs when portal flag
// is set)
//   On mount, probes GET /api/admissions/health:
//     200 → feature is available; render children
//     404 → backend router not mounted (ADMISSIONS_COPILOT_ENABLED
//           unset or backend at rest); redirect to /admissions/unavailable
//     401 → auth expired; redirect to /login (matches existing app flow)
//     403 → caller lacks entitlement; render an inline unavailable
//           state so the caller can request access without losing
//           their spot in the sidebar
//     other → treat as unavailable to fail closed
//
// The gate NEVER assumes the entitlement based on tier. Tier is only
// used by the sidebar to hide the entry cosmetically. This gate is
// the truth on whether the surface can render.
//
// The health probe is the ONLY network call this gate is permitted to
// make in Gate 2, and it only fires when the portal flag is set.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function joinPath(base, path) {
  if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
  if (!base.endsWith("/") && !path.startsWith("/")) return base + "/" + path;
  return base + path;
}

export default function AdmissionsGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ status: "checking" });

  useEffect(() => {
    // Never re-probe on the unavailable page itself — that page must
    // render even when the backend is off OR when the portal flag is
    // unset.
    if (pathname === "/admissions/unavailable") {
      setState({ status: "ok" });
      return;
    }

    // Layer 1: portal flag. When unset, no probe fires — we send the
    // caller straight to /admissions/unavailable.
    if (!isAdmissionsPortalEnabled()) {
      router.replace("/admissions/unavailable");
      return;
    }

    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(joinPath(API_BASE, "/api/admissions/health"), { headers })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 200) {
          setState({ status: "ok" });
        } else if (res.status === 401) {
          router.replace("/login");
        } else if (res.status === 403) {
          setState({ status: "no_entitlement" });
        } else {
          // 404 or anything else → unavailable
          router.replace("/admissions/unavailable");
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network failure or backend not reachable — treat as unavailable
        router.replace("/admissions/unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (state.status === "checking") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-[240px] flex items-center justify-center"
        data-testid="admissions-gate-checking"
      >
        <div className="w-6 h-6 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state.status === "no_entitlement") {
    return (
      <div
        className="max-w-2xl mx-auto py-10 px-6 text-center"
        data-testid="admissions-gate-no-entitlement"
      >
        <h1 className="text-lg font-semibold text-slate-900 mb-2">
          Admissions Copilot isn&apos;t available in your account yet
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Your subscription is active, but the Admissions Copilot entitlement
          hasn&apos;t been granted. If you were expecting access, please
          contact support.
        </p>
        <p className="text-xs text-slate-500">
          No action is required from you. The rest of your 528 AI features
          continue to work normally.
        </p>
      </div>
    );
  }

  return children;
}
