import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";
import { LoadSyntheticRunButton } from "@/features/admissions/copilot/ui/LoadSyntheticRunButton";

export default function AdmissionsOverviewPage() {
  return (
    <div data-testid="admissions-overview">
      <PageHeader
        title="Overview"
        subtitle="Preview build — end-to-end flows are not yet connected."
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <LoadSyntheticRunButton />
        <EmptyState
          testId="empty-overview"
          title="Your admissions cycle starts here"
          description={
            "This overview will summarize your applicant profile, school list, prompt work, and interview readiness once the underlying data is captured. Today the page is intentionally empty — no fake numbers, no fake charts, no placeholder applicant data. Choose a stage from the sub-navigation to explore the structure of the workflow."
          }
          waitingOn={
            "Persistence layer (Table Contract v0.2 tables), plus your first inputs on Profile and Schools. The Admissions Copilot entitlement gates the backend regardless of what this page renders."
          }
        />
      </div>
    </div>
  );
}
