"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function preprocess(text) {
  if (typeof text !== "string") return text;
  // Break "Memory Trick:" onto its own paragraph and bold the prefix
  return text.replace(/\s*(💡\s*)?Memory Trick:\s*/gi, "\n\n💡 **Memory Trick:** ");
}

export default function Markdown({ children, className = "" }) {
  const content = preprocess(children);
  return (
    <div className={`prose-mcat ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-current">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.9em] font-mono">
              {children}
            </code>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1.5">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-200 pl-3 my-3 italic text-slate-600">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
