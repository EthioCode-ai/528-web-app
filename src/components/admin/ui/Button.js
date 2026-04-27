"use client";

// Minimal button — no Radix, no shadcn, no class-variance-authority.
// Variants chosen via simple object lookup. Pure Tailwind classes only.
const VARIANTS = {
  default:
    "bg-purple-600 text-white hover:bg-purple-700 disabled:hover:bg-purple-600",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600",
  outline:
    "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
};

const SIZES = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-10 px-6 text-base",
};

export default function Button({
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  ...props
}) {
  const variantClasses = VARIANTS[variant] || VARIANTS.default;
  const sizeClasses = SIZES[size] || SIZES.default;
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    />
  );
}
