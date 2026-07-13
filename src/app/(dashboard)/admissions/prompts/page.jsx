import PageHeader from "@/features/admissions/PageHeader";
import EmptyState from "@/features/admissions/EmptyState";

export default function AdmissionsPromptsPage() {
  return (
    <div data-testid="admissions-prompts">
      <PageHeader
        title="Secondary prompts & interpretations"
        subtitle="The agent surfaces the core question; you approve or ask for another take."
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <EmptyState
          testId="empty-prompts"
          title="No prompts on your list yet"
          description={
            "Once you've added schools to your application list, each school's secondary prompts for the current cycle appear here. You'll be able to view each prompt with word limit, prompt_type classification, and — after the prompt-interpretation agent runs — a proposed interpretation you can accept or request to redo."
          }
          waitingOn="admissions.secondary_prompts data + admissions.prompt_interpretations migration (Required-now table per v0.2)"
        />
      </div>
    </div>
  );
}
