"use client";

export function Table({ className = "", children, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full min-w-[760px] text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = "", children, ...props }) {
  return (
    <thead className={`border-b border-slate-200 dark:border-slate-800 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = "", children, ...props }) {
  return (
    <tbody className={`divide-y divide-slate-200 dark:divide-slate-800 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = "", children, ...props }) {
  return (
    <tr
      className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = "", children, ...props }) {
  return (
    <th
      className={`h-9 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = "", children, ...props }) {
  return (
    <td className={`px-3 py-2.5 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}
