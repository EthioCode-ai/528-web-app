"use client";

import { useEffect, useId, useRef, useState } from "react";

// Renders a biochemistry pathway diagram from Mermaid syntax.
//
// Defensive rules (from KaTeX regression lesson):
//   1. Dynamic import — mermaid is browser-only and ~11MB. Imported
//      inside useEffect so SSR never touches it and the bundle is
//      code-split (only loaded when a pathway visual actually renders).
//   2. try/catch around the async render call — bad syntax sets local
//      error state, never throws into the React tree.
//   3. Graceful fallback — on error, shows the raw Mermaid syntax in
//      a pre block so the user can at least read the pathway structure.
//   4. securityLevel: 'strict' — prevents XSS from AI-generated node
//      labels. Mermaid sanitizes all text when strict is on.

export default function QuestionPathway({ syntax, title }) {
  const containerRef = useRef(null);
  const reactId = useId();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!syntax || typeof syntax !== "string" || syntax.length > 5000) {
      setError("Invalid pathway data");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          logLevel: "error",
          flowchart: { useMaxWidth: true, htmlLabels: true },
        });

        // mermaid.render needs a unique DOM id — useId returns ":rN:"
        // which contains colons that are invalid in HTML element IDs.
        const cleanId = `mermaid-${reactId.replace(/:/g, "")}`;
        const { svg } = await mermaid.render(cleanId, syntax);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not render pathway");
          setLoading(false);
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [syntax, reactId]);

  if (!syntax) return null;

  return (
    <div className="my-3 rounded-xl border border-slate-200 overflow-hidden bg-white">
      {title && (
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
        </div>
      )}
      {error ? (
        <div className="px-4 py-3">
          <p className="text-xs text-slate-400 italic mb-2">{error}</p>
          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
            {syntax}
          </pre>
        </div>
      ) : (
        <div className="flex justify-center p-4 min-h-[100px] items-center">
          {loading && (
            <div className="w-5 h-5 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
          )}
          <div
            ref={containerRef}
            className={`${loading ? "hidden" : "w-full overflow-x-auto"}`}
          />
        </div>
      )}
    </div>
  );
}
