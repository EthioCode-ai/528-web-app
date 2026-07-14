"use client";

import { useState } from "react";
import { isCopilotDevModeAllowed } from "../isCopilotDevModeAllowed.js";
import { useAdmissionsRunStore } from "../runStore.js";
import { runOrchestrator } from "../runOrchestrator.js";
import { GATE4_FIXTURE_BUNDLE } from "../../validation/fixtures/synthetic/gate4.js";

export function LoadSyntheticRunButton() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const loadFixtures = useAdmissionsRunStore((s) => s.loadFixtures);
  const completeRun = useAdmissionsRunStore((s) => s.completeRun);
  const setPhase = useAdmissionsRunStore((s) => s.setPhase);
  const fail = useAdmissionsRunStore((s) => s.fail);

  if (!isCopilotDevModeAllowed()) return null;

  const handleClick = async () => {
    try {
      setError(null);
      setRunning(true);
      loadFixtures(GATE4_FIXTURE_BUNDLE);
      const report = await runOrchestrator(GATE4_FIXTURE_BUNDLE, {
        onPhase: (p) => setPhase(p),
      });
      completeRun({ report });
    } catch (err) {
      setError(err.message);
      fail(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="border border-amber-400 bg-amber-50 rounded p-4 my-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-semibold text-amber-800">
            DEV MODE — Synthetic Run Only
          </p>
          <p className="text-sm text-amber-900 mt-1">
            Loads a fully synthetic applicant + school + prompt bundle
            and runs the deterministic Copilot pipeline in-browser.
            No data leaves this tab.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={running}
          data-testid="load-synthetic-run"
          className="ml-4 rounded bg-amber-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {running ? "Running..." : "Load synthetic run"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-700 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
