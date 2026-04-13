// Next.js 16 client-side instrumentation hook.
//
// This file runs in the browser before the app becomes interactive. We use
// it to initialize Sentry for the browser runtime.
//
// `onRouterTransitionStart` is re-exported from Sentry so the SDK can track
// client-side navigation as part of traces.

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,

    // 10% of page loads get a transaction; 100% in dev
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session replay is handled by PostHog — don't double-record here
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    sendDefaultPii: false,

    // Filter out expected noise so the dashboard stays signal-heavy
    ignoreErrors: [
      // Rate limits are expected, not bugs
      "Too many requests",
      "Too many auth requests",
      "Too many payment requests",
      // Expected auth failures
      "401",
      "Unauthorized",
      // Browser extension noise
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed",
      // Network errors users can't act on
      "Network request failed",
      "Load failed",
    ],
  });
}

// Re-export so Next.js can wire client-side navigation tracking into traces
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
