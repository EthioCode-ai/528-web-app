"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import StatCard from "@/components/admin/StatCard";
import TierBadge from "@/components/admin/TierBadge";
import ComingSoonCard from "@/components/admin/ComingSoonCard";

const TIER_COLORS = {
  scholar: "#3b82f6",
  elite:   "#d97706",
  vip:     "#9333ea",
};
// Per-plan colors — within each tier we shade darker for longer commitments.
function planColor(plan, tier) {
  const base = TIER_COLORS[tier] || "#94a3b8";
  if (!plan || plan === "unknown") return "#64748b";
  if (plan.includes("annual")) return base;
  if (plan.includes("6mo") || plan.includes("six")) return shade(base, 0.7);
  return shade(base, 0.5);
}
function shade(hex, factor) {
  // Lightens a hex color by factor (0..1). Quick + dirty mix toward white.
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const mix = (c) => Math.round(c + (255 - c) * (1 - factor));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/admin/stats/subscriptions")
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

  const subs = data.active_subscriptions || [];
  const tierCounts = subs.reduce((acc, s) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {});

  const planData = (data.by_plan || []).map((p) => ({
    name: prettyPlan(p.plan, p.tier),
    rawPlan: p.plan,
    tier: p.tier,
    count: p.count,
    fill: planColor(p.plan, p.tier),
  }));

  const f = data.funnel || {};
  const funnelSteps = [
    { label: "Signups", value: f.signups || 0 },
    { label: "Verified", value: f.verified || 0, of: f.signups },
    { label: "First diagnostic", value: f.first_diagnostic || 0, of: f.verified },
  ];
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Active paid subscribers, plan mix, and signup → activation funnel.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active subscribers"  value={data.active_subscriptions_count.toLocaleString()} accent="text-purple-600 dark:text-purple-400" />
        <StatCard label="Scholar"             value={(tierCounts.scholar || 0).toLocaleString()} />
        <StatCard label="Elite"               value={(tierCounts.elite   || 0).toLocaleString()} />
        <StatCard label="VIP"                 value={(tierCounts.vip     || 0).toLocaleString()} />
      </div>

      {/* Plan pie + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by plan</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">No paid subscriptions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={(e) => `${e.name} (${e.count})`}
                    labelLine={false}
                  >
                    {planData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                    formatter={(value, name) => [`${value} subscribers`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-slate-700 dark:text-slate-300">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activation funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 py-2">
              {funnelSteps.map((step, i) => {
                const widthPct = (step.value / funnelMax) * 100;
                const conv = step.of ? Math.round((step.value / step.of) * 100) : null;
                return (
                  <div key={i}>
                    <div className="flex justify-between items-baseline text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{step.label}</span>
                      <span className="tabular-nums text-slate-900 dark:text-white">
                        {step.value.toLocaleString()}
                        {conv !== null && (
                          <span className="text-slate-500 dark:text-slate-400 ml-2">({conv}% of prior)</span>
                        )}
                      </span>
                    </div>
                    <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded">
                      <div
                        className="h-full bg-purple-500 dark:bg-purple-600 rounded transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic">
                Subscription + 30/60/90-day retention steps require Stripe data mirroring (deferred).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active subscriptions table */}
      <Card>
        <CardHeader>
          <CardTitle>Active subscriptions ({data.active_subscriptions_count})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="max-w-[220px]">Email</TableHead>
                <TableHead className="w-20">Tier</TableHead>
                <TableHead className="w-32">Plan</TableHead>
                <TableHead className="w-16 text-center">Plat</TableHead>
                <TableHead className="w-24">Start</TableHead>
                <TableHead className="w-24">Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-slate-400">
                    No active paid subscriptions.
                  </TableCell>
                </TableRow>
              ) : (
                subs.map((s) => {
                  const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || "—";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono text-slate-400 p-0">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5">{s.id}</Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5 truncate" title={name}>{name}</Link>
                      </TableCell>
                      <TableCell className="p-0 text-slate-600 dark:text-slate-300">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5 truncate" title={s.email}>{s.email}</Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5"><TierBadge tier={s.tier} /></Link>
                      </TableCell>
                      <TableCell className="p-0 text-xs text-slate-600 dark:text-slate-300">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5 whitespace-nowrap">
                          {s.plan ? prettyPlan(s.plan, s.tier) : <span className="text-slate-400">—</span>}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0 text-center text-xs text-slate-500 dark:text-slate-400">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5" title={s.last_device || ""}>
                          {platformShort(s.platform)}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0 text-xs text-slate-500">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5 whitespace-nowrap">
                          {new Date(s.signup_date).toLocaleDateString()}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0 text-xs text-slate-300 dark:text-slate-600">
                        <Link href={`/admin/users/${s.id}`} className="block w-full px-3 py-2.5">—</Link>
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
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Revenue & retention</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ComingSoonCard label="MRR (last 6 months)" phase="2.5" />
          <ComingSoonCard label="Revenue by platform" phase="2.5" />
          <ComingSoonCard label="New vs churned / week" phase="2.5" />
          <ComingSoonCard label="30 / 60 / 90-day retention" phase="2.5" />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic">
          Stripe webhook data mirror not yet built. RevenueCat dashboard tracks revenue today.
        </p>
      </div>
    </div>
  );
}

function prettyPlan(plan, tier) {
  if (!plan || plan === "unknown") return tier === "vip" ? "Comp / VIP" : "Unknown";
  return plan
    .replace(/^scholar_/, "Scholar ")
    .replace(/^elite_/, "Elite ")
    .replace(/monthly/i, "Monthly")
    .replace(/annual/i, "Annual")
    .replace(/6mo|six_month|sixmonth/i, "6-Month");
}

function platformShort(p) {
  if (p === "ios") return "📱 iOS";
  if (p === "android") return "📱 And";
  if (p === "web") return "💻 Web";
  return "—";
}
