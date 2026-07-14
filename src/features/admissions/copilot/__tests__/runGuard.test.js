// runGuard — tightened per reviewer post-Gate-4 safety cleanup.
//
// Only same-origin GET /api/admissions/health is permitted. Every
// other URL, host, method, or path segment is rejected. Substring
// matches on external hosts must NOT be allowed.

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { installRunGuard, withRunGuard, RunGuardViolation } from "../runGuard.js";

// jsdom sets window.location.origin to "http://localhost:3000" by
// default. If that changes, we anchor the same-origin assertions to
// whatever jsdom reports at test time.
const JSDOM_ORIGIN =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin
    : "http://localhost:3000";

describe("runGuard — allowed requests", () => {
  let target;
  let originalFetch;
  let restore;

  beforeEach(() => {
    target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    originalFetch = target.fetch;
    restore = installRunGuard(target);
  });
  afterEach(() => {
    restore();
  });

  test("GET /api/admissions/health is allowed", async () => {
    const res = await target.fetch("/api/admissions/health");
    expect(res.status).toBe(200);
    expect(originalFetch).toHaveBeenCalledTimes(1);
  });

  test("GET /api/admissions/health?x=1 is allowed (pathname exact; query OK)", async () => {
    const res = await target.fetch("/api/admissions/health?x=1");
    expect(res.status).toBe(200);
  });

  test("GET /api/admissions/health#frag is allowed (pathname exact; hash OK)", async () => {
    const res = await target.fetch("/api/admissions/health#frag");
    expect(res.status).toBe(200);
  });

  test("same-origin absolute GET /api/admissions/health is allowed", async () => {
    const res = await target.fetch(`${JSDOM_ORIGIN}/api/admissions/health`);
    expect(res.status).toBe(200);
  });

  test("explicit method 'GET' is allowed", async () => {
    const res = await target.fetch("/api/admissions/health", { method: "GET" });
    expect(res.status).toBe(200);
  });
});

describe("runGuard — rejected requests", () => {
  let target;
  let restore;

  beforeEach(() => {
    target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    restore = installRunGuard(target);
  });
  afterEach(() => {
    restore();
  });

  test("POST /api/admissions/health is rejected", () => {
    expect(() =>
      target.fetch("/api/admissions/health", { method: "POST" })
    ).toThrow(RunGuardViolation);
  });

  test("PUT /api/admissions/health is rejected", () => {
    expect(() =>
      target.fetch("/api/admissions/health", { method: "PUT" })
    ).toThrow(RunGuardViolation);
  });

  test("PATCH /api/admissions/health is rejected", () => {
    expect(() =>
      target.fetch("/api/admissions/health", { method: "PATCH" })
    ).toThrow(RunGuardViolation);
  });

  test("DELETE /api/admissions/health is rejected", () => {
    expect(() =>
      target.fetch("/api/admissions/health", { method: "DELETE" })
    ).toThrow(RunGuardViolation);
  });

  test("GET /api/admissions/drafts is rejected", () => {
    expect(() => target.fetch("/api/admissions/drafts")).toThrow(RunGuardViolation);
  });

  test("GET https://external.example/api/admissions/health is rejected", () => {
    expect(() =>
      target.fetch("https://external.example/api/admissions/health")
    ).toThrow(RunGuardViolation);
  });

  test("GET https://some-external-domain.com/api/admissions/health is rejected", () => {
    expect(() =>
      target.fetch("https://some-external-domain.com/api/admissions/health")
    ).toThrow(RunGuardViolation);
  });

  test("GET /api/admissions/health/extra is rejected (substring guard)", () => {
    expect(() =>
      target.fetch("/api/admissions/health/extra")
    ).toThrow(RunGuardViolation);
  });

  test("GET /api/admissions/healthcheck is rejected (path prefix guard)", () => {
    expect(() =>
      target.fetch("/api/admissions/healthcheck")
    ).toThrow(RunGuardViolation);
  });

  test("protocol-relative URL is rejected", () => {
    expect(() =>
      target.fetch("//external.example/api/admissions/health")
    ).toThrow(RunGuardViolation);
  });

  test("provider-shaped URL is rejected", () => {
    expect(() =>
      target.fetch("https://api.anthropic.com/v1/messages")
    ).toThrow(RunGuardViolation);
    expect(() =>
      target.fetch("https://api.openai.com/v1/chat/completions")
    ).toThrow(RunGuardViolation);
  });
});

describe("runGuard — restore semantics", () => {
  test("restore removes the guard on explicit call", () => {
    const target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    const originalFetch = target.fetch;
    const restore = installRunGuard(target);
    expect(target.fetch).not.toBe(originalFetch);
    restore();
    expect(target.fetch).toBe(originalFetch);
  });

  test("withRunGuard restores the original fetch after success", async () => {
    const target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    const originalFetch = target.fetch;
    const result = await withRunGuard(async () => {
      await target.fetch("/api/admissions/health");
      return "ok";
    }, target);
    expect(result).toBe("ok");
    expect(target.fetch).toBe(originalFetch);
  });

  test("withRunGuard restores the original fetch after failure", async () => {
    const target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    const originalFetch = target.fetch;
    await expect(
      withRunGuard(async () => {
        target.fetch("/api/admissions/drafts");
      }, target)
    ).rejects.toThrow(RunGuardViolation);
    expect(target.fetch).toBe(originalFetch);
  });

  test("withRunGuard restores after an unrelated exception in the body", async () => {
    const target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    const originalFetch = target.fetch;
    await expect(
      withRunGuard(async () => {
        throw new Error("something else went wrong");
      }, target)
    ).rejects.toThrow(/something else went wrong/);
    expect(target.fetch).toBe(originalFetch);
  });
});
