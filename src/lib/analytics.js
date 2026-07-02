// Thin wrapper around posthog-js. Using a helper gives us:
//   1. A single place to swap out the analytics provider later
//   2. Safe no-ops in SSR / test / init-not-yet-run environments
//   3. Dynamic import so non-browser entry points (stores that also run
//      on the server for type-checking) don't eagerly pull in posthog-js
//   4. Silent failure — analytics errors should NEVER break the product
//
// GA4 dual-write (property 543460798):
//   - PostHog receives ALL events (existing behavior preserved).
//   - GA4 receives ONLY events in GA4_ALLOWED_EVENTS (explicit allowlist).
//     Events NOT in the allowlist stay PostHog-only. checkout_*,
//     subscription_*, and purchase events are deliberately excluded
//     from GA4 until the revenue tracking pass ships.
//   - GA4 events additionally strip high-cardinality entity IDs
//     (GA4_FORBIDDEN_KEYS) at the emission boundary. PostHog keeps
//     the full sanitized shape for debugging / session investigation.
//   - For canonical events renamed from legacy PostHog names, we ALSO
//     capture the legacy name to PostHog (POSTHOG_LEGACY_ALIASES) via
//     dual-capture — NOT posthog.alias(). Both names exist independently;
//     existing PostHog dashboards keep working unchanged.
//   - GA4 uses send_to: G-YCEJQLJ7K5 so events only reach the GA4 tag,
//     never the Google Ads AW- tag also configured in root layout.
//
// Sanitization:
//   - Every param passes through sanitizeParams() which:
//     * strips PII-sensitive keys (SENSITIVE_KEY_PATTERNS denylist)
//     * drops non-scalars (objects, arrays, functions)
//     * coerces booleans to 0/1
//     * truncates strings to 100 chars
//   - Belt-and-suspenders: even if a call site accidentally passes raw
//     student answers, scanned document contents, or auth tokens, they
//     never leave the browser.
//
// User identity:
//   - identify() may only be called with the app's internal pseudonymous
//     DB ID (integer/UUID). Verified: users.id is SERIAL PRIMARY KEY in
//     Postgres — safe to send to GA4. Never call identify(email).
//   - GA4 user_id is set via gtag('config', ...) with send_page_view:
//     false to avoid triggering an unintended page_view.
//   - reset() clears both PostHog identity AND GA4 user_id + user_tier
//     on logout.

const GA4_MEASUREMENT_ID = "G-YCEJQLJ7K5";

// Explicit allowlist — events NOT in this set stay PostHog-only.
// Revenue/subscription events are deliberately excluded until the
// revenue tracking pass ships.
const GA4_ALLOWED_EVENTS = new Set([
  "onboarding_started",
  "onboarding_completed",
  "diagnostic_started",
  "diagnostic_completed",
  "study_plan_created",
  "study_plan_viewed",
  "flashcard_created",
  "flashcard_reviewed",
  "wrong_answer_logged",
  "wrong_answer_reviewed",
  "document_scan_started",
  "document_scan_completed",
  "tutor_opened",
  "power_study_group_opened",
  "section_drill_started",
  "email_verified",
  "settings_viewed",
  "pricing_viewed",
  "study_group_started",
  "study_group_completed",
  "account_deleted",
]);

// canonical event name -> legacy PostHog event name to ALSO capture.
// Not a rename — both names fire independently to PostHog. GA4 receives
// only the canonical name.
const POSTHOG_LEGACY_ALIASES = {
  onboarding_completed: "signup_completed",
};

// High-cardinality entity IDs — allowed in PostHog (useful for
// debugging / session investigation) but STRIPPED from GA4 events at
// the emission boundary. GA4's data model penalizes high-cardinality
// dimensions with dimension explosion and aggregation slowdown.
// PostHog handles high-cardinality gracefully.
// user_id / userId are also here: user identity flows to GA4 via
// identify() -> gtag('config', ..., {user_id}), never as event params.
const GA4_FORBIDDEN_KEYS = new Set([
  "attempt_id", "attemptId",
  "question_id", "questionId",
  "card_id", "cardId",
  "session_id", "sessionId",
  "scan_id", "scanId",
  "topic_id", "topicId",
  "user_id", "userId",
]);

// Params whose normalized key contains any of these substrings are
// DROPPED before events leave the browser. Backstop against accidental
// PII/secret leakage. Call sites should already avoid these; this is
// defense in depth.
const SENSITIVE_KEY_PATTERNS = [
  "email",
  "password",
  "token",
  "secret",
  "phone",
  "full_name",
  "first_name",
  "last_name",
  "answer_text",
  "raw_answer",
  "scan_text",
  "document_text",
  "prompt",
  "response_text",
  "image",
  "base64",
];

function isSensitiveKey(key) {
  const lower = String(key).toLowerCase();
  for (const pat of SENSITIVE_KEY_PATTERNS) {
    if (lower.includes(pat)) return true;
  }
  return false;
}

function sanitizeParams(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean") { out[key] = value ? 1 : 0; continue; }
    if (typeof value === "number") {
      if (Number.isFinite(value)) out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      out[key] = trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
      continue;
    }
    // objects, arrays, functions, symbols, bigints: silently dropped
  }
  return out;
}

function stripGa4Forbidden(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (GA4_FORBIDDEN_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function getPosthog() {
  if (typeof window === "undefined") return null;
  try {
    return window.posthog || null;
  } catch {
    return null;
  }
}

function getGtag() {
  if (typeof window === "undefined") return null;
  return typeof window.gtag === "function" ? window.gtag : null;
}

export function track(event, properties) {
  const props = sanitizeParams({ platform: "web", ...properties });

  // PostHog: canonical name + optional legacy dual-capture. Gets the
  // full sanitized props — high-cardinality entity IDs are valuable
  // for debugging / session investigation.
  const posthog = getPosthog();
  if (posthog) {
    try { posthog.capture(event, props); } catch {}
    const legacy = POSTHOG_LEGACY_ALIASES[event];
    if (legacy) {
      try { posthog.capture(legacy, props); } catch {}
    }
  }

  // GA4: only if the event is in the allowlist AND with entity IDs
  // stripped. Prevents high-cardinality dimension explosion in GA4
  // while PostHog keeps the full detail.
  if (!GA4_ALLOWED_EVENTS.has(event)) return;
  const gtag = getGtag();
  if (gtag) {
    const ga4Props = stripGa4Forbidden(props);
    try {
      gtag("event", event, { send_to: GA4_MEASUREMENT_ID, ...ga4Props });
    } catch {}
  }
}

export function identify(distinctId, properties) {
  const posthog = getPosthog();
  const gtag = getGtag();
  if (!distinctId) return;
  const idString = String(distinctId);
  const cleanProps = sanitizeParams(properties);

  if (posthog) {
    try { posthog.identify(idString, cleanProps); } catch {}
  }
  if (gtag) {
    // send_page_view: false prevents this config call from firing
    // an automatic page_view (which would double-count against the
    // GA4PageViewTracker's controlled page_view emission).
    try {
      gtag("config", GA4_MEASUREMENT_ID, {
        user_id: idString,
        send_page_view: false,
      });
    } catch {}
    if (Object.keys(cleanProps).length) {
      try { gtag("set", "user_properties", cleanProps); } catch {}
    }
  }
}

export function reset() {
  const posthog = getPosthog();
  const gtag = getGtag();

  if (posthog) {
    try { posthog.reset(); } catch {}
  }

  if (gtag) {
    // Clear GA4 user_id association on logout. send_page_view: false
    // prevents an unwanted page_view. Also clear user_tier (only
    // user property we currently set) explicitly.
    try {
      gtag("config", GA4_MEASUREMENT_ID, {
        user_id: null,
        send_page_view: false,
      });
    } catch {}
    try {
      gtag("set", "user_properties", { user_tier: null });
    } catch {}
  }
}
