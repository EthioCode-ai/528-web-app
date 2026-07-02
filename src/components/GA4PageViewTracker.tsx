"use client";

// GA4 client-side page-view tracker for Next.js App Router.
//
// Fires page_view on:
//  - initial mount (covers the initial URL — gtag config in layout.tsx
//    has send_page_view: false so this component is the sole source)
//  - every pathname or searchParams change (SPA route changes that
//    the gtag config call alone would miss)
//
// Race-safe against the gtag loader: if the inline gtag init script in
// layout.tsx has not yet run when this effect fires (possible because
// both are strategy="afterInteractive" and their order is not
// guaranteed), we ensure window.dataLayer and window.gtag exist
// ourselves. Both the inline init and gtag.js are idempotent — later
// loads reuse the same objects. The page_view is queued into dataLayer
// and gtag.js consumes it once loaded.
//
// send_to explicitly routes to the GA4 property, not to the Google Ads
// tag also configured in layout.tsx.
//
// Wrapped in Suspense because useSearchParams triggers a client-side
// bailout during static rendering in the App Router. Without Suspense
// the entire subtree would be forced into client-side rendering, which
// harms first-paint on statically-generated routes.

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const GA4_MEASUREMENT_ID = "G-YCEJQLJ7K5";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function GA4PageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as GtagWindow;

    // Ensure dataLayer + gtag shim exist even if the inline init in
    // layout.tsx has not run yet. Both are idempotent — no double-init.
    w.dataLayer = w.dataLayer ?? [];
    if (typeof w.gtag !== "function") {
      w.gtag = function (...args: unknown[]) {
        w.dataLayer!.push(args);
      };
    }

    const search = searchParams?.toString();
    const path = search ? `${pathname}?${search}` : pathname;

    w.gtag("event", "page_view", {
      send_to: GA4_MEASUREMENT_ID,
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GA4PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <GA4PageViewInner />
    </Suspense>
  );
}
