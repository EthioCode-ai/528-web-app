"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import Input from "@/components/admin/ui/Input";
import Select from "@/components/admin/ui/Select";
import { Card, CardContent } from "@/components/admin/ui/Card";
import TierBadge from "@/components/admin/TierBadge";
import DataPagination from "@/components/admin/DataPagination";

const PAGE_SIZE = 50;

const TIER_OPTIONS = [
  { value: "all", label: "All tiers" },
  { value: "free", label: "Free" },
  { value: "scholar", label: "Scholar" },
  { value: "elite", label: "Elite" },
  { value: "vip", label: "VIP" },
];

const ACTIVITY_OPTIONS = [
  { value: "any", label: "Any activity" },
  { value: "today", label: "Active today" },
  { value: "week", label: "Active this week" },
  { value: "month", label: "Active this month" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [activity, setActivity] = useState("any");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tier, activity]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (tier !== "all") params.set("tier", tier);
    if (activity !== "any") params.set("activity", activity);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    apiFetch(`/admin/users?${params.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message || "Failed to load users"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, tier, activity, page]);

  const rows = data?.users || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search, filter, and inspect any registered user.
        </p>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-sm"
          />
          <Select
            value={tier}
            onChange={setTier}
            options={TIER_OPTIONS}
            className="md:w-44"
          />
          <Select
            value={activity}
            onChange={setActivity}
            options={ACTIVITY_OPTIONS}
            className="md:w-44"
          />
        </CardContent>
      </Card>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm p-3 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-center">Verified</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Accuracy</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead>Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-slate-400">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-slate-400">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
                  const accuracy = Math.round((u.accuracy || 0) * 100);
                  return (
                    <TableRow key={u.id} className="cursor-pointer">
                      <TableCell className="text-xs font-mono text-slate-400 p-0">
                        <Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{u.id}</Link>
                      </TableCell>
                      <TableCell className="p-0"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{name}</Link></TableCell>
                      <TableCell className="p-0 text-slate-600 dark:text-slate-300"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{u.email}</Link></TableCell>
                      <TableCell className="p-0"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5"><TierBadge tier={u.subscription_tier} /></Link></TableCell>
                      <TableCell className="p-0 text-center">
                        <Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">
                          {u.email_verified ? "✓" : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0 text-right tabular-nums"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{(u.total_questions_answered || 0).toLocaleString()}</Link></TableCell>
                      <TableCell className="p-0 text-right tabular-nums"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{u.total_questions_answered ? `${accuracy}%` : "—"}</Link></TableCell>
                      <TableCell className="p-0 text-xs text-slate-500"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{formatRelative(u.signup_date)}</Link></TableCell>
                      <TableCell className="p-0 text-xs text-slate-500"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{formatRelative(u.last_active)}</Link></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataPagination
        page={page}
        pages={data?.pages || 1}
        total={data?.total || 0}
        onPageChange={setPage}
      />
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
