// Locked v0.2 decision 8: the ONLY entry-gate to any Gate 4 flow.
//
// Both conditions must hold. If NODE_ENV is not "development",
// this returns false — even if a future misconfiguration sets
// NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED=1 in production, the flow
// still refuses to render.
//
// Explicitly not allowed (planned in plan v0.2 §9.7):
//   • URL query overrides (?copilot-dev=1)
//   • sessionStorage / localStorage force-enable
//   • Cookie overrides
//   • Enabling NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED in production
//
// This helper is intentionally the sole predicate anywhere in the
// copilot module. Every UI entry point + the runOrchestrator both
// call it defensively.

export function isCopilotDevModeAllowed() {
  const nodeEnv = process.env.NODE_ENV;
  const flag = process.env.NEXT_PUBLIC_ADMISSIONS_PORTAL_ENABLED;
  return nodeEnv === "development" && flag === "1";
}
