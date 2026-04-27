"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/stores/authStore";
import useAdminTheme from "@/stores/adminThemeStore";
import AdminSidebar from "@/components/admin/AdminSidebar";

// Admin route group layout. Fully isolated from the (dashboard) layout —
// shares no styles, no theme store, no providers. The only thing it shares
// with the rest of the app is the auth store (used to identify the user)
// and the API base URL.
//
// Theme: useAdminTheme is admin-only. It never touches document.documentElement
// — instead the wrapper div below adds `className="dark"` when admin theme is
// dark. Tailwind `dark:` utilities scope to that wrapper. The student
// dashboard is unaffected by the admin's theme state and vice versa.
//
// Auth gates:
//   1. authenticated → otherwise /login
//   2. subscription_tier === 'vip' → otherwise /dashboard
export default function AdminLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);

  const dark = useAdminTheme((s) => s.dark);
  const initAdminTheme = useAdminTheme((s) => s.initialize);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    initialize();
    initAdminTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Override the root layout's tab title for the admin tree. Restored
  // on unmount so the student app's title isn't left stale when the
  // user navigates away. Layout is "use client", so metadata export
  // isn't available here — document.title is the App Router escape
  // hatch for client-only title control.
  useEffect(() => {
    const prev = document.title;
    document.title = "528 AI - Admin";
    return () => { document.title = prev; };
  }, []);

  if (!isAuthenticated() || !initialized) {
    return (
      <div className={dark ? "dark" : ""}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (user?.subscription_tier !== "vip") {
    if (typeof window !== "undefined") router.push("/dashboard");
    return (
      <div className={dark ? "dark" : ""}>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm">
          Admin access required. Redirecting…
        </div>
      </div>
    );
  }

  const mainMargin = collapsed ? "ml-[68px]" : "ml-60";

  // Wrapper div applies `dark` class scoped to admin only. Tailwind's
  // `dark:` utilities throughout the admin tree activate from this class.
  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={`${mainMargin} flex-1 min-h-screen transition-all duration-200`}>
          <div className="max-w-7xl mx-auto px-6 py-6 lg:px-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
