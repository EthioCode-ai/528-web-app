"use client";

import { useAdmissionsRunStore } from "../runStore.js";

export function SchoolFitPanel() {
  const report = useAdmissionsRunStore((s) => s.report);
  if (!report?.fitBrief) return null;
  return (
    <section
      data-testid="school-fit-panel"
      className="border rounded p-4 my-3"
    >
      <h3 className="text-sm font-semibold mb-2">School-fit brief</h3>
      <ul className="space-y-2">
        {report.fitBrief.fitStatements.map((s) => (
          <li key={s.axisKey} className="text-sm">
            <span className="text-xs uppercase font-mono text-slate-500 mr-2">
              {s.axisKey}
            </span>
            {s.brief}
            <span className="text-xs text-slate-500 ml-2">
              cites {s.citationRefs.length} source(s)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
