import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsDraftsPage() {
  return (
    <div data-testid="admissions-drafts">
      <PageHeader
        title="Drafts"
        subtitle="Every draft version is immutable. You approve; nothing autopublishes."
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <EmptyState
          testId="empty-drafts"
          title="No drafts yet"
          description={
            "Drafts are created from a specific school + secondary prompt after you've interpreted the prompt and matched at least one story. Each draft carries an immutable version history — an agent-produced draft, your edits, your approvals, and any integrity findings — all cited to specific evidence items."
          }
          waitingOn="Story-matching + drafting agents (Gates 4+) plus admissions.drafts and admissions.draft_versions migrations"
        />
      </div>
    </div>
  );
}
