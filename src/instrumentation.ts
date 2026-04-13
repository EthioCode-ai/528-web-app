// Next.js 16 server-side instrumentation hook.
//
// `register()` runs once when a Next.js server instance starts, before any
// requests are handled. We use it to initialize Sentry for the nodejs and
// edge runtimes. The NEXT_RUNTIME env var tells us which one we're in.
//
// `onRequestError` is called by Next.js whenever a Server Component, Route
// Handler, or Server Action throws an unhandled error. We forward it to
// Sentry.captureRequestError so those errors show up in the dashboard.

import type { Instrumentation } from "next";

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    });
  }
}

// Called by Next.js on server errors (Server Components, Route Handlers,
// Server Actions). Forwarding to Sentry.captureRequestError gives the error
// full request context in the Sentry dashboard.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
};
