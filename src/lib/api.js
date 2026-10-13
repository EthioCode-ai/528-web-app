const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// options.timeoutMs — if set, the request is aborted after that many ms and
// a Error('request_timeout') is thrown with err.code = 'request_timeout'.
// Default is no timeout (fetch's own default). Pass it for long-running
// AI-backed endpoints so a hung network / server never leaves the UI
// spinning forever with no recovery affordance.
export async function apiFetch(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const { timeoutMs, signal: externalSignal, ...fetchOptions } = options;

  let timeoutId;
  let controller;
  let fetchSignal = externalSignal;
  if (timeoutMs && typeof AbortController !== "undefined") {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    // If caller passed their own signal too, link them so either triggers abort.
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    fetchSignal = controller.signal;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers, signal: fetchSignal });
  } catch (err) {
    if (err.name === "AbortError" && timeoutMs && controller?.signal.aborted) {
      const timeoutErr = new Error("Request timed out");
      timeoutErr.code = "request_timeout";
      timeoutErr.timeoutMs = timeoutMs;
      throw timeoutErr;
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || body.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json();
}
