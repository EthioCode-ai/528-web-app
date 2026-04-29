import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/register", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

// Sentry build-time wrapper. Only uploads source maps if SENTRY_AUTH_TOKEN
// is set; otherwise the app still reports errors, just with minified stack
// traces. Org/project also only matter for source map upload.
//
// Note on source map visibility: Sentry's old hideSourceMaps option was
// removed in v10. Next.js 15+ does not serve .map files in production
// builds by default, so public source maps are not a concern here.
export default withSentryConfig(nextConfig, {
  // Quiet the Sentry CLI output during local dev, keep it loud in CI
  silent: !process.env.CI,

  // Source map upload config — no-op if auth token is missing
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Include extra files for better stack traces
  widenClientFileUpload: true,

  // Tunnel route is deliberately NOT set. Tunneling Sentry events through
  // Next.js bypasses ad blockers but complicates CORS and adds a server
  // rewrite. Enable only if ad blocker data loss is a measured problem.
});
