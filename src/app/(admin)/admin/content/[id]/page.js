"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/Card";
import Button from "@/components/admin/ui/Button";
import Badge from "@/components/admin/ui/Badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Markdown from "@/components/Markdown";

export default function AdminContentDetailPage({ params }) {
  // Next.js 16: params is a Promise that must be unwrapped with React's `use`.
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/admin/cache/questions/${id}`)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message || "Failed to load"));
    return () => { cancelled = true; };
  }, [id]);

  async function toggleFlag() {
    if (!data) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/cache/${data.id}/flag`, {
        method: "POST",
        body: JSON.stringify({ flagged: !data.flagged }),
      });
      setData((prev) => prev && { ...prev, flagged: r.flagged });
    } catch (err) {
      setError(err.message || "Flag toggle failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow() {
    await apiFetch(`/admin/cache/${data.id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    router.push("/admin/content");
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Link href="/admin/content" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">← Back to browser</Link>
        <div className="text-red-600 dark:text-red-400 text-sm p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
          {error}
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

  const q = data.question_json || {};
  const choices = q.choices || {};
  const correct = q.correct;
  const verification = typeof q._verification === 'string' ? q._verification : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/admin/content" className="text-sm text-purple-600 dark:text-purple-400 hover:underline">← Back to browser</Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleFlag} disabled={busy}>
            {busy ? "Working…" : data.flagged ? "Unflag (return to rotation)" : "Flag (exclude from rotation)"}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={busy}>
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                <span className="font-mono text-slate-400 mr-2">#{data.id}</span>
                {data.topic || "—"}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {data.section || "—"} · {data.difficulty || "—"} · served {data.times_served || 0}× · created {new Date(data.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {data.flagged && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">FLAGGED</Badge>
              )}
              {verification && (
                <Badge className={
                  verification === 'corrected' ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                  verification === 'pass2_invalid' ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" :
                  verification === 'confirmed' ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" :
                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }>
                  {verification}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stem */}
      <Card>
        <CardHeader>
          <CardTitle>Stem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[15px] text-slate-800 dark:text-slate-100">
            <Markdown>{q.stem || "(empty)"}</Markdown>
          </div>
        </CardContent>
      </Card>

      {/* Choices */}
      <Card>
        <CardHeader>
          <CardTitle>Choices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.keys(choices).length === 0 ? (
            <p className="text-sm text-slate-400">No choices.</p>
          ) : (
            Object.entries(choices).map(([letter, text]) => {
              const isCorrect = letter === correct;
              return (
                <div
                  key={letter}
                  className={`flex gap-3 p-3 rounded-md border ${isCorrect ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <span className={`font-bold text-sm flex-shrink-0 ${isCorrect ? "text-green-700 dark:text-green-300" : "text-slate-500"}`}>
                    {letter}
                    {isCorrect && " ✓"}
                  </span>
                  <div className="text-sm flex-1 text-slate-800 dark:text-slate-100">
                    <Markdown>{typeof text === "string" ? text : String(text)}</Markdown>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Explanation */}
      {q.explanation && (
        <Card>
          <CardHeader>
            <CardTitle>Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <Markdown>{q.explanation}</Markdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON for debugging */}
      <Card>
        <CardHeader>
          <CardTitle>Raw question_json</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-[11px] font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
            {JSON.stringify(data.question_json, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete cache row #${data.id}?`}
        description="Removes this question from the cache permanently. Existing answer history is preserved (diagnostic_answers snapshots question_json at answer time)."
        confirmText="DELETE"
        actionLabel="Delete cache row"
        actionVariant="destructive"
        onConfirm={deleteRow}
      />
    </div>
  );
}
