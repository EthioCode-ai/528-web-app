"use client";

import { useAdmissionsRunStore } from "../runStore.js";

export function StoryMatchPanel() {
  const report = useAdmissionsRunStore((s) => s.report);
  const fixtures = useAdmissionsRunStore((s) => s.fixtures);
  if (!report?.matches || !fixtures) return null;
  const byId = new Map(fixtures.evidenceItems.map((e) => [e.evidenceId, e]));
  return (
    <section
      data-testid="story-match-panel"
      className="border rounded p-4 my-3"
    >
      <h3 className="text-sm font-semibold mb-2">Story matches</h3>
      <table className="w-full text-xs">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-1">Title</th>
            <th>Score</th>
            <th>Confirmed</th>
            <th>Reason codes</th>
          </tr>
        </thead>
        <tbody>
          {report.matches.matches.map((m) => {
            const e = byId.get(m.evidenceId);
            return (
              <tr key={m.evidenceId} className="border-t">
                <td className="py-1">{e?.title || m.evidenceId}</td>
                <td>{m.score.toFixed(3)}</td>
                <td>{e?.confirmed ? "yes" : "no"}</td>
                <td>{m.reasonCodes.join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
