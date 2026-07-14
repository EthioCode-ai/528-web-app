// Locked v0.2 decision 8: both conditions must hold; nothing else
// can unlock the flow.

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { isCopilotDevModeAllowed } from "../isCopilotDevModeAllowed.js";

const ORIGINAL_ENV = process.env.NODE_ENV;
const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;

function restoreEnv() {
  if (ORIGINAL_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_ENV;
  if (ORIGINAL_FLAG === undefined) delete process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
  else process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = ORIGINAL_FLAG;
}

beforeEach(() => {
  delete process.env.NODE_ENV;
  delete process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
});
afterEach(restoreEnv);

describe("isCopilotDevModeAllowed()", () => {
  test("false when neither is set", () => {
    expect(isCopilotDevModeAllowed()).toBe(false);
  });

  test("false when NODE_ENV=development but flag missing", () => {
    process.env.NODE_ENV = "development";
    expect(isCopilotDevModeAllowed()).toBe(false);
  });

  test("false when flag='1' but NODE_ENV=production", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
    expect(isCopilotDevModeAllowed()).toBe(false);
  });

  test("false when NODE_ENV=test regardless of flag", () => {
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
    expect(isCopilotDevModeAllowed()).toBe(false);
  });

  test("false when flag='true' (not literal '1')", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "true";
    expect(isCopilotDevModeAllowed()).toBe(false);
  });

  test("true only when NODE_ENV=development AND flag='1'", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
    expect(isCopilotDevModeAllowed()).toBe(true);
  });
});
