"use client";

import { useState } from "react";
import { useAdmissionsRunStore } from "../runStore.js";
import { EXPECTED_CONTRACT_VERSION, EXPECTED_POLICY_SNAPSHOT_VERSION }
  from "../../validation/contract/expectedSnapshotHash.js";

export function RunSummaryModal() {
  const [open, setOpen] = useState(false);
  const report = useAdmissionsRunStore((s) => s.report);
  const phase = useAdmissionsRunStore((s) => s.phase);
  if (!report) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-run-summary"
        className="text-xs underline"
      >
        Show run summary
      </button>
      {open && (
        <div
          data-testid="run-summary-modal"
          role="dialog"
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded p-4 max-w-md text-sm">
            <h3 className="font-semibold mb-2">Run summary</h3>
            <dl className="text-xs space-y-1">
              <div><dt className="inline font-medium">Run ID: </dt><dd className="inline font-mono">{report.runId}</dd></div>
              <div><dt className="inline font-medium">Seed: </dt><dd className="inline">{report.seed}</dd></div>
              <div><dt className="inline font-medium">Phase: </dt><dd className="inline">{phase}</dd></div>
              <div><dt className="inline font-medium">Contract version: </dt><dd className="inline">{EXPECTED_CONTRACT_VERSION}</dd></div>
              <div><dt className="inline font-medium">Policy snapshot: </dt><dd className="inline">{EXPECTED_POLICY_SNAPSHOT_VERSION}</dd></div>
              <div><dt className="inline font-medium">Fixture: </dt><dd className="inline">SYNTHETIC_FIXTURE=true</dd></div>
              <div className="mt-2 italic text-slate-600">
                This run was fully synthetic — no data left the browser tab.
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 text-xs underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
