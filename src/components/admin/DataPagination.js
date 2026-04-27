"use client";

import Button from "@/components/admin/ui/Button";

export default function DataPagination({ page, pages, total, onPageChange }) {
  if (!pages || pages <= 1) {
    return (
      <div className="flex items-center justify-end text-xs text-slate-500 dark:text-slate-400 mt-3 px-1">
        {total} {total === 1 ? "result" : "results"}
      </div>
    );
  }
  const canPrev = page > 1;
  const canNext = page < pages;
  return (
    <div className="flex items-center justify-between mt-3 px-1">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Page {page} of {pages} · {total.toLocaleString()} total
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
          ← Prev
        </Button>
        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          Next →
        </Button>
      </div>
    </div>
  );
}
