"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/admin/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/Table";
import Input from "@/components/admin/ui/Input";
import Select from "@/components/admin/ui/Select";
import Badge from "@/components/admin/ui/Badge";
import DataPagination from "@/components/admin/DataPagination";

const SECTION_OPTIONS = [
  { value: "all",          label: "All sections" },
  { value: "chem_phys",    label: "Chem/Phys" },
  { value: "cars",         label: "CARS" },
  { value: "bio_biochem",  label: "Bio/Biochem" },
  { value: "psych_soc",    label: "Psych/Soc" },
];

const DIFFICULTY_OPTIONS = [
  { value: "all",   label: "All difficulties" },
  { value: "easy",  label: "Easy" },
  { value: "medium",label: "Medium" },
  { value: "hard",  label: "Hard" },
];

const FLAGGED_OPTIONS = [
  { value: "all",   label: "All (flagged + not)" },
  { value: "false", label: "Active only" },
  { value: "true",  label: "Flagged only" },
];

export default function AdminContentPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [section, setSection] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [flagged, setFlagged] = useState("all");
  const [page, setPage] = useState(1);

  // Debounce the search input so we don't fire a query on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, section, difficulty, flagged]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (section !== "all") params.set("section", section);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (flagged !== "all") params.set("flagged", flagged);
    apiFetch(`/admin/cache/questions?${params.toString()}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch, section, difficulty, flagged, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content browser</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search and inspect cached questions. Click a row to open the full preview.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search stem text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={section}    onChange={setSection}    options={SECTION_OPTIONS} />
          <Select value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} />
          <Select value={flagged}    onChange={setFlagged}    options={FLAGGED_OPTIONS} />
        </CardContent>
      </Card>

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="text-red-600 dark:text-red-400 text-sm p-4">{error}</div>
          ) : loading && !data ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead className="w-28">Section</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead className="w-20">Diff</TableHead>
                    <TableHead className="w-20 text-center">Served</TableHead>
                    <TableHead className="w-24">Verify</TableHead>
                    <TableHead className="w-20 text-center">Flag</TableHead>
                    <TableHead>Stem preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data || data.questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                        {loading ? "Loading…" : "No questions match these filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.questions.map((q) => (
                      <TableRow key={q.id} className="cursor-pointer">
                        <TableCell className="p-0 font-mono text-xs text-slate-500">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5">
                            {q.id}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 truncate" title={q.section}>
                            {q.section || "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5 text-sm truncate" title={q.topic}>
                            {q.topic || "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-xs capitalize">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5">{q.difficulty || "—"}</Link>
                        </TableCell>
                        <TableCell className="p-0 text-center text-xs tabular-nums">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5">{q.times_served || 0}</Link>
                        </TableCell>
                        <TableCell className="p-0 text-xs">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5">
                            <span className={
                              q.verification === 'corrected' ? 'text-amber-600 dark:text-amber-400' :
                              q.verification === 'pass2_invalid' ? 'text-red-600 dark:text-red-400' :
                              q.verification === 'confirmed' ? 'text-green-600 dark:text-green-400' :
                              'text-slate-400'
                            }>
                              {q.verification || "none"}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-center">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5">
                            {q.flagged ? <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[10px]">FLAG</Badge> : <span className="text-slate-300 dark:text-slate-700">—</span>}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0 text-xs text-slate-500 dark:text-slate-400">
                          <Link href={`/admin/content/${q.id}`} className="block px-3 py-2.5 max-w-[480px] truncate" title={q.stem_preview}>
                            {q.stem_preview || "—"}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="px-4 pb-3">
                <DataPagination
                  page={data?.page || 1}
                  pages={data?.pages || 1}
                  total={data?.total || 0}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
