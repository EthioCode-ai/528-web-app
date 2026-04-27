"use client";

import { Card, CardContent } from "@/components/admin/ui/Card";

export default function StatCard({ label, value, sub, accent }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          {label}
        </p>
        <p className={`text-2xl font-bold tabular-nums ${accent || "text-slate-900 dark:text-white"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
