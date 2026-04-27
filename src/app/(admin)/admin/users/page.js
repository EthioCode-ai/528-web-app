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
  // Sort state — default mirrors the previous server-side ORDER BY
  // (id desc = newest first). Click handler below toggles per spec:
  // first click on a column → asc; same column second click → desc.
  const [sortKey, setSortKey] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  function handleSort(key) {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setPage(1);
  }

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
    params.set("sort", sortKey);
    params.set("order", sortOrder);

    apiFetch(`/admin/users?${params.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message || "Failed to load users"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, tier, activity, page, sortKey, sortOrder]);

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
                <SortableHead className="w-12" k="id"          sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}>ID</SortableHead>
                <SortableHead k="name"                          sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}>Name</SortableHead>
                <SortableHead className="max-w-[220px]" k="email" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}>Email</SortableHead>
                <SortableHead className="w-20" k="tier"         sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}>Tier</SortableHead>
                <TableHead className="text-center w-12" title="Platform">Plat</TableHead>
                <SortableHead className="text-right w-16" k="qs" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} align="right">Qs</SortableHead>
                <SortableHead className="text-right w-14" k="acc" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} align="right">Acc</SortableHead>
                <SortableHead className="w-24" k="signed_up"    sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}>Signed up</SortableHead>
                <SortableHead className="w-24" k="last_active"  sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort}>Last active</SortableHead>
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
                      <TableCell className="p-0">
                        <Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5 truncate max-w-[180px]" title={name}>{name}</Link>
                      </TableCell>
                      <TableCell className="p-0 text-slate-600 dark:text-slate-300">
                        <Link href={`/admin/users/${u.id}`} className="flex items-center gap-1.5 w-full px-3 py-2.5 truncate" title={u.email}>
                          <span className="truncate max-w-[180px]">{u.email}</span>
                          {u.email_verified ? (
                            <span title="Verified" className="text-emerald-500 flex-shrink-0">✓</span>
                          ) : (
                            <span title="Unverified" className="text-amber-500 flex-shrink-0">·</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5"><TierBadge tier={u.subscription_tier} /></Link></TableCell>
                      <TableCell className="p-0 text-center">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block w-full px-3 py-2.5"
                          title={u.last_device || "Unknown — never logged in since device tracking was added"}
                        >
                          <PlatformIcon platform={u.last_platform} />
                        </Link>
                      </TableCell>
                      <TableCell className="p-0 text-right tabular-nums"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{(u.total_questions_answered || 0).toLocaleString()}</Link></TableCell>
                      <TableCell className="p-0 text-right tabular-nums"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5">{u.total_questions_answered ? `${accuracy}%` : "—"}</Link></TableCell>
                      <TableCell className="p-0 text-xs text-slate-500"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5 whitespace-nowrap">{formatRelative(u.signup_date)}</Link></TableCell>
                      <TableCell className="p-0 text-xs text-slate-500"><Link href={`/admin/users/${u.id}`} className="block w-full px-3 py-2.5 whitespace-nowrap">{formatRelative(u.last_active)}</Link></TableCell>
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

// Sortable column header. Renders the existing TableHead with click
// behavior + arrow indicator. Clicking a different column starts asc
// (per spec: "Click any column header to sort ascending"). Clicking
// the active column toggles between asc and desc.
function SortableHead({ k, sortKey, sortOrder, onSort, children, align, className = "" }) {
  const active = sortKey === k;
  const arrow = active ? (sortOrder === "asc" ? "▲" : "▼") : "";
  return (
    <TableHead
      onClick={() => onSort(k)}
      className={`cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${
        active ? "text-purple-600 dark:text-purple-400" : ""
      } ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "w-full justify-end" : ""}`}>
        {children}
        {arrow && <span className="text-[10px] leading-none">{arrow}</span>}
      </span>
    </TableHead>
  );
}

// Inline icon for the Platform column. Hover shows the full device
// string via the parent <Link>'s title attribute.
function PlatformIcon({ platform }) {
  const p = (platform || "unknown").toLowerCase();
  const className = "inline-block w-4 h-4 align-middle";
  if (p === "ios" || p === "android") {
    return (
      <svg className={`${className} text-purple-600 dark:text-purple-400`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
    );
  }
  if (p === "web") {
    return (
      <svg className={`${className} text-blue-600 dark:text-blue-400`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="16" x2="12" y2="20" />
      </svg>
    );
  }
  return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>;
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
