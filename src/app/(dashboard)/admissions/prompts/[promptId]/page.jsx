"use client";

import { useParams } from "next/navigation";
import { useAdmissionsRunStore } from "@/features/admissions/copilot/runStore.js";
import { DraftWorkspace } from "@/features/admissions/copilot/ui/DraftWorkspace.jsx";
import { InterviewPrepPanel } from "@/features/admissions/copilot/ui/InterviewPrepPanel.jsx";
import { RunSummaryModal } from "@/features/admissions/copilot/ui/RunSummaryModal.jsx";
import { isCopilotDevModeAllowed } from "@/features/admissions/copilot/isCopilotDevModeAllowed.js";

export default function PromptDetailPage() {
  const params = useParams();
  const promptId = params?.promptId;
  const fixtures = useAdmissionsRunStore((s) => s.fixtures);
  const report = useAdmissionsRunStore((s) => s.report);

  if (!isCopilotDevModeAllowed()) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-2">Prompt</h1>
        <p className="text-sm text-slate-500" data-testid="prompt-dev-off">
          This surface is not enabled in this environment.
        </p>
      </div>
    );
  }

  const prompt = fixtures?.prompt;
  if (!prompt || prompt.promptId !== promptId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-2">Prompt</h1>
        <p className="text-sm text-slate-500" data-testid="prompt-no-fixture">
          No synthetic run has been loaded for this prompt. Return to
          the Admissions landing and click "Load synthetic run".
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="mb-4">
        <h1 className="text-lg font-semibold">Secondary prompt</h1>
        <p className="text-sm text-slate-700 mt-1">{prompt.promptText}</p>
        <p className="text-xs text-slate-500 mt-1">
          Word limit: {prompt.wordLimit ?? "—"} · Char limit:{" "}
          {prompt.charLimit ?? "—"} · category: {prompt.category}
        </p>
      </header>

      {report ? (
        <>
          <RunSummaryModal />
          <DraftWorkspace />
          <div className="mt-4">
            <InterviewPrepPanel />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500" data-testid="prompt-no-report">
          Run has not completed. Return to the Admissions landing to
          trigger the synthetic run.
        </p>
      )}
    </div>
  );
}
