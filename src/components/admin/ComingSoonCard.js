"use client";

import { Card, CardContent } from "@/components/admin/ui/Card";
import Badge from "@/components/admin/ui/Badge";

export default function ComingSoonCard({ label, phase = 4 }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <Badge variant="outline" className="text-[9px] py-0 h-4 px-1.5">
            Phase {phase}
          </Badge>
        </div>
        <p className="text-2xl font-bold text-slate-300 dark:text-slate-600">—</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pending instrumentation</p>
      </CardContent>
    </Card>
  );
}
