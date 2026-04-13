// Thin wrapper around posthog-js. Using a helper gives us:
//   1. A single place to swap out the analytics provider later
//   2. Safe no-ops in SSR / test / init-not-yet-run environments
//   3. Dynamic import so non-browser entry points (stores that also run
//      on the server for type-checking) don't eagerly pull in posthog-js
//   4. Silent failure — analytics errors should NEVER break the product
//
// Usage:
//   import { track, identify, reset } from "@/lib/analytics";
//   track("diagnostic_started", { attemptId: 42 });
//   identify(user.id, { email, subscription_tier });
//   reset();

function getPosthog() {
  if (typeof window === "undefined") return null;
  try {
    // posthog-js attaches itself to window as a singleton via the provider
    return window.posthog || null;
  } catch {
    return null;
  }
}

export function track(event, properties) {
  const posthog = getPosthog();
  if (!posthog) return;
  try {
    posthog.capture(event, properties || {});
  } catch {
    // Analytics failures must never bubble into product code
  }
}

export function identify(distinctId, properties) {
  const posthog = getPosthog();
  if (!posthog || !distinctId) return;
  try {
    posthog.identify(String(distinctId), properties || {});
  } catch {
    // swallow
  }
}

export function reset() {
  const posthog = getPosthog();
  if (!posthog) return;
  try {
    posthog.reset();
  } catch {
    // swallow
  }
}
