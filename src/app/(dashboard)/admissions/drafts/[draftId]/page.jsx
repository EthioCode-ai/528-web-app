import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default async function AdmissionsDraftDetailPage({ params }) {
  await params;
  return (
    <div data-testid="admissions-draft-detail">
      <PageHeader
        title="Draft workspace"
        subtitle="Outline · versions · claims → evidence · integrity findings"
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <EmptyState
          testId="empty-draft-workspace"
          title="This draft has no versions yet"
          description={
            "The workspace will show a three-column layout: outline on the left, prose editor with inline claim → evidence links in the center, and the integrity findings panel on the right. Each version is immutable; you create a new version by editing. Nothing is stored in the browser or on the server yet."
          }
          waitingOn="Drafting + integrity agents plus admissions.draft_versions migration"
        />
      </div>
    </div>
  );
}
