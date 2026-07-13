import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsMetricsPage() {
  return (
    <div data-testid="admissions-metrics">
      <PageHeader
        title="Academic metrics & standardized scores"
        subtitle="Self-reported. Distinct from your 528 AI diagnostic performance."
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <EmptyState
          testId="empty-academic"
          title="Academic metrics (GPA + coursework)"
          description={
            "Cumulative GPA, science GPA, last-60 GPA, degree, major, and transcript source. Versioned so a later transcript update never overwrites earlier snapshots. Nothing recorded here today."
          }
          nextAction="Add academic metrics"
          waitingOn="admissions.academic_metrics migration"
        />
        <EmptyState
          testId="empty-scores"
          title="Standardized scores (MCAT + PREview)"
          description={
            "Official MCAT scores including section breakdown (Chem/Phys, CARS, Bio/Biochem, Psych/Soc). AAMC PREview is a first-class input scored 1–9 on its own scale. These values are self-reported — Admissions Copilot never reads them from your 528 AI diagnostic history."
          }
          nextAction="Add a score"
          waitingOn="admissions.standardized_scores migration (with PREVIEW test_type support)"
        />
      </div>
    </div>
  );
}
