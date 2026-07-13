// Frontend portal feature flag for Admissions Copilot.
//
// Purpose: keep the portal DARK even for elite/vip tiers until we
// explicitly enable the preview. The backend feature gate
// (ADMISSIONS_COPILOT_ENABLED) is authoritative for API access; this
// flag governs whether the portal REVEALS the surface at all.
//
// When unset:
//   - sidebar hides the Admissions entry for every tier
//   - AdmissionsGate skips the /api/admissions/health probe entirely
//     and redirects direct navigation to /admissions/unavailable
//   - no persistence, no agent calls, no backend mutation
//
// When set to the literal string "1":
//   - Gate 2 behavior applies
//   - elite/vip tier gate + backend health probe + normal skeletons
//
// Reads via process.env at call time so Vitest can toggle it per test
// without a module reload. Next.js inlines NEXT_PUBLIC_ vars into the
// client bundle at build time; setting the value in .env.local flows
// through the same path.

export function isAdmissionsPortalEnabled() {
  return process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED === "1";
}
