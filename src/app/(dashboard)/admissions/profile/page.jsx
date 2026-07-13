import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsProfilePage() {
  return (
    <div data-testid="admissions-profile">
      <PageHeader
        title="Applicant profile"
        subtitle="You are the author. Agents propose; you approve."
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <EmptyState
          testId="empty-profile"
          title="Your profile is the anchor of every downstream step"
          description={
            "This surface will capture demographics, disadvantage narrative, institutional-action explanation, and gap-year context. Every sensitive field will be grouped explicitly and never surfaced in URLs, logs, or agent transcripts. Nothing here is stored today because the applicant-profile table has not been migrated to UAT yet."
          }
          nextAction="Start profile"
          waitingOn="admissions.applicant_profiles migration (Table Contract §B) landing on mcat_admissions_uat"
        />
      </div>
    </div>
  );
}
