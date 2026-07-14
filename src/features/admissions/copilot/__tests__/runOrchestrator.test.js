// runOrchestrator — happy-path + determinism + dev-mode gate refusal.

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { runOrchestrator } from "../runOrchestrator.js";
import { GATE4_FIXTURE_BUNDLE } from "../../validation/fixtures/synthetic/gate4.js";
import { RUN_PHASE } from "../constants.js";

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

describe("runOrchestrator — dev-mode gate", () => {
  test("refuses when isCopilotDevModeAllowed() is false", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
    await expect(runOrchestrator(GATE4_FIXTURE_BUNDLE)).rejects.toThrow(
      /isCopilotDevModeAllowed\(\) is false/
    );
  });

  test("permits when NODE_ENV=development AND flag='1'", async () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
    const report = await runOrchestrator(GATE4_FIXTURE_BUNDLE);
    expect(report.draft).toBeTruthy();
    expect(report.integrity).toBeTruthy();
  });
});

describe("runOrchestrator — happy path (bypassing dev gate)", () => {
  test("produces the full run report", async () => {
    const phases = [];
    const report = await runOrchestrator(GATE4_FIXTURE_BUNDLE, {
      skipDevModeGate: true,
      onPhase: (p) => phases.push(p),
    });
    expect(report.interpretation).toBeTruthy();
    expect(report.matches.matches.length).toBeGreaterThanOrEqual(2);
    expect(report.fitBrief.fitStatements.length).toBeGreaterThan(0);
    expect(report.draft.authorType).toBe("agent");
    expect(report.integrity.blocking).toEqual([]);
    expect(report.interviewPack.questions.length).toBeGreaterThan(0);
    expect(phases).toContain(RUN_PHASE.DONE);
  });

  test("byte-deterministic across two runs (same fixture + seed)", async () => {
    const a = await runOrchestrator(GATE4_FIXTURE_BUNDLE, { skipDevModeGate: true });
    const b = await runOrchestrator(GATE4_FIXTURE_BUNDLE, { skipDevModeGate: true });
    // runId is deterministic from prompt + seed
    expect(a.runId).toBe(b.runId);
    expect(a.draft.draftText).toBe(b.draft.draftText);
    expect(a.matches).toEqual(b.matches);
    expect(a.fitBrief).toEqual(b.fitBrief);
    expect(a.interviewPack).toEqual(b.interviewPack);
  });
});
