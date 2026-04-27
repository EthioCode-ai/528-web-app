"use client";

const VARIANTS = {
  default: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  outline:
    "bg-transparent border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300",
};

export default function Badge({ variant = "default", className = "", children, ...props }) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${v} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
