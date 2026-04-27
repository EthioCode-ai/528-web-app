"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import Button from "@/components/admin/ui/Button";
import Select from "@/components/admin/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/Tabs";
import TierBadge from "@/components/admin/TierBadge";
import StatCard from "@/components/admin/StatCard";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "scholar", label: "Scholar" },
  { value: "elite", label: "Elite" },
  { value: "vip", label: "VIP" },
];

export default function AdminUserDetailPage({ params }) {
  // Next.js 16: route params are a Promise — unwrap with React.use().
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [pendingTier, setPendingTier] = useState(null);
  const [tierBusy, setTierBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function load() {
    apiFetch(`/admin/users/${id}`)
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load user"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-sm p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
        {error}
        <div className="mt-2">
          <Link href="/admin/users" className="underline">← Back to users</Link>
        </div>
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

  const { user, mastery, daily_questions, counts } = data;
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "—";

  async function applyTier() {
    if (!pendingTier || pendingTier === user.subscription_tier) return;
    setTierBusy(true);
    try {
      await apiFetch(`/admin/users/${id}/tier`, {
        method: "PUT",
        body: JSON.stringify({ tier: pendingTier }),
      });
      setPendingTier(null);
      load();
    } catch (err) {
      alert(err.message || "Failed to change tier");
    } finally {
      setTierBusy(false);
    }
  }

  async function doReset() {
    await apiFetch(`/admin/users/${id}/reset`, {
      method: "POST",
      body: JSON.stringify({ confirm: "RESET" }),
    });
    load();
  }

  async function doDelete() {
    await apiFetch(`/admin/users/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: `DELETE ${user.email}` }),
    });
    router.push("/admin/users");
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        <Link href="/admin/users" className="hover:underline">← Back to users</Link>
      </div>

      <Card>
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {(name[0] || user.email[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">{name}</h1>
              <TierBadge tier={user.subscription_tier} />
              {user.email_verified ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">verified</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">unverified</span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
            <p className="text-xs text-slate-400 mt-2">
              Signed up {new Date(user.created_at).toLocaleDateString()} · Last active {new Date(user.updated_at).toLocaleString()}
              {user.target_score ? ` · Target ${user.target_score}` : ""}
              {user.test_date ? ` · Test ${new Date(user.test_date).toLocaleDateString()}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Diagnostics started" value={counts.attempts} />
            <StatCard label="Completed" value={counts.attempts_completed} />
            <StatCard label="In progress" value={counts.attempts_in_progress} />
            <StatCard label="Wrong answers" value={counts.wrong} />
            <StatCard label="Flashcards" value={counts.flashcards} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Daily questions — last 30 days</CardTitle>
            </CardHeader>
            <CardContent>
              {daily_questions.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No activity in the last 30 days.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={daily_questions} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
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
                      formatter={(value) => [`${value} questions`, "Answered"]}
                    />
                    <Line type="monotone" dataKey="questions" stroke="#9333ea" strokeWidth={2} dot={{ r: 3, fill: "#9333ea" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mastery" className="pt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Mastery</TableHead>
                    <TableHead className="text-right">Attempted</TableHead>
                    <TableHead className="text-right">Correct</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mastery.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-20 text-center text-slate-400">No mastery data yet.</TableCell></TableRow>
                  ) : (
                    mastery.map((m, i) => {
                      const score = Math.round(m.mastery_score);
                      const color =
                        score < 50 ? "text-red-600 dark:text-red-400" :
                        score < 80 ? "text-amber-600 dark:text-amber-400" :
                                     "text-emerald-600 dark:text-emerald-400";
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{m.topic}</TableCell>
                          <TableCell className="text-slate-500 text-xs">{m.section}</TableCell>
                          <TableCell className={`text-right tabular-nums font-semibold ${color}`}>{score}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.questions_attempted}</TableCell>
                          <TableCell className="text-right tabular-nums">{m.questions_correct}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs text-slate-500">×{Number(m.aamc_weight).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="pt-3">
          <Card>
            <CardContent className="p-5 space-y-3">
              <Field label="Current tier"><TierBadge tier={user.subscription_tier} /></Field>
              <Field label="Email verified">{user.email_verified ? "Yes" : "No"}</Field>
              <Field label="Stripe customer ID">
                {user.stripe_customer_id ? (
                  <code className="text-xs">{user.stripe_customer_id}</code>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                )}
              </Field>
              <Field label="Hours / week">{user.hours_per_week ?? "—"}</Field>
              <Field label="Study streak">{user.study_streak ?? 0} days (longest {user.longest_streak ?? 0})</Field>
              <p className="text-xs text-slate-400 pt-2">More subscription detail (plan, renewal date, MRR contribution) ships in Phase 2.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="pt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Change tier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Promote or demote this account. Logged to admin_audit_log.
                </p>
                <Select
                  value={pendingTier ?? user.subscription_tier}
                  onChange={setPendingTier}
                  options={TIER_OPTIONS}
                />
                <Button
                  className="w-full"
                  disabled={!pendingTier || pendingTier === user.subscription_tier || tierBusy}
                  onClick={applyTier}
                >
                  {tierBusy ? "Working…" : "Apply"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600 dark:text-amber-400">Reset progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Wipes diagnostics, mastery, wrong answers, and flashcards. Account stays.
                </p>
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => setResetOpen(true)}>
                  Reset progress…
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Delete account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Permanent. Cascades through all their data.
                </p>
                <Button variant="destructive" className="w-full" onClick={() => setDeleteOpen(true)}>
                  Delete account…
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all study data?"
        description={`This wipes diagnostics, answers, mastery, wrong answers, and flashcards for ${user.email}. The account itself stays.`}
        confirmText="RESET"
        actionLabel="Reset progress"
        actionVariant="default"
        onConfirm={doReset}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this account?"
        description={`This permanently removes ${user.email} and all their data. Cannot be undone.`}
        confirmText={`DELETE ${user.email}`}
        actionLabel="Delete account"
        actionVariant="destructive"
        onConfirm={doDelete}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <div className="text-sm text-slate-800 dark:text-slate-200">{children}</div>
    </div>
  );
}
