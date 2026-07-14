// Runtime fetch proxy — belt-and-braces guard that the Gate 4 flow
// never reaches an unapproved URL. See plan v0.2 §9.4.
//
// Behavior:
//   • Any GET request to a path matching /api/admissions/health
//     is allowed (this is Gate 2's health probe).
//   • Any other URL, any other method → throws with a distinctive
//     error the integrity panel can surface.
//
// Usage: withRunGuard(async () => { ...orchestrator body... })
// The proxy is installed inside the callback and restored on
// return/throw. Nested calls are safe (last install wins; restore
// unwinds).

const ALLOWED_HEALTH_PATH = /\/api\/admissions\/health\b/;
const HTTP_METHOD_ALLOWED = "GET";

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
  if (input && typeof input === "object" && "method" in input) return String(input.method).toUpperCase();
  return "GET";
}

function isHealthProbe(url, method) {
  if (method !== HTTP_METHOD_ALLOWED) return false;
  return ALLOWED_HEALTH_PATH.test(url);
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
      "Gate 4 runGuard: only GET /api/admissions/health is permitted",
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
