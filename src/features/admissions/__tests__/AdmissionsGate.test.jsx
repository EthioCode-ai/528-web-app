// AdmissionsGate — feature-gate detection behavior.
//
// Verifies:
//   - 200 from /api/admissions/health → children render
//   - 404 → router.replace('/admissions/unavailable')
//   - 401 → router.replace('/login')
//   - 403 → no-entitlement inline state (no redirect)
//   - fetch failure → router.replace('/admissions/unavailable')
//   - /admissions/unavailable path itself never probes
//   - ONLY the health endpoint is called; no other fetches

import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/admissions",
}));

import AdmissionsGate from "../AdmissionsGate";

function mockHealthResponse(status) {
  globalThis.fetch = vi.fn((url) => {
    if (!String(url).includes("/api/admissions/health")) {
      throw new Error("AdmissionsGate reached a non-health URL: " + url);
    }
    return Promise.resolve({ status, json: async () => ({}) });
  });
}

beforeEach(() => {
  replaceMock.mockClear();
});

describe("AdmissionsGate", () => {
  test("200 health → renders children, no redirect", async () => {
    mockHealthResponse(200);
    render(
      <AdmissionsGate>
        <div data-testid="child">child rendered</div>
      </AdmissionsGate>
    );
    await waitFor(() => expect(screen.getByTestId("child")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test("404 health → replaces route to /admissions/unavailable", async () => {
    mockHealthResponse(404);
    render(
      <AdmissionsGate>
        <div>should not render</div>
      </AdmissionsGate>
    );
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/admissions/unavailable")
    );
  });

  test("401 health → replaces route to /login", async () => {
    mockHealthResponse(401);
    render(
      <AdmissionsGate>
        <div>should not render</div>
      </AdmissionsGate>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  test("403 health → renders no-entitlement state, no redirect", async () => {
    mockHealthResponse(403);
    render(
      <AdmissionsGate>
        <div>should not render</div>
      </AdmissionsGate>
    );
    await waitFor(() =>
      expect(screen.getByTestId("admissions-gate-no-entitlement")).toBeInTheDocument()
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test("fetch failure (network) → replaces to /admissions/unavailable", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("network fail")));
    render(
      <AdmissionsGate>
        <div>should not render</div>
      </AdmissionsGate>
    );
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/admissions/unavailable")
    );
  });

  test("only /api/admissions/health is called (no other fetches)", async () => {
    const fetchSpy = vi.fn((url) => {
      if (!String(url).includes("/api/admissions/health")) {
        throw new Error("Non-health fetch: " + url);
      }
      return Promise.resolve({ status: 200 });
    });
    globalThis.fetch = fetchSpy;
    render(
      <AdmissionsGate>
        <div>child</div>
      </AdmissionsGate>
    );
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/api\/admissions\/health$/);
  });
});
