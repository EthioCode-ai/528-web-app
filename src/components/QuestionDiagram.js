"use client";

import { useState } from "react";

export default function QuestionDiagram({ url, title }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!url) return null;

  return (
    <div className="my-3 rounded-xl border border-slate-200 overflow-hidden bg-white">
      {title && (
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
        </div>
      )}
      {error ? (
        <div className="h-20 flex items-center justify-center bg-slate-50">
          <p className="text-xs text-slate-400">Diagram unavailable</p>
        </div>
      ) : (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="w-5 h-5 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 ml-2">Loading diagram...</p>
            </div>
          )}
          <img
            src={url}
            alt={title || "Question diagram"}
            className="w-full object-contain max-h-[300px]"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
          />
        </div>
      )}
    </div>
  );
}
