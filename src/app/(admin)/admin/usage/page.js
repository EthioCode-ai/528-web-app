"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import ComingSoonCard from "@/components/admin/ComingSoonCard";
import PeakHoursHeatmap from "@/components/admin/PeakHoursHeatmap";

const SECTION_COLORS = {
  chem_phys:   "#3b82f6",
  cars:        "#22c55e",
  bio_biochem: "#9333ea",
  psych_soc:   "#f59e0b",
};

const TIER_COLORS = {
  free:    "#94a3b8",
  scholar: "#3b82f6",
  elite:   "#d97706",
  vip:     "#9333ea",
};

const FEATURE_LABELS = {
  diagnostic:           "Diagnostic",
  drill:                "Section drill",
  tutor:                "Socratic tutor",
  flashcards_created:   "Flashcards created",
  flashcards_reviewed:  "Flashcards reviewed",
  wrong_answers:        "Wrong-answer logs",
  study_group:          "Study group",
};

export default function AdminUsagePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/stats/usage")
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

  const sectionData = (data.by_section || []).map((s) => ({
    section: s.section,
    code: s.code,
    count: s.count,
    fill: SECTION_COLORS[s.code] || "#94a3b8",
  }));

  const featureData = (data.features || []).map((f) => ({
    feature: FEATURE_LABELS[f.feature] || f.feature,
    rawFeature: f.feature,
    total_events: f.total_events,
    unique_users: f.unique_users,
  }));

  const tierData = (data.usage_by_tier || []).map((t) => {
    const avgPerActiveDay =
      t.active_users > 0 ? Math.round((t.total_questions / t.active_users / 30) * 10) / 10 : 0;
    return { ...t, avg_per_active_day: avgPerActiveDay, fill: TIER_COLORS[t.tier] || "#94a3b8" };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Question volume, feature adoption, and engagement by tier (last 30 days).
        </p>
      </div>

      {/* Daily volume — full width */}
      <Card>
        <CardHeader>
          <CardTitle>Daily question volume — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {data.daily_volume.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">No questions answered in the last 30 days.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.daily_volume} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  stroke="rgba(148,163,184,0.4)"
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                <ReTooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-slate-700 dark:text-slate-300">{v}</span>} />
                <Line type="monotone" dataKey="diagnostic" name="Diagnostic" stroke="#9333ea" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="drill"      name="Section drill" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Section + Tier — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Questions by section — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {sectionData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sectionData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis dataKey="section" tick={{ fontSize: 11, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                  <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                  <ReTooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                    formatter={(value) => [`${value.toLocaleString()} answered`, "Questions"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement by tier — last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Total users</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Questions</TableHead>
                  <TableHead className="text-right" title="Avg questions per active user per day">Avg/day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierData.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-16 text-center text-slate-400">No data.</TableCell></TableRow>
                ) : (
                  tierData.map((t) => (
                    <TableRow key={t.tier}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: t.fill }} />
                          <span className="font-semibold uppercase text-xs tracking-wider">{t.tier}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.total_users.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.active_users.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.total_questions.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{t.avg_per_active_day}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Feature usage horizontal bar */}
      <Card>
        <CardHeader>
          <CardTitle>Feature usage — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {featureData.length === 0 ? (
            <p className="text-sm text-slate-400 py-12 text-center">No feature activity yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, featureData.length * 36)}>
              <BarChart
                layout="vertical"
                data={featureData}
                margin={{ top: 8, right: 16, bottom: 4, left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  stroke="rgba(148,163,184,0.4)"
                  width={140}
                />
                <ReTooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                  formatter={(value, name, props) =>
                    name === "total_events"
                      ? [`${value.toLocaleString()} events · ${props.payload.unique_users} unique users`, props.payload.feature]
                      : [value, name]
                  }
                />
                <Bar dataKey="total_events" fill="#9333ea" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Peak hours heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Peak hours — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <PeakHoursHeatmap data={data.peak_hours || []} />
        </CardContent>
      </Card>

      {/* Placeholders for things we don't track yet */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Not yet instrumented</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ComingSoonCard label="Scanner usage" phase="2.5" />
          <ComingSoonCard label="Periodic table opens" phase="2.5" />
          <ComingSoonCard label="Free-tier limit hits" phase="2.5" />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic">
          PostHog tracks these on web today. Mirroring into the admin dashboard requires either a
          PostHog API integration or a small server-side event-logging table — deferred.
        </p>
      </div>
    </div>
  );
}
