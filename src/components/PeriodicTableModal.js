"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ELEMENTS,
  CATEGORIES,
  GROUP_LABELS_TOP,
  GROUP_LABELS_MID,
  gradientFor,
} from "@/data/periodicTable";

// Detail popover shown on cell click.
function ElementDetail({ element, onClose }) {
  if (!element) return null;
  const cat = CATEGORIES[element.cat] || CATEGORIES.unknown;
  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-center"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div
            className="relative w-[104px] h-[104px] rounded-xl flex flex-col justify-between p-2 text-white overflow-hidden shrink-0"
            style={{
              background: gradientFor(element.cat),
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 20px rgba(15,23,42,0.25)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18), transparent)" }}
            />
            <span className="relative text-[11px] font-semibold opacity-90">{element.n}</span>
            <span className="relative text-[34px] font-extrabold leading-none text-center flex-1 flex items-center justify-center">
              {element.s}
            </span>
            <span className="relative text-[10px] opacity-80 text-center">{element.m}</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[22px] font-bold text-slate-900 mb-1.5 leading-tight">{element.name}</p>
            <span
              className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ background: cat.base }}
            >
              {cat.label}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <Row k="Atomic number" v={element.n} />
          <Row k="Atomic mass" v={`${element.m} u`} />
          <Row k="Electron configuration" v={element.econ} mono />
          <Row k="Category" v={cat.label} />
        </div>

        <div className="mt-4 px-3 py-2.5 bg-[#1a56db]/8 border-l-[3px] border-[#1a56db] rounded-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1a56db] mb-1">MCAT relevance</p>
          <p className="text-[13px] text-slate-800 leading-relaxed">{element.mcat}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex justify-between items-baseline gap-3 text-[13px]">
      <span className="text-slate-500">{k}</span>
      <span className={`text-slate-800 tabular-nums ${mono ? "font-mono text-[12px]" : ""}`}>
        {v}
      </span>
    </div>
  );
}

export default function PeriodicTableModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") { if (selected) setSelected(null); else onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, selected]);

  // Reset filters whenever the modal opens fresh
  useEffect(() => {
    if (!open) { setQuery(""); setActiveCat(null); setSelected(null); }
  }, [open]);

  const q = query.trim().toLowerCase();
  const dimSet = useMemo(() => {
    if (!q && !activeCat) return null;
    const s = new Set();
    for (const el of ELEMENTS) {
      const matchesQuery = !q
        || String(el.n).includes(q)
        || el.s.toLowerCase().includes(q)
        || el.name.toLowerCase().includes(q);
      const matchesCat = !activeCat || el.cat === activeCat;
      if (!(matchesQuery && matchesCat)) s.add(el.n);
    }
    return s;
  }, [q, activeCat]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[1400px] max-h-[96vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "radial-gradient(900px 700px at 8% -10%, #d9d2ff 0%, transparent 55%)," +
            "radial-gradient(900px 700px at 110% 120%, #efd4ff 0%, transparent 55%)," +
            "linear-gradient(180deg, #e9e5ff, #f5f2ff)",
        }}
      >
        {/* Masthead */}
        <header className="grid grid-cols-[80px_1fr_40px] items-center gap-4 px-6 pt-5 pb-1">
          <Image
            src="/neuromart-logo.png"
            alt="Neuromart"
            width={120}
            height={56}
            className="h-14 w-auto object-contain justify-self-start"
            priority
          />
          <div className="text-center">
            <h2 className="text-[26px] font-bold text-[#1e1b4b] tracking-tight leading-none">
              The Periodic Table of Elements{" "}
              <span className="font-normal text-slate-400">v2.0</span>
            </h2>
            <p className="text-[10px] font-medium tracking-[0.14em] text-slate-400 uppercase mt-1.5">
              Powered by Neuromart
            </p>
          </div>
          <button
            onClick={onClose}
            className="justify-self-end w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 cursor-pointer transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Topbar: how-to-read | legend | search */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,1fr)_minmax(420px,2fr)_minmax(220px,1fr)] gap-4 px-6 py-3 items-center">
          <div className="hidden md:grid grid-cols-[auto_62px] items-center gap-4 text-[11px] text-slate-500">
            <div className="text-right grid gap-1.5 font-medium">
              <span>Atomic number <span className="text-slate-400">→</span></span>
              <span>Symbol <span className="text-slate-400">→</span></span>
              <span>Atomic mass <span className="text-slate-400">→</span></span>
              <span>Element name <span className="text-slate-400">→</span></span>
            </div>
            <SampleCell />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const active = activeCat === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCat(active ? null : key)}
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    active
                      ? "bg-indigo-500/15 text-slate-900 font-semibold"
                      : "text-slate-500 hover:bg-indigo-500/8 hover:text-slate-800"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded"
                    style={{
                      background: gradientFor(key),
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  />
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: iron, Fe, 26…"
              className="w-full bg-white/55 border border-indigo-500/25 rounded-lg pl-9 pr-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto px-4 pb-5">
          <div
            className="mx-auto"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(18, minmax(52px, 1fr))",
              gridTemplateRows: "22px repeat(3, 62px) 22px repeat(4, 62px) 20px repeat(2, 62px)",
              gap: 5,
              minWidth: 960,
              maxWidth: 1320,
              padding: 8,
            }}
          >
            {/* Group labels — top row (1, 2, 13-18) */}
            {Object.entries(GROUP_LABELS_TOP).map(([col, [p, s]]) => (
              <GroupLabel key={`t${col}`} col={+col} row={1} primary={p} sub={s} />
            ))}
            {/* Group labels — above period 4 (3-12) */}
            {Object.entries(GROUP_LABELS_MID).map(([col, [p, s]]) => (
              <GroupLabel key={`m${col}`} col={+col} row={5} primary={p} sub={s} />
            ))}

            {ELEMENTS.map((el) => {
              const dim = dimSet?.has(el.n) ?? false;
              // Row mapping:
              //   periods 1-3 → grid rows 2-4
              //   [grid row 5 = transition group labels]
              //   periods 4-7 → grid rows 6-9
              //   [grid row 10 = spacer]
              //   lanth (data row 8) → grid row 11
              //   actin (data row 9) → grid row 12
              let gr;
              if (el.row <= 3) gr = el.row + 1;
              else if (el.row <= 7) gr = el.row + 2;
              else gr = el.row + 3;
              return (
                <button
                  key={el.n}
                  type="button"
                  onClick={() => setSelected(el)}
                  className={`cell-tile relative rounded-md overflow-hidden text-white transition-all duration-150 ${
                    dim ? "opacity-[0.14]" : "hover:-translate-y-0.5 hover:scale-[1.06] hover:z-10"
                  }`}
                  style={{
                    gridColumn: el.col,
                    gridRow: gr,
                    background: gradientFor(el.cat),
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(15,23,42,0.15)",
                    cursor: dim ? "default" : "pointer",
                  }}
                  aria-label={`${el.name} (${el.s})`}
                >
                  <span
                    className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12), transparent)" }}
                  />
                  <div className="relative h-full flex flex-col justify-between px-1 pt-1 pb-1">
                    <span className="text-[9px] font-semibold opacity-95 text-left leading-none">
                      {el.n}
                    </span>
                    <span className="text-[20px] font-extrabold leading-none tracking-tight text-center">
                      {el.s}
                    </span>
                    <div className="text-center leading-none">
                      <div className="text-[8px] font-medium opacity-95 truncate px-0.5">{el.name}</div>
                      <div className="text-[8px] opacity-80 mt-[1px]">{el.m}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ElementDetail element={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function GroupLabel({ col, row, primary, sub }) {
  return (
    <div
      className="text-[10px] font-semibold text-slate-500 text-center self-end pb-0.5 leading-tight"
      style={{ gridColumn: col, gridRow: row }}
    >
      {primary}
      <div className="text-[9px] font-medium text-slate-400">{sub}</div>
    </div>
  );
}

// Small fixed-size sample tile used in the "how to read a cell" callout.
function SampleCell() {
  return (
    <div
      className="relative rounded-md overflow-hidden text-white"
      style={{
        width: 60,
        height: 62,
        background: gradientFor("reactive-nonmetal"),
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 2px rgba(15,23,42,0.12)",
      }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.12), transparent)" }}
      />
      <div className="relative h-full flex flex-col justify-between px-1 py-1">
        <span className="text-[9px] font-semibold opacity-95 text-left leading-none">1</span>
        <span className="text-[18px] font-extrabold leading-none text-center">H</span>
        <div className="text-center leading-none">
          <div className="text-[8px] font-medium opacity-95">Hydrogen</div>
          <div className="text-[8px] opacity-80 mt-[1px]">1.008</div>
        </div>
      </div>
    </div>
  );
}
