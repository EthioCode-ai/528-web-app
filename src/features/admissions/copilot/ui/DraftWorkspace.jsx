"use client";

import { useAdmissionsRunStore } from "../runStore.js";
import { StoryMatchPanel } from "./StoryMatchPanel.jsx";
import { SchoolFitPanel } from "./SchoolFitPanel.jsx";
import { IntegrityPanel } from "./IntegrityPanel.jsx";

export function DraftWorkspace() {
  const report = useAdmissionsRunStore((s) => s.report);
  const fixtures = useAdmissionsRunStore((s) => s.fixtures);
  const focused = useAdmissionsRunStore((s) => s.focusedSentenceId);
  const focusSentence = useAdmissionsRunStore((s) => s.focusSentence);
  if (!report?.draft || !fixtures) {
    return (
      <p className="text-sm text-slate-500" data-testid="workspace-empty">
        No synthetic run loaded.
      </p>
    );
  }
  const { draft } = report;
  const evidenceById = new Map(fixtures.evidenceItems.map((e) => [e.evidenceId, e]));
  const citationsById = new Map(fixtures.citations.map((c) => [c.citationId, c]));

  return (
    <div data-testid="draft-workspace" className="grid grid-cols-3 gap-3">
      <section className="col-span-2 border rounded p-4">
        <h2 className="text-sm font-semibold mb-3">Draft (agent-generated)</h2>
        <div className="text-sm leading-relaxed">
          {draft.sentenceIndex.map((s) => {
            const raw = draft.draftText.slice(s.spanStart, s.spanEnd);
            const isFocused = focused === s.sentenceId;
            return (
              <span
                key={s.sentenceId}
                data-testid={`sentence-${s.sentenceId}`}
                data-classified-as={s.classifiedAs}
                onClick={() => focusSentence(s.sentenceId)}
                className={`cursor-pointer ${isFocused ? "bg-yellow-100" : ""}`}
              >
                {raw + " "}
              </span>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {draft.wordCount} words · {draft.charCount} chars · author={draft.authorType}
        </div>
        {focused && (
          <div className="mt-3 border-t pt-2 text-xs" data-testid="trace-panel">
            {(() => {
              const s = draft.sentenceIndex.find((x) => x.sentenceId === focused);
              if (!s) return null;
              return (
                <div>
                  <div className="text-slate-500 mb-1">classified as {s.classifiedAs}</div>
                  {s.linkedEvidenceIds.map((id) => {
                    const e = evidenceById.get(id);
                    return (
                      <div key={id} data-testid={`trace-evidence-${id}`}>
                        Evidence: <b>{e?.title || id}</b>
                      </div>
                    );
                  })}
                  {s.linkedCitationIds.map((id) => {
                    const c = citationsById.get(id);
                    return (
                      <div key={id} data-testid={`trace-citation-${id}`}>
                        Citation: <b>{c?.verifierNote?.slice(0, 60) || id}</b>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </section>
      <aside>
        <IntegrityPanel />
        <StoryMatchPanel />
        <SchoolFitPanel />
      </aside>
    </div>
  );
}
