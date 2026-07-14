"use client";

import { useAdmissionsRunStore } from "../runStore.js";

export function InterviewPrepPanel() {
  const report = useAdmissionsRunStore((s) => s.report);
  if (!report?.interviewPack) return null;
  return (
    <section data-testid="interview-prep-panel" className="border rounded p-4">
      <h3 className="text-sm font-semibold mb-2">Interview prep</h3>
      <ol className="space-y-2 text-sm">
        {report.interviewPack.questions.map((q, i) => (
          <li key={i}>
            <div className="font-medium">{q.questionText}</div>
            <div className="text-xs text-slate-500">
              axis: {q.axisKey} · themes: {q.expectedThemes.join(", ")} ·
              mapped stories: {q.mappedEvidenceIds.length}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
