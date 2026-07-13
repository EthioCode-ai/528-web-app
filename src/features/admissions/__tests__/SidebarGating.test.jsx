// Sidebar Admissions entry — tier-gating behavior.
//
// Reviewer requirement: "Respect Elite+/entitlement placeholder gating
// without changing real production entitlements." The sidebar shows
// the Admissions entry ONLY when the current user's subscription_tier
// is elite or vip. The authoritative gate is backend-side (§4).
//
// Rather than importing the full DashboardLayout (which pulls the
// entire dashboard shell + zustand stores + effects), we test the
// gating rule with a small pure helper that mirrors the same logic
// used in layout.js. If the layout's logic diverges, this test would
// still pass — so we also snapshot-check the layout file's source
// contains the tier check to catch drift.

import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// Mirrors the visibleLinks computation in
// src/app/(dashboard)/layout.js. Kept as a pure helper here so we can
// exercise it deterministically per (tier, portal flag) combination.
function computeVisibleLinkKeys(tier, portalEnabled) {
  const navLinks = [
    "/dashboard", "/diagnostic", "/section-drill", "/study-group",
    "/journal", "/flashcards", "/study-plan", "/scan", "/settings",
  ];
  const showAdmissions = portalEnabled && (tier === "elite" || tier === "vip");
  const idx = navLinks.findIndex((h) => h === "/study-plan");
  return showAdmissions && idx >= 0
    ? [...navLinks.slice(0, idx + 1), "/admissions", ...navLinks.slice(idx + 1)]
    : navLinks;
}

describe("sidebar Admissions entry — tier gating (portal flag ON)", () => {
  const PORTAL_ON = true;

  test("free tier: sidebar does not include /admissions", () => {
    expect(computeVisibleLinkKeys("free", PORTAL_ON)).not.toContain("/admissions");
  });

  test("scholar tier: sidebar does not include /admissions", () => {
    expect(computeVisibleLinkKeys("scholar", PORTAL_ON)).not.toContain("/admissions");
  });

  test("elite tier: sidebar includes /admissions immediately after /study-plan", () => {
    const links = computeVisibleLinkKeys("elite", PORTAL_ON);
    const idx = links.indexOf("/admissions");
    expect(idx).toBeGreaterThan(0);
    expect(links[idx - 1]).toBe("/study-plan");
  });

  test("vip tier: sidebar includes /admissions immediately after /study-plan", () => {
    const links = computeVisibleLinkKeys("vip", PORTAL_ON);
    const idx = links.indexOf("/admissions");
    expect(idx).toBeGreaterThan(0);
    expect(links[idx - 1]).toBe("/study-plan");
  });

  test("undefined / null / unknown tier: sidebar does not include /admissions", () => {
    expect(computeVisibleLinkKeys(undefined, PORTAL_ON)).not.toContain("/admissions");
    expect(computeVisibleLinkKeys(null, PORTAL_ON)).not.toContain("/admissions");
    expect(computeVisibleLinkKeys("premium", PORTAL_ON)).not.toContain("/admissions");
  });
});

describe("sidebar Admissions entry — frontend portal flag OFF (dark preview)", () => {
  const PORTAL_OFF = false;

  test.each([
    ["free"],
    ["scholar"],
    ["elite"],
    ["vip"],
    ["premium"],
    [undefined],
    [null],
  ])("tier=%s: sidebar hides /admissions when portal flag is off", (tier) => {
    expect(computeVisibleLinkKeys(tier, PORTAL_OFF)).not.toContain("/admissions");
  });
});

describe("layout.js source contains the tier gate + admissions insert (drift check)", () => {
  test("dashboard layout references admissionsLink + tier check", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../../app/(dashboard)/layout.js"),
      "utf8"
    );
    // Guard-rail: if someone removes the tier check or the
    // admissionsLink declaration, this test flags the regression.
    expect(src).toMatch(/admissionsLink/);
    expect(src).toMatch(/tier\s*===\s*["']elite["']/);
    expect(src).toMatch(/tier\s*===\s*["']vip["']/);
    // The admissions link href must exist in the source.
    expect(src).toMatch(/["']\/admissions["']/);
    // The frontend portal flag MUST gate showAdmissions — regression
    // guard against a future refactor that drops the flag check.
    expect(src).toMatch(/NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED/);
    expect(src).toMatch(/portalEnabled/);
    // Fake data check — the sidebar must not ship a hardcoded
    // "Elite+" claim that the user has been granted; it's just a
    // positioning label on the link.
    expect(src).not.toMatch(/admissions_copilot.*grant/);
  });
});
