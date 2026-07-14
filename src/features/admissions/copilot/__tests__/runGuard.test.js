// runGuard proves the runtime fetch proxy allows only
// GET /api/admissions/health and throws on any other request.

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { installRunGuard, withRunGuard, RunGuardViolation } from "../runGuard.js";

describe("runGuard — installed proxy", () => {
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

  test("allows GET /api/admissions/health", async () => {
    const res = await target.fetch("/api/admissions/health");
    expect(res.status).toBe(200);
    expect(originalFetch).toHaveBeenCalledTimes(1);
  });

  test("allows implicit GET (no method) to the health path", async () => {
    const res = await target.fetch("http://localhost:3001/api/admissions/health");
    expect(res.status).toBe(200);
  });

  test("blocks GET to any non-health URL", () => {
    expect(() => target.fetch("/api/admissions/drafts")).toThrow(RunGuardViolation);
  });

  test("blocks POST to the health URL", () => {
    expect(() =>
      target.fetch("/api/admissions/health", { method: "POST" })
    ).toThrow(RunGuardViolation);
  });

  test("blocks any other verb", () => {
    for (const m of ["PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(() =>
        target.fetch("/api/admissions/health", { method: m })
      ).toThrow(RunGuardViolation);
    }
  });

  test("restore removes the guard", () => {
    restore();
    expect(target.fetch).toBe(originalFetch);
    restore = () => {};
  });
});

describe("withRunGuard()", () => {
  test("runs body under the guard and restores after", async () => {
    const target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    const originalFetch = target.fetch;
    const result = await withRunGuard(async () => {
      await target.fetch("/api/admissions/health");
      return "ok";
    }, target);
    expect(result).toBe("ok");
    expect(target.fetch).toBe(originalFetch);
  });

  test("restores after an exception", async () => {
    const target = { fetch: vi.fn(() => Promise.resolve({ status: 200 })) };
    const originalFetch = target.fetch;
    await expect(
      withRunGuard(async () => {
        target.fetch("/api/admissions/drafts");
      }, target)
    ).rejects.toThrow(RunGuardViolation);
    expect(target.fetch).toBe(originalFetch);
  });
});
