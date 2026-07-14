// Gate 5 portal persistence adapter — Phase 1 apiClient shell.
//
// Wraps fetch() with:
//   • the UAT backend base URL (NEXT_PUBLIC_ADMISSIONS_API_BASE)
//   • Bearer auth from the current session's token
//   • If-Match: <version> on mutations (409 handling)
//   • Idempotency-Key on POST/PUT (24h server-side cache)
//   • the Gate 3 error envelope (throws ApiClientError with parsed body)
//
// This module intentionally does NOT run inside the Gate 4
// runOrchestrator's runGuard scope — persistence calls happen at
// component mount / user click, outside the deterministic run. The
// runGuard remains unchanged from Gate 4.1.
//
// Phase 2 will layer per-entity adapters on top of this client.

const DEFAULT_TIMEOUT_MS = 15000;

export class ApiClientError extends Error {
  constructor({ status, body, requestId }) {
    super(`Admissions API error ${status}: ${body?.error || "unknown"}`);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
    this.requestId = requestId || body?.requestId || null;
    this.error = body?.error || null;
    this.violations = body?.violations || null;
  }
}

function getApiBase() {
  const base = process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE;
  if (!base) {
    throw new Error(
      "apiClient: NEXT_PUBLIC_ADMISSIONS_API_BASE is not set. Configure it in the UAT env."
    );
  }
  return base.replace(/\/+$/, "");
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("token") || null;
  } catch (_err) {
    return null;
  }
}

function joinPath(base, path) {
  if (!path.startsWith("/")) path = "/" + path;
  return base + path;
}

/**
 * Low-level request wrapper.
 *
 * @param {Object} opts
 * @param {"GET"|"POST"|"PUT"} opts.method
 * @param {string} opts.path                  e.g. "/gate5/me/profile"
 * @param {object} [opts.body]                JSON body for POST/PUT
 * @param {string} [opts.ifMatch]             optimistic-concurrency version for PUT
 * @param {string} [opts.idempotencyKey]      caller-generated key for POST/PUT
 * @param {AbortSignal} [opts.signal]         caller cancellation
 * @param {number}  [opts.timeoutMs=DEFAULT_TIMEOUT_MS]
 * @returns {Promise<{ status:number, body:any, requestId:string|null }>}
 */
export async function apiRequest(opts) {
  const {
    method,
    path,
    body,
    ifMatch,
    idempotencyKey,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = opts;
  if (!method || !path) throw new Error("apiRequest: method and path are required");

  const base = getApiBase();
  const url = joinPath(base, path);

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ifMatch) headers["If-Match"] = String(ifMatch);
  if (idempotencyKey) headers["Idempotency-Key"] = String(idempotencyKey);

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutHandle);
    throw new ApiClientError({
      status: 0,
      body: { error: "network", message: String(err && err.message) || "network" },
    });
  }
  clearTimeout(timeoutHandle);

  let parsed = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (_err) {
      parsed = { error: "server_error", message: "response was not JSON" };
    }
  }
  const requestId = parsed?.requestId || null;

  if (!response.ok) {
    throw new ApiClientError({ status: response.status, body: parsed, requestId });
  }
  return { status: response.status, body: parsed, requestId };
}

// Convenience wrappers for the four verbs Gate 5 uses.
export const apiGet = (path, opts) =>
  apiRequest({ method: "GET", path, ...(opts || {}) });
export const apiPost = (path, body, opts) =>
  apiRequest({ method: "POST", path, body, ...(opts || {}) });
export const apiPut = (path, body, opts) =>
  apiRequest({ method: "PUT", path, body, ...(opts || {}) });

export const _internal = { getApiBase, getAuthToken, joinPath };
