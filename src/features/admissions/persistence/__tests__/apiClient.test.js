// Portal apiClient — verifies header shape, base-URL resolution,
// error envelope handling, and that the fetch spy is called with
// the exact URL / headers Gate 5 expects.

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { apiRequest, apiGet, apiPost, apiPut, ApiClientError, _internal }
  from "../apiClient.js";

const ORIGINAL_BASE = process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE;

beforeEach(() => {
  process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE = "https://uat.example.test/api/admissions";
  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.localStorage.setItem("token", "test-jwt");
  }
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true, requestId: "rq-1" }), { status: 200 }));
});

afterEach(() => {
  if (ORIGINAL_BASE === undefined) delete process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE;
  else process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE = ORIGINAL_BASE;
});

describe("_internal", () => {
  test("joinPath appends leading slash if missing", () => {
    expect(_internal.joinPath("https://x/api", "y")).toBe("https://x/api/y");
    expect(_internal.joinPath("https://x/api", "/y")).toBe("https://x/api/y");
  });

  test("getApiBase strips trailing slashes", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE = "https://x/api/admissions///";
    expect(_internal.getApiBase()).toBe("https://x/api/admissions");
  });

  test("getApiBase throws when unset", () => {
    delete process.env.NEXT_PUBLIC_ADMISSIONS_API_BASE;
    expect(() => _internal.getApiBase()).toThrow(/NEXT_PUBLIC_ADMISSIONS_API_BASE/);
  });
});

describe("apiRequest — headers + URL", () => {
  test("GET sends only Accept + Authorization", async () => {
    await apiGet("/gate5/me/profile");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const call = globalThis.fetch.mock.calls[0];
    expect(call[0]).toBe("https://uat.example.test/api/admissions/gate5/me/profile");
    const opts = call[1];
    expect(opts.method).toBe("GET");
    expect(opts.headers.Accept).toBe("application/json");
    expect(opts.headers.Authorization).toBe("Bearer test-jwt");
    expect(opts.headers["Content-Type"]).toBeUndefined();
    expect(opts.headers["If-Match"]).toBeUndefined();
    expect(opts.headers["Idempotency-Key"]).toBeUndefined();
  });

  test("POST includes Content-Type + Idempotency-Key", async () => {
    await apiPost("/gate5/me/metrics", { cumulativeGPA: 3.9 }, { idempotencyKey: "k-1" });
    const [, opts] = globalThis.fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers["Idempotency-Key"]).toBe("k-1");
    expect(JSON.parse(opts.body)).toEqual({ cumulativeGPA: 3.9 });
  });

  test("PUT includes If-Match", async () => {
    await apiPut("/gate5/me/profile", { applicantLabel: "Alpha" }, { ifMatch: "42" });
    const [, opts] = globalThis.fetch.mock.calls[0];
    expect(opts.method).toBe("PUT");
    expect(opts.headers["If-Match"]).toBe("42");
  });

  test("no auth token → Authorization header absent", async () => {
    window.localStorage.removeItem("token");
    await apiGet("/gate5/me/profile");
    const [, opts] = globalThis.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });
});

describe("apiRequest — error handling", () => {
  test("non-2xx throws ApiClientError with parsed body", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "auth", requestId: "rq-2" }), { status: 401 })
    );
    await expect(apiGet("/gate5/me/profile")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 401,
      error: "auth",
      requestId: "rq-2",
    });
  });

  test("422 with violations surfaces violations", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: "validation",
          violations: [{ ruleId: "gpa.range", target: ["metrics.cumulativeGPA"], message: "GPA…" }],
          requestId: "rq-3",
        }),
        { status: 422 }
      )
    );
    try {
      await apiPost("/gate5/me/metrics", { cumulativeGPA: 4.5 });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.status).toBe(422);
      expect(err.violations[0].ruleId).toBe("gpa.range");
    }
  });

  test("network failure yields ApiClientError with status 0", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(apiGet("/gate5/me/profile")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 0,
    });
  });

  test("non-JSON body treated as server_error", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("<html>500</html>", { status: 500 })
    );
    await expect(apiGet("/gate5/me/profile")).rejects.toMatchObject({
      status: 500,
      body: expect.objectContaining({ error: "server_error" }),
    });
  });
});
