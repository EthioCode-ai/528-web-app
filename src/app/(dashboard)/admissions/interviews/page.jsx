import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsInterviewsPage() {
  return (
    <div data-testid="admissions-interviews">
      <PageHeader
        title="Interview prep"
        subtitle="Practice sessions, rubric-based coaching, safety-aware."
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <EmptyState
          testId="empty-interviews"
          title="No practice sessions yet"
          description={
            "Choose a mode (MMI, traditional, panel, video) and step through interview-style questions with rubric-based coaching feedback across ten evaluation dimensions. Deterministic coaching only — no external LLM provider is engaged for real applicant answers until a dedicated Admissions provider policy is approved."
          }
          waitingOn="admissions.interview_sessions + admissions.interview_questions migrations"
        />
      </div>
    </div>
  );
}
