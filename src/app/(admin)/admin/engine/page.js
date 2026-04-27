"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import ComingSoonCard from "@/components/admin/ComingSoonCard";
import CoverageHeatmap from "@/components/admin/CoverageHeatmap";

const DIFFICULTY_COLORS = {
  easy:    "#22c55e",
  medium:  "#f59e0b",
  hard:    "#ef4444",
  unknown: "#94a3b8",
};

// Bucket 1 = 0-10 mastery, bucket 10 = 90-100. The histogram from
// width_bucket() can return out-of-range buckets (0 / 11) for values
// just outside [0, 100]; we coerce those into the nearest in-range bin.
const BUCKET_LABELS = [
  "0-10", "10-20", "20-30", "30-40", "40-50",
  "50-60", "60-70", "70-80", "80-90", "90-100",
];
const BUCKET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#facc15", "#a3e635",
  "#84cc16", "#65a30d", "#22c55e", "#16a34a", "#15803d",
];

export default function AdminEnginePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/stats/engine")
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message || "Failed to load"));
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-sm p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Coalesce out-of-range buckets into the edges (see comment above)
  const histMap = new Array(10).fill(0);
  for (const row of data.mastery_histogram || []) {
    const b = Math.max(1, Math.min(10, row.bucket));
    histMap[b - 1] += row.count;
  }
  const histogramData = histMap.map((count, i) => ({
    bucket: BUCKET_LABELS[i],
    count,
    fill: BUCKET_COLORS[i],
  }));

  const difficultyData = (data.difficulty_distribution || []).map((d) => ({
    ...d,
    fill: DIFFICULTY_COLORS[d.difficulty] || "#94a3b8",
  }));

  const mismatches = data.answer_mismatches || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Adaptive engine</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Mastery distribution, topic coverage, and Pass-2 verification corrections.
        </p>
      </div>

      {/* Mastery histogram + Difficulty distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Topic mastery distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={histogramData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                <ReTooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                  formatter={(v) => [`${v} (user, topic) rows`, "Count"]}
                  labelFormatter={(l) => `Mastery ${l}%`}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {histogramData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic">
              Each bar is the number of (user, topic) pairs with mastery in that range.
              Skew left = engine pushing too hard early; skew right = too easy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Served difficulty (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {difficultyData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No questions served in 30d.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={difficultyData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis dataKey="difficulty" tick={{ fontSize: 11, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                  <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                  <ReTooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                    formatter={(v) => [`${v.toLocaleString()} answered`, "Questions"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {difficultyData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Topic coverage heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Topic coverage by section</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageHeatmap data={data.topic_coverage || []} />
        </CardContent>
      </Card>

      {/* Answer mismatches */}
      <Card>
        <CardHeader>
          <CardTitle>
            Answer mismatches — Pass 2 corrections
            {mismatches.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">({mismatches.length} most recent)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-24">Section</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead className="w-20">Diff</TableHead>
                <TableHead className="w-20 text-center">Final</TableHead>
                <TableHead>Stem preview</TableHead>
                <TableHead className="w-32">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    No Pass-2 corrections recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                mismatches.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer">
                    <TableCell className="p-0 font-mono text-xs text-slate-500">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5">{m.id}</Link>
                    </TableCell>
                    <TableCell className="p-0 text-xs text-slate-500">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5">{m.section || "—"}</Link>
                    </TableCell>
                    <TableCell className="p-0">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5 text-sm truncate max-w-[260px]" title={m.topic}>
                        {m.topic || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="p-0 text-xs capitalize">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5">{m.difficulty || "—"}</Link>
                    </TableCell>
                    <TableCell className="p-0 text-center text-sm font-bold text-amber-600 dark:text-amber-400">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5">{m.correct_after || "—"}</Link>
                    </TableCell>
                    <TableCell className="p-0 text-xs text-slate-500 dark:text-slate-400">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5 truncate max-w-[420px]" title={m.stem_preview}>
                        {m.stem_preview || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="p-0 text-xs text-slate-500">
                      <Link href={`/admin/content/${m.id}`} className="block px-3 py-2.5 whitespace-nowrap">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cross-signal events placeholder */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Not yet instrumented</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ComingSoonCard label="Tutor +5 mastery events" phase="future" />
          <ComingSoonCard label="Flashcard -3 forgetting penalties" phase="future" />
          <ComingSoonCard label="Wrong-answer +5 review boosts" phase="future" />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic">
          Cross-signal mastery deltas would need a per-event mastery_events table — deferred.
        </p>
      </div>
    </div>
  );
}
