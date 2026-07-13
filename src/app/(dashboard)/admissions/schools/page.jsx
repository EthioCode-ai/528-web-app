import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsSchoolsPage() {
  return (
    <div data-testid="admissions-schools">
      <PageHeader
        title="School list"
        subtitle="Reach, target, and safety choices — your call. The agent may suggest rebalancing."
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <EmptyState
          testId="empty-schools"
          title="No schools on your list yet"
          description={
            "Add schools you're considering, categorize by priority, and track per-school status (considering, applying, submitted, interviewing, admitted, waitlisted, rejected). Individual school research and secondary prompts open up per school once at least one is added."
          }
          nextAction="Add a school"
          waitingOn="admissions.schools reference-data seed + admissions.application_schools migration"
        />
      </div>
    </div>
  );
}
