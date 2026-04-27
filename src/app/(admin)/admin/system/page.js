"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import StatCard from "@/components/admin/StatCard";
import ComingSoonCard from "@/components/admin/ComingSoonCard";
import Badge from "@/components/admin/ui/Badge";

const ACTION_LABEL = {
  tier_change:     "Tier change",
  reset_progress:  "Reset progress",
  delete_user:     "Delete user",
  cache_flag:      "Flag cache row",
  cache_unflag:    "Unflag cache row",
  cache_delete:    "Delete cache row",
};

const ACTION_COLOR = {
  tier_change:     "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  reset_progress:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  delete_user:     "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  cache_flag:      "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  cache_unflag:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  cache_delete:    "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

function formatUptime(seconds) {
  if (!seconds || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminSystemPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/stats/system")
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Database health, table sizes, and recent admin actions.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Database size"
          value={data.database.size_pretty || "—"}
          accent="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label="Active connections"
          value={String(data.database.connections?.active ?? 0)}
          sub={`${data.database.connections?.total ?? 0} total · ${data.database.connections?.idle ?? 0} idle`}
        />
        <StatCard
          label="Server uptime"
          value={formatUptime(data.uptime_seconds)}
          sub={data.node_version || ""}
        />
        <StatCard
          label="Audit log entries"
          value={String((data.audit_log || []).length)}
          sub="last 100"
        />
      </div>

      {/* Table sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Table sizes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Rows (est.)</TableHead>
                <TableHead className="text-right">Total size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.tables || []).map((t) => (
                <TableRow key={t.table_name}>
                  <TableCell className="font-mono text-xs">{t.table_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{(t.row_count || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500 dark:text-slate-400">{t.size_pretty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle>Admin audit log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">When</TableHead>
                <TableHead className="w-32">Action</TableHead>
                <TableHead className="w-48">Admin</TableHead>
                <TableHead className="w-48">Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.audit_log || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    No admin actions logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.audit_log.map((row) => {
                  const adminName = row.admin_first_name || row.admin_email || "—";
                  const target = row.target_email || (row.details && row.details.email) || (row.target_user_id ? `user #${row.target_user_id}` : "—");
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${ACTION_COLOR[row.action] || ACTION_COLOR.cache_unflag}`}>
                          {ACTION_LABEL[row.action] || row.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-200 truncate" title={row.admin_email || ""}>
                        {adminName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-200 truncate" title={target}>
                        {target}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {row.details ? JSON.stringify(row.details) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Placeholders */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Not yet instrumented</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ComingSoonCard label="Memory usage (MB)" phase="4" />
          <ComingSoonCard label="CPU %" phase="4" />
          <ComingSoonCard label="Error rate (last hour)" phase="4" />
          <ComingSoonCard label="OpenAI 429s today" phase="4" />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic">
          Process metrics require Sentry or the Render API. Render web shell tracks memory/CPU today.
        </p>
      </div>
    </div>
  );
}
