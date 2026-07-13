import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsExperiencesPage() {
  return (
    <div data-testid="admissions-experiences">
      <PageHeader
        title="Hours, activities, and evidence"
        subtitle="Your private ledger. Agents will read from it; you write it."
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <EmptyState
          testId="empty-hours"
          title="Experience hours by category"
          description={
            "Clinical, research, volunteer clinical, volunteer non-clinical, shadowing, teaching, leadership, employment. Aggregated snapshot for fast dashboards; individual activities are captured separately below."
          }
          nextAction="Enter hours"
          waitingOn="admissions.experience_hours migration (Required-now table per v0.2)"
        />
        <EmptyState
          testId="empty-activities"
          title="Individual activities"
          description={
            "Each meaningful role — job, research position, volunteer commitment — with dates, hours, and a description. Flag any Most Meaningful selections and add the narrative when you're ready."
          }
          nextAction="Add an activity"
          waitingOn="admissions.activities migration"
        />
        <EmptyState
          testId="empty-evidence"
          title="Evidence bank"
          description={
            "Atomic pieces of evidence — anecdotes, metrics, quotes, observations — tagged by activity and evidence_type. Drafts and interview responses will cite these entries by ID so every claim traces back to something you actually experienced."
          }
          nextAction="Add evidence"
          waitingOn="admissions.evidence_items migration"
        />
      </div>
    </div>
  );
}
