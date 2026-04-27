import AdminShell from "./AdminShell";

// Server layout for the admin route group. Its sole purpose is to
// export the `metadata` block — Next.js App Router requires metadata
// to come from a server component, and the original AdminShell needs
// to be a client component for auth gating + theme state. So we keep
// the client logic in AdminShell and let this thin server wrapper
// own the browser tab title.
//
// The root src/app/layout.tsx exports title "528 AI — MCAT Study
// Engine"; this override wins for any /admin* route via metadata
// merging.
export const metadata = {
  title: "528 AI - Admin",
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
