"use client";

import { useEffect, useRef, useState } from "react";

// Renders a 2D chemical structure from a SMILES string using SmilesDrawer.
//
// Defensive rules (from KaTeX regression lesson):
//   1. Dynamic import — smiles-drawer is browser-only. Imported inside
//      useEffect so SSR never touches it and the bundle is code-split.
//   2. try/catch around every parse + render call — bad SMILES strings
//      set local error state, never throw into the React tree.
//   3. Graceful fallback — on error, shows the raw SMILES string in a
//      code tag so the user can at least read the notation.

export default function QuestionMolecule({ smiles, title }) {
  const svgRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!smiles || typeof smiles !== "string" || smiles.length > 500) {
      setError("Invalid SMILES input");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function render() {
      try {
        const mod = await import("smiles-drawer");
        const SmilesDrawer = mod.default || mod;
        if (cancelled || !svgRef.current) return;

        const drawer = new SmilesDrawer.SvgDrawer({
          width: 300,
          height: 200,
          bondThickness: 1.5,
          compactDrawing: false,
        });

        SmilesDrawer.parse(
          smiles,
          (tree) => {
            if (cancelled || !svgRef.current) return;
            try {
              drawer.draw(tree, svgRef.current, "light", false);
              setLoading(false);
            } catch {
              setError("Could not draw structure");
              setLoading(false);
            }
          },
          () => {
            if (!cancelled) {
              setError("Could not parse SMILES");
              setLoading(false);
            }
          }
        );
      } catch {
        if (!cancelled) {
          setError("Structure renderer unavailable");
          setLoading(false);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [smiles]);

  if (!smiles) return null;

  return (
    <div className="my-3 rounded-xl border border-slate-200 overflow-hidden bg-white">
      {title && (
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
        </div>
      )}
      {error ? (
        <div className="px-4 py-3 text-xs text-slate-400 italic">
          {error} —{" "}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 not-italic">
            {smiles}
          </code>
        </div>
      ) : (
        <div className="flex justify-center p-4 min-h-[100px] items-center">
          {loading && (
            <div className="w-5 h-5 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
          )}
          <svg
            ref={svgRef}
            className={loading ? "hidden" : "max-w-full"}
            width="300"
            height="200"
          />
        </div>
      )}
    </div>
  );
}
