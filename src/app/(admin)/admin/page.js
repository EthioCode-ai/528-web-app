"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import StatCard from "@/components/admin/StatCard";
import ComingSoonCard from "@/components/admin/ComingSoonCard";

const TIER_COLORS = {
  free: "#94a3b8",
  scholar: "#3b82f6",
  elite: "#d97706",
  vip: "#9333ea",
};

const PLATFORM_COLORS = {
  ios: "#9333ea",       // purple — matches admin accent
  android: "#22c55e",   // green
  web: "#3b82f6",       // blue
  unknown: "#64748b",   // slate
};

const PLATFORM_LABELS = {
  ios: "iOS",
  android: "Android",
  web: "Web",
  unknown: "Unknown",
};

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [dau, setDau] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch("/admin/stats/overview"),
      apiFetch("/admin/stats/dau?days=30"),
      apiFetch("/admin/stats/questions-today"),
    ])
      .then(([o, d, q]) => {
        if (cancelled) return;
        setOverview(o);
        setDau(d);
        setQuestions(q);
      })
      .catch((err) => !cancelled && setError(err.message || "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-sm p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
        {error}
      </div>
    );
  }

  if (!overview || !dau || !questions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tierData = (overview.tiers || []).map((t) => ({
    tier: t.tier,
    count: t.count,
    fill: TIER_COLORS[t.tier] || "#94a3b8",
  }));
  const platformData = (overview.platforms || []).map((p) => ({
    platform: PLATFORM_LABELS[p.platform] || p.platform,
    rawPlatform: p.platform,
    count: p.count,
    fill: PLATFORM_COLORS[p.platform] || "#64748b",
  }));
  const totalUsers = overview.users.total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time snapshot of users, activity, and system load.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total users" value={totalUsers.toLocaleString()} />
        <StatCard label="Verified" value={overview.users.verified.toLocaleString()} sub={`${pct(overview.users.verified, totalUsers)}%`} />
        <StatCard label="Active today" value={overview.users.active_today.toLocaleString()} sub={`${pct(overview.users.active_today, totalUsers)}%`} />
        <StatCard label="Active week" value={overview.users.active_week.toLocaleString()} sub={`${pct(overview.users.active_week, totalUsers)}%`} />
        <StatCard label="Active month" value={overview.users.active_month.toLocaleString()} sub={`${pct(overview.users.active_month, totalUsers)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tier breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tierData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="tier" tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                <YAxis tick={{ fontSize: 12, fill: "currentColor" }} stroke="rgba(148,163,184,0.4)" />
                <ReTooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                  itemStyle={{ color: "white" }}
                  labelStyle={{ color: "white", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
                  labelFormatter={(label) => label}
                  formatter={(value) => [`${value.toLocaleString()} users (${pct(value, totalUsers)}%)`, "Count"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <StatCard
            label="Active sessions right now"
            value={overview.active_sessions.toLocaleString()}
            sub="In-progress diagnostics (last 24h)"
            accent="text-purple-600 dark:text-purple-400"
          />
          <StatCard
            label="Questions today"
            value={questions.total.toLocaleString()}
            sub={`${questions.cache_hits.toLocaleString()} cache · ${questions.fresh_generations.toLocaleString()} fresh`}
            accent="text-blue-600 dark:text-blue-400"
          />
        </div>
      </div>

      {/* Platform breakdown — pie chart of last_platform across all users */}
      <Card>
        <CardHeader>
          <CardTitle>Platform breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={platformData}
                dataKey="count"
                nameKey="platform"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                label={(entry) => `${entry.platform} ${pct(entry.count, totalUsers)}%`}
                labelLine={false}
              >
                {platformData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <ReTooltip
                contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 8, color: "white" }}
                formatter={(value, name) => [`${value.toLocaleString()} users (${pct(value, totalUsers)}%)`, name]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 12 }}
                formatter={(v) => <span className="text-slate-700 dark:text-slate-300">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          {platformData.every((p) => p.rawPlatform === "unknown") && (
            <p className="text-xs text-slate-400 text-center mt-2">
              All users still show Unknown — platform tracking activates on each user&apos;s next login.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily active users — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dau.series} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
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
                formatter={(value) => [`${value} active users`, "DAU"]}
              />
              <Line type="monotone" dataKey="dau" stroke="#9333ea" strokeWidth={2} dot={{ r: 3, fill: "#9333ea" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">System health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ComingSoonCard label="Errors today" phase={4} />
          <ComingSoonCard label="OpenAI 429 today" phase={4} />
        </div>
      </div>
    </div>
  );
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((1000 * part) / total) / 10;
}
