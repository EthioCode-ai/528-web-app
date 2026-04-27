"use client";

import { useEffect, useState } from "react";
import Dialog, { DialogHeader, DialogFooter } from "@/components/admin/ui/Dialog";
import Button from "@/components/admin/ui/Button";
import Input from "@/components/admin/ui/Input";

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmText,
  actionLabel,
  actionVariant = "destructive",
  onConfirm,
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  const matches = typed === confirmText;

  async function handleConfirm() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.message || "Action failed");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader title={title} description={description} />
      <div className="space-y-2 py-2">
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Type <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs">{confirmText}</code> to confirm.
        </p>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmText}
          disabled={busy}
          autoFocus
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant={actionVariant} disabled={!matches || busy} onClick={handleConfirm}>
          {busy ? "Working…" : actionLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
