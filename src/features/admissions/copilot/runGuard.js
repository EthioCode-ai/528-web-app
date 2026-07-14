// Runtime fetch proxy — belt-and-braces guard that the Gate 4 flow
// never reaches an unapproved URL. See plan v0.2 §9.4.
//
// Allow rules (both conditions must hold):
//   1. Method is exactly "GET".
//   2. Target is either
//        a) a relative URL whose pathname is exactly "/api/admissions/health"
//           (a leading query string / hash is OK; a trailing path segment
//           is NOT — "/api/admissions/health/extra" is REJECTED), OR
//        b) an absolute URL whose pathname is exactly "/api/admissions/health"
//           AND whose origin matches the current window's origin
//           (same-origin only; external hosts are REJECTED).
//
// Every other URL or method throws RunGuardViolation. Nested calls
// are safe: installRunGuard() returns a restore function that
// unwinds to whatever fetch was live before the install.

const EXPECTED_PATHNAME = "/api/admissions/health";
const HTTP_METHOD_ALLOWED = "GET";

// Sentinel origin used only to give the URL parser a base for
// relative inputs — never treated as a permitted absolute origin.
const RELATIVE_PARSE_BASE = "http://runguard-relative-base.invalid";

export class RunGuardViolation extends Error {
  constructor(message, meta) {
    super(message);
    this.name = "RunGuardViolation";
    this.meta = meta;
  }
}

function urlFromInit(input) {
  if (typeof input === "string") return input;
  if (input && typeof input === "object") {
    if ("url" in input && typeof input.url === "string") return input.url;
    if (typeof URL !== "undefined" && input instanceof URL) return input.toString();
  }
  return String(input);
}

function methodFromInit(input, init) {
  if (init && typeof init.method === "string") return init.method.toUpperCase();
  if (input && typeof input === "object" && "method" in input) {
    return String(input.method).toUpperCase();
  }
  return "GET";
}

function currentOrigin() {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return null;
}

function isRelativeInput(rawUrl) {
  // Anything starting with a scheme (http:, https:, etc.) is absolute.
  // Leading "//" is a protocol-relative absolute URL — treated as absolute
  // and thus subject to the same-origin check.
  if (rawUrl.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(rawUrl)) return false;
  return rawUrl.startsWith("/");
}

function isHealthProbe(rawUrl, method) {
  if (method !== HTTP_METHOD_ALLOWED) return false;

  if (isRelativeInput(rawUrl)) {
    let parsed;
    try {
      parsed = new URL(rawUrl, RELATIVE_PARSE_BASE);
    } catch {
      return false;
    }
    // Only the pathname decides; query strings / hashes are fine.
    return parsed.pathname === EXPECTED_PATHNAME;
  }

  // Absolute input — same-origin AND exact pathname.
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.pathname !== EXPECTED_PATHNAME) return false;
  const origin = currentOrigin();
  if (!origin) return false; // no browser origin to compare against — refuse
  return parsed.origin === origin;
}

export function installRunGuard(target = globalThis) {
  const originalFetch = target.fetch;
  if (typeof originalFetch !== "function") {
    throw new RunGuardViolation("no fetch present to guard", { target });
  }
  const guarded = function guardedFetch(input, init) {
    const url = urlFromInit(input);
    const method = methodFromInit(input, init);
    if (isHealthProbe(url, method)) return originalFetch.call(target, input, init);
    throw new RunGuardViolation(
      "Gate 4 runGuard: only same-origin GET /api/admissions/health is permitted",
      { url, method }
    );
  };
  guarded.__runGuard = true;
  guarded.__originalFetch = originalFetch;
  target.fetch = guarded;
  return function restore() {
    if (target.fetch === guarded) target.fetch = originalFetch;
  };
}

export async function withRunGuard(body, target = globalThis) {
  const restore = installRunGuard(target);
  try {
    return await body();
  } finally {
    restore();
  }
}
