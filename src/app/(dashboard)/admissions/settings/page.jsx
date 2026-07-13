import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsSettingsPage() {
  return (
    <div data-testid="admissions-settings">
      <PageHeader
        title="Settings"
        subtitle="Feature-scoped preferences. Doesn't affect your 528 AI account settings."
      />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <EmptyState
          testId="empty-settings"
          title="No preferences configured"
          description={
            "Once agents are live and personalization is meaningful, you'll be able to set defaults for tone, preferred model tier (when multiple are available), notification cadence, and privacy toggles for agent-facing metadata. Nothing is stored today."
          }
          waitingOn="Agent orchestration + a stable admissions_copilot settings surface"
        />
      </div>
    </div>
  );
}
