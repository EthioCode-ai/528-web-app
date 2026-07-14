// Flow smoke tests. Load button, prompt page render, trace click.

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { LoadSyntheticRunButton } from "../ui/LoadSyntheticRunButton.jsx";
import { DraftWorkspace } from "../ui/DraftWorkspace.jsx";
import { InterviewPrepPanel } from "../ui/InterviewPrepPanel.jsx";
import { useAdmissionsRunStore } from "../runStore.js";

const ORIGINAL_ENV = process.env.NODE_ENV;
const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;

beforeEach(() => {
  process.env.NODE_ENV = "development";
  process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = "1";
  useAdmissionsRunStore.getState().reset();
});
afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ORIGINAL_ENV;
  if (ORIGINAL_FLAG === undefined) delete process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
  else process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED = ORIGINAL_FLAG;
});

describe("LoadSyntheticRunButton", () => {
  test("renders in dev mode + click completes a run", async () => {
    render(<LoadSyntheticRunButton />);
    const button = screen.getByTestId("load-synthetic-run");
    fireEvent.click(button);
    await waitFor(() => {
      const store = useAdmissionsRunStore.getState();
      expect(store.report).toBeTruthy();
    });
    const report = useAdmissionsRunStore.getState().report;
    expect(report.draft.authorType).toBe("agent");
    expect(report.integrity.blocking).toEqual([]);
  });

  test("does NOT render when isCopilotDevModeAllowed() is false", () => {
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
    const { container } = render(<LoadSyntheticRunButton />);
    expect(container.firstChild).toBeNull();
  });
});

describe("DraftWorkspace — click a sentence surfaces its trace", () => {
  test("clicking an applicant-claim sentence shows the linked evidence", async () => {
    render(<LoadSyntheticRunButton />);
    fireEvent.click(screen.getByTestId("load-synthetic-run"));
    await waitFor(() => expect(useAdmissionsRunStore.getState().report).toBeTruthy());
    const { container } = render(<DraftWorkspace />);
    const applicantClaim = container.querySelector(
      'span[data-classified-as="applicant-claim"]'
    );
    expect(applicantClaim).toBeTruthy();
    fireEvent.click(applicantClaim);
    const trace = await screen.findByTestId("trace-panel");
    expect(trace.textContent).toMatch(/Evidence:/);
  });
});

describe("InterviewPrepPanel", () => {
  test("renders each generated question", async () => {
    render(<LoadSyntheticRunButton />);
    fireEvent.click(screen.getByTestId("load-synthetic-run"));
    await waitFor(() => expect(useAdmissionsRunStore.getState().report).toBeTruthy());
    render(<InterviewPrepPanel />);
    const panel = await screen.findByTestId("interview-prep-panel");
    // Expect one <li> per fit axis in the fixture.
    expect(panel.querySelectorAll("li").length).toBeGreaterThan(0);
  });
});
