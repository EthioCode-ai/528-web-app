"use client";

// Topic-coverage heatmap. One cell per topic, sized by aamc_weight,
// colored by users_attempted (saturation = how many distinct users
// have hit the topic at least once). Hover for details.
//
// Input shape (from /admin/stats/engine → topic_coverage):
//   { topic, section, section_code, aamc_weight,
//     users_attempted, avg_mastery, total_attempts }
//
// Coloring rule: low coverage = red (gap), medium = amber, high = green.
// Thresholds are relative to the max users_attempted in the dataset so
// the heatmap stays readable as the user-base grows.
const SECTION_LABEL = {
  chem_phys:   "Chem/Phys",
  cars:        "CARS",
  bio_biochem: "Bio/Biochem",
  psych_soc:   "Psych/Soc",
};

function colorFor(usersAttempted, maxUsers) {
  if (maxUsers === 0 || usersAttempted === 0) {
    return { bg: "bg-red-100 dark:bg-red-950/40", border: "border-red-200 dark:border-red-900", label: "text-red-700 dark:text-red-300" };
  }
  const pct = usersAttempted / maxUsers;
  if (pct < 0.25) return { bg: "bg-red-100 dark:bg-red-950/40",      border: "border-red-200 dark:border-red-900",     label: "text-red-700 dark:text-red-300" };
  if (pct < 0.6)  return { bg: "bg-amber-100 dark:bg-amber-950/40",  border: "border-amber-200 dark:border-amber-900", label: "text-amber-700 dark:text-amber-300" };
  return { bg: "bg-green-100 dark:bg-green-950/40", border: "border-green-200 dark:border-green-900", label: "text-green-700 dark:text-green-300" };
}

export default function CoverageHeatmap({ data = [] }) {
  if (!data.length) {
    return <p className="text-sm text-slate-400 py-8 text-center">No topic coverage data yet.</p>;
  }

  const maxUsers = Math.max(0, ...data.map((d) => d.users_attempted || 0));

  // Group by section so the layout has natural row breaks
  const bySection = data.reduce((acc, t) => {
    const code = t.section_code || "unknown";
    if (!acc[code]) acc[code] = [];
    acc[code].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900" />
          Gap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900" />
          Some coverage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-900" />
          Strong coverage
        </span>
        <span className="ml-auto">cells sized by AAMC weight · color = unique users attempted</span>
      </div>

      {Object.entries(bySection).map(([code, topics]) => (
        <div key={code}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            {SECTION_LABEL[code] || code}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => {
              const c = colorFor(t.users_attempted || 0, maxUsers);
              const weight = t.aamc_weight || 1;
              const widthBase = Math.max(80, Math.min(220, 80 + weight * 12));
              return (
                <div
                  key={t.topic}
                  title={`${t.topic}\nUsers: ${t.users_attempted} · Avg mastery: ${(t.avg_mastery || 0).toFixed(1)} · Attempts: ${t.total_attempts}\nAAMC weight: ${weight}`}
                  className={`${c.bg} ${c.border} border rounded p-2 cursor-default`}
                  style={{ width: widthBase, minHeight: 64 }}
                >
                  <p className={`text-[11px] font-semibold ${c.label} leading-tight`} title={t.topic}>
                    {t.topic}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                    {t.users_attempted} users · {(t.avg_mastery || 0).toFixed(0)}% mastery
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
