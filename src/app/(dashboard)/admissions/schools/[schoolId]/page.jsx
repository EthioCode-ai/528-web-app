import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

// Note: params is intentionally awaited here rather than destructured
// synchronously. In Next.js 15 dynamic route params are async — this
// prevents a Vercel dev-time warning in future builds without changing
// the empty-state behavior.
export default async function AdmissionsSchoolDetailPage({ params }) {
  await params;
  return (
    <div data-testid="admissions-school-detail">
      <PageHeader
        title="School research & notes"
        subtitle="External school statements stay separate from your applicant evidence."
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <EmptyState
          testId="empty-school-notes"
          title="Your notes (applicant-owned)"
          description={
            "Freeform notes about this school — application-service quirks, program fit reflections, contact history. Kept separate from the school-research agent's output."
          }
          nextAction="Add notes"
          waitingOn="admissions.school_notes migration (deferred group)"
        />
        <EmptyState
          testId="empty-school-research"
          title="School research (agent-produced)"
          description={
            "Once the school-research agent runs, this panel shows a concise summary, strategic inference, and a source list with access date and verified/unverified status. Every fact will link to its source. External statements are never presented as your facts."
          }
          waitingOn="School-research agent orchestration (Gate 4) plus admissions.school_research_runs migration"
        />
      </div>
    </div>
  );
}
