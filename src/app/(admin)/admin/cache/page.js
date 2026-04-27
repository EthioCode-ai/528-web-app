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
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import StatCard from "@/components/admin/StatCard";
import Button from "@/components/admin/ui/Button";
import Badge from "@/components/admin/ui/Badge";

const SECTION_COLORS = {
  chem_phys:   "#3b82f6",
  cars:        "#22c55e",
  bio_biochem: "#9333ea",
  psych_soc:   "#f59e0b",
};

export default function AdminCachePage() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  const [audit, setAudit] = useState(null);
  const [auditBusy, setAuditBusy] = useState(false);
  const [auditError, setAuditError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/stats/cache")
      .then((d) => !cancelled && setStats(d))
      .catch((err) => !cancelled && setStatsError(err.message || "Failed to load"));
    return () => { cancelled = true; };
  }, []);

  async function runAudit() {
    setAuditBusy(true);
    setAuditError(null);
    try {
      const d = await apiFetch("/admin/cache/audit");
      setAudit(d);
    } catch (err) {
      setAuditError(err.message || "Audit failed");
    } finally {
      setAuditBusy(false);
    }
  }

  if (statsError) {
    return (
      <div className="text-red-600 dark:text-red-400 text-sm p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
        {statsError}
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sectionData = (stats.by_section || []).map((s) => ({
    section: s.section || s.code || "—",
    code: s.code,
    count: s.count,
    fill: SECTION_COLORS[s.code] || "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Question cache</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cached question pool — health, breakdown, and quality audit.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total cached"   value={(stats.totals.total).toLocaleString()} accent="text-purple-600 dark:text-purple-400" />
        <StatCard label="Flagged"        value={(stats.totals.flagged).toLocaleString()} sub="excluded from rotation" />
        <StatCard label="Times served"   value={(stats.totals.served).toLocaleString()} />
        <StatCard label="Never served"   value={(stats.totals.never_served).toLocaleString()} sub="orphans" />
        <StatCard label="Created (24h)"  value={(stats.totals.recent_24h).toLocaleString()} sub="fresh-generated" />
      </div>

      {/* Section + Difficulty + Verification — split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cached questions by section</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No cached questions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sectionData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis dataKey="section" tick={{ fontSize: 11, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                  <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                  <ReTooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                    formatter={(v) => [`${v.toLocaleString()} cached`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By difficulty</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.by_difficulty || []).length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-slate-400 h-16">No data</TableCell></TableRow>
                ) : (
                  stats.by_difficulty.map((d) => (
                    <TableRow key={d.difficulty}>
                      <TableCell className="font-medium capitalize">{d.difficulty}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Verification breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Pass-2 verification status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(stats.by_verification || []).map((v) => (
              <div
                key={v.verification}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs"
              >
                <span className={`font-mono mr-2 ${v.verification === 'corrected' ? 'text-amber-600 dark:text-amber-400' : v.verification === 'pass2_invalid' ? 'text-red-600 dark:text-red-400' : v.verification === 'confirmed' ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                  {v.verification}
                </span>
                <span className="font-semibold tabular-nums">{v.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 italic">
            <code>corrected</code> = Pass 2 changed the answer letter ·
            <code className="ml-1">pass2_invalid</code> = Pass 2 rejected the question ·
            <code className="ml-1">none</code> = pre-Pass-2 era cache row
          </p>
        </CardContent>
      </Card>

      {/* Audit panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Quality audit</CardTitle>
            <Button size="sm" onClick={runAudit} disabled={auditBusy}>
              {auditBusy ? "Scanning…" : audit ? "Re-run audit" : "Run audit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {auditError && (
            <div className="text-red-600 dark:text-red-400 text-sm mb-3">{auditError}</div>
          )}
          {!audit && !auditError && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Click <strong>Run audit</strong> to scan the cache for formatting issues
              (broken LaTeX, prose math without $ delimiters, duplicate choices, etc.).
              The same detector logic is in <code>scripts/audit-cache.js</code>.
            </p>
          )}
          {audit && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Clean"        value={audit.counts.clean.toLocaleString()} accent="text-green-600 dark:text-green-400" sub={`of ${audit.scanned} scanned`} />
                <StatCard label="Questionable" value={audit.counts.questionable.toLocaleString()} accent="text-amber-600 dark:text-amber-400" />
                <StatCard label="Bad"          value={audit.counts.bad.toLocaleString()} accent="text-red-600 dark:text-red-400" sub="recommend flagging" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Issue breakdown
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(audit.issue_counts || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const isBad = (audit.bad_set || []).includes(type);
                      return (
                        <div
                          key={type}
                          title={audit.issue_types?.[type] || ""}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono ${isBad ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}
                        >
                          {count}× {type}
                        </div>
                      );
                    })}
                </div>
              </div>

              {audit.bad.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Bad questions ({audit.bad.length})
                  </p>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">ID</TableHead>
                          <TableHead>Topic</TableHead>
                          <TableHead className="w-24">Section</TableHead>
                          <TableHead className="w-20">Diff</TableHead>
                          <TableHead>Issues</TableHead>
                          <TableHead className="w-20 text-right">Open</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {audit.bad.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs text-slate-500">{row.id}</TableCell>
                            <TableCell className="text-sm">{row.topic || "—"}</TableCell>
                            <TableCell className="text-xs text-slate-500">{row.section || "—"}</TableCell>
                            <TableCell className="text-xs capitalize">{row.difficulty || "—"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.issues.map((iss, i) => (
                                  <Badge key={i} className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" title={iss.sample}>
                                    {iss.type}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/admin/content/${row.id}`}
                                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                view →
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
