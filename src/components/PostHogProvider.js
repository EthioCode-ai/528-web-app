"use client";

// PostHog initialization wrapper. Lives at the top of the app tree inside
// layout.tsx so every route sees the same single client instance.
//
// Two-step init dance is required:
//   1. Dynamic import of posthog-js inside useEffect (so the library only
//      loads in the browser, never on the server during SSR)
//   2. posthog.init() wired to NEXT_PUBLIC_POSTHOG_KEY / _HOST env vars
//      that Vercel already has
//
// After init, we attach the instance to window so src/lib/analytics.js can
// find it via window.posthog and call capture/identify/reset without each
// importing posthog-js itself. This keeps the bundle lean.

import { useEffect } from "react";

export default function PostHogProvider({ children }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";
    if (!key) return;

    // Already initialized — don't double-init on client navigation
    if (typeof window !== "undefined" && window.posthog && window.posthog.__loaded) {
      return;
    }

    let cancelled = false;
    import("posthog-js").then((mod) => {
      if (cancelled) return;
      const posthog = mod.default;
      posthog.init(key, {
        api_host: host,
        capture_pageview: "history_change",
        capture_pageleave: true,
        autocapture: true,
        // Privacy: mask every input element (login/signup/verify-email
        // fields, settings inputs). MCAT question text and answer choices
        // are intentionally NOT masked — watching users struggle with
        // specific questions is the whole point of session replay.
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: ".ph-mask",
          blockSelector: ".ph-no-capture",
        },
        // Don't fire capture() before init completes — prevents lost events
        // from code that runs at module load time (stores, layouts).
        loaded: (ph) => {
          if (typeof window !== "undefined") {
            window.posthog = ph;
          }
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return children;
}
