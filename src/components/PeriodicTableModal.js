"use client";

import { useEffect } from "react";
import { ELEMENTS, CATEGORIES } from "@/data/periodicTable";

export default function PeriodicTableModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Periodic Table</h2>
            <p className="text-[11px] text-slate-500">Quick reference · 118 elements</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Grid — horizontally scrollable on narrow screens */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="gap-[3px] mx-auto"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(18, minmax(36px, 1fr))",
              gridTemplateRows: "repeat(7, auto) 14px repeat(2, auto)",
              minWidth: "720px",
            }}
          >
            {ELEMENTS.map((el) => {
              const cat = CATEGORIES[el.cat] || CATEGORIES.unknown;
              // Rows 8-9 (lanthanides/actinides) get pushed below the spacer
              // row. Grid row numbers: 1-7 main, 8 is a spacer, 9-10 for
              // lanthanide/actinide series.
              const gridRow = el.row <= 7 ? el.row : el.row + 1;
              return (
                <div
                  key={el.n}
                  className="rounded-sm p-[2px] text-center leading-none flex flex-col justify-between aspect-square"
                  style={{
                    gridColumn: el.col,
                    gridRow,
                    backgroundColor: cat.bg,
                    color: cat.text,
                  }}
                  title={`${el.name} (${el.cat})`}
                >
                  <div className="text-[7px] font-medium opacity-70 text-left pl-[2px]">{el.n}</div>
                  <div className="text-[11px] font-bold">{el.s}</div>
                  <div className="text-[6px] opacity-70">{el.m}</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-5 justify-center">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <div key={key} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: cat.bg }}
                />
                <span className="text-slate-600">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
