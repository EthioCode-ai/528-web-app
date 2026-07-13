// Unit tests for the frontend Admissions portal preview flag.
//
// Verifies the strict comparison rule: only the literal string "1"
// enables the preview. Anything else — including "true", "0", " 1 ",
// undefined, empty string — leaves it OFF.

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { isAdmissionsPortalEnabled } from "../portalFlag";

const ORIGINAL = process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
});

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = ORIGINAL;
  }
});

describe("isAdmissionsPortalEnabled()", () => {
  test("unset → false", () => {
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });

  test("empty string → false", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "";
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });

  test("'0' → false", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "0";
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });

  test("'true' (word) → false", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "true";
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });

  test("'yes' → false", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "yes";
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });

  test("' 1 ' (whitespace) → false", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = " 1 ";
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });

  test("'1' (literal) → true", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
    expect(isAdmissionsPortalEnabled()).toBe(true);
  });

  test("'11' or '10' → false (only exact '1')", () => {
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "11";
    expect(isAdmissionsPortalEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "10";
    expect(isAdmissionsPortalEnabled()).toBe(false);
  });
});
