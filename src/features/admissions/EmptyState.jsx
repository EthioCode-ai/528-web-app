"use client";

// Reusable empty-state block for Admissions pages during Gate 2.
//
// Discipline: NO fake charts, NO fake numbers, NO placeholder
// applicant data. Every empty state states plainly what the surface
// is for, what the applicant would do first, and what remains
// pending (backend, agent orchestration, UAT schema, etc.).
//
// The "nextAction" prop labels the button but the button is disabled
// during Gate 2 because backend endpoints aren't wired for these
// features yet. That's intentional — the applicant sees the shape
// of the workflow without a control that would silently do nothing.

export default function EmptyState({
  title,
  description,
  nextAction,
  waitingOn,
  icon = null,
  testId,
}) {
  return (
    <section
      data-testid={testId}
      className="max-w-2xl mx-auto mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-[#1a56db] flex items-center justify-center"
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>

          {nextAction ? (
            <div className="mt-4">
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Not yet available in this preview build"
                className="inline-flex items-center rounded-md bg-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-500 cursor-not-allowed"
              >
                {nextAction}
              </button>
              <span className="ml-3 text-xs text-slate-400">
                Not yet available in this preview build
              </span>
            </div>
          ) : null}

          {waitingOn ? (
            <p className="mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span className="font-semibold text-slate-600">
                Waiting on:
              </span>{" "}
              {waitingOn}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
