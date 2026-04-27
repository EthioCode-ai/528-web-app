"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// Modal dialog — no Radix, no focus trap. Closes on overlay click and
// Escape key. Body scroll locked while open.
//
// Usage:
//   <Dialog open={open} onClose={onClose}>
//     <DialogHeader title="…" description="…" />
//     <div>body</div>
//     <DialogFooter>buttons</DialogFooter>
//   </Dialog>
export default function Dialog({ open, onClose, children, className = "" }) {
  useEffect(() => {
    if (!open) return;
    function onEsc(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-700 dark:bg-slate-900 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ title, description }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
  );
}

export function DialogFooter({ children, className = "" }) {
  return (
    <div className={`mt-4 flex items-center justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
}
