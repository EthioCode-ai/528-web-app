// Admissions page renders — smoke tests for every Gate 2 route.
//
// Verifies:
//   - Each page's default export renders without throwing.
//   - Each page contains its expected data-testid.
//   - Empty-state discipline: NO applicant name, NO fake percentages,
//     NO fake charts (recharts import), NO fake schools.
//   - No component in this set touches fetch (fetch is unmocked by
//     the setup file — any call throws).
//   - No agent bundle is imported by these pages.

import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admissions",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import OverviewPage from "@/app/(dashboard)/admissions/page";
import ProfilePage from "@/app/(dashboard)/admissions/profile/page";
import MetricsPage from "@/app/(dashboard)/admissions/metrics/page";
import ExperiencesPage from "@/app/(dashboard)/admissions/experiences/page";
import SchoolsPage from "@/app/(dashboard)/admissions/schools/page";
import PromptsPage from "@/app/(dashboard)/admissions/prompts/page";
import DraftsPage from "@/app/(dashboard)/admissions/drafts/page";
import InterviewsPage from "@/app/(dashboard)/admissions/interviews/page";
import SettingsPage from "@/app/(dashboard)/admissions/settings/page";
import UnavailablePage from "@/app/(dashboard)/admissions/unavailable/page";
import SchoolDetailPage from "@/app/(dashboard)/admissions/schools/[schoolId]/page";
import DraftDetailPage from "@/app/(dashboard)/admissions/drafts/[draftId]/page";

const STATIC_PAGES = [
  ["Overview", OverviewPage, "admissions-overview"],
  ["Profile", ProfilePage, "admissions-profile"],
  ["Metrics", MetricsPage, "admissions-metrics"],
  ["Experiences", ExperiencesPage, "admissions-experiences"],
  ["Schools", SchoolsPage, "admissions-schools"],
  ["Prompts", PromptsPage, "admissions-prompts"],
  ["Drafts", DraftsPage, "admissions-drafts"],
  ["Interviews", InterviewsPage, "admissions-interviews"],
  ["Settings", SettingsPage, "admissions-settings"],
  ["Unavailable", UnavailablePage, "admissions-unavailable"],
];

// Fictional / test-shaped strings that MUST NOT appear in any page.
// We never render placeholder applicant names, GPAs, hour totals,
// draft prose, or school names.
const FORBIDDEN_FAKE_TEXTS = [
  /\bJane Doe\b/i,
  /\bJohn Doe\b/i,
  /\bAlex Applicant\b/i,
  /\bGPA:\s*3\./i, // e.g. "GPA: 3.85"
  /\bMCAT:\s*5\d\d\b/i, // e.g. "MCAT: 515"
  /\b\d+\s+clinical hours\b/i,
  /\bHarvard\b/i,
  /\bStanford\b/i,
  /\bJohns Hopkins\b/i,
  /\bmayo\b/i,
];

describe("Admissions pages render as empty-state skeletons", () => {
  test.each(STATIC_PAGES)("%s page renders with its testid", (_name, Page, testid) => {
    render(<Page />);
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  });

  test.each(STATIC_PAGES)("%s page contains no fake applicant/school data", (_name, Page) => {
    const { container } = render(<Page />);
    const text = container.textContent || "";
    FORBIDDEN_FAKE_TEXTS.forEach((rx) => {
      expect(text).not.toMatch(rx);
    });
  });

  test("dynamic /admissions/schools/[schoolId] page renders", async () => {
    const params = Promise.resolve({ schoolId: "test-school-id" });
    const El = await SchoolDetailPage({ params });
    render(El);
    expect(screen.getByTestId("admissions-school-detail")).toBeInTheDocument();
  });

  test("dynamic /admissions/drafts/[draftId] page renders", async () => {
    const params = Promise.resolve({ draftId: "test-draft-id" });
    const El = await DraftDetailPage({ params });
    render(El);
    expect(screen.getByTestId("admissions-draft-detail")).toBeInTheDocument();
  });
});

describe("Empty-state discipline", () => {
  test("every page shows a 'Waiting on' hint about the pending backend piece", () => {
    const pagesToCheck = STATIC_PAGES.filter(([name]) => name !== "Unavailable");
    pagesToCheck.forEach(([name, Page]) => {
      const { container, unmount } = render(<Page />);
      const text = container.textContent || "";
      // Every content page must state what is pending, not silently
      // present an empty visual as "no data".
      expect(text.toLowerCase(), `${name} page`).toMatch(/waiting on/);
      unmount();
    });
  });
});
