"use client";

// 7-day × 24-hour activity heatmap. Recharts has no native heatmap
// component, so this is a div-grid that's lightweight and dark-mode
// friendly. Cells fade from very faint (0 activity) to fully saturated
// (max activity in the dataset).
//
// Props:
//   data — array of {dow:0..6, hour:0..23, count:int} from
//          /api/admin/stats/usage. Missing cells render as 0.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function PeakHoursHeatmap({ data = [] }) {
  // Build a 7×24 lookup so missing cells default to 0.
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const r of data) {
    if (r.dow >= 0 && r.dow < 7 && r.hour >= 0 && r.hour < 24) {
      grid[r.dow][r.hour] = r.count;
      if (r.count > max) max = r.count;
    }
  }

  // Derive cell color intensity. We render the SAME purple base color
  // and vary opacity by count / max. Tailwind doesn't generate dynamic
  // colors at build time so we use inline style for the alpha.
  function cellStyle(count) {
    if (max === 0) {
      return { background: "rgba(148, 163, 184, 0.08)" }; // slate, faint
    }
    const intensity = count / max;
    // Min visibility floor so empty cells still show as cells; cap at 0.95.
    const alpha = count === 0 ? 0.04 : 0.12 + intensity * 0.83;
    return { background: `rgba(147, 51, 234, ${alpha})` };
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Hour ruler */}
        <div className="flex items-end pl-10">
          {HOURS.map((h) => (
            <div
              key={h}
              className="flex-1 min-w-[18px] text-center text-[9px] text-slate-400 dark:text-slate-500 tabular-nums"
            >
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {/* Rows: one per day */}
        {DAYS.map((day, dow) => (
          <div key={dow} className="flex items-center mt-0.5">
            <div className="w-10 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-2 text-right">
              {day}
            </div>
            <div className="flex flex-1 gap-0.5">
              {HOURS.map((hour) => {
                const count = grid[dow][hour];
                return (
                  <div
                    key={hour}
                    title={`${day} ${String(hour).padStart(2, "0")}:00 — ${count} answer${count === 1 ? "" : "s"}`}
                    className="flex-1 min-w-[18px] h-6 rounded-sm transition-colors"
                    style={cellStyle(count)}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-3 pl-10">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Less</span>
          {[0.05, 0.25, 0.5, 0.75, 0.95].map((a) => (
            <div
              key={a}
              className="w-4 h-3 rounded-sm"
              style={{ background: `rgba(147, 51, 234, ${a})` }}
            />
          ))}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">More</span>
          {max > 0 && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2 tabular-nums">
              · max {max.toLocaleString()}/hr
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
