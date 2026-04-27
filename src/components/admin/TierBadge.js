"use client";

import Badge from "@/components/admin/ui/Badge";

const VARIANTS = {
  free:    "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  scholar: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  elite:   "bg-amber-600 text-white dark:bg-amber-700",
  vip:     "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
};

export default function TierBadge({ tier }) {
  const t = (tier || "free").toLowerCase();
  return (
    <Badge className={`uppercase tracking-wider text-[10px] ${VARIANTS[t] || VARIANTS.free}`}>
      {t}
    </Badge>
  );
}
