import AdmissionsGate from "@/features/admissions/AdmissionsGate";

// Layout for /admissions/**.
//
// Wraps every admissions route with the backend feature-gate check.
// The (dashboard) parent layout supplies the sidebar + TopBar; this
// layer adds the Admissions-specific gate. The gate short-circuits
// rendering when the backend is off or the caller lacks the
// admissions_copilot entitlement.

export default function AdmissionsLayout({ children }) {
  return <AdmissionsGate>{children}</AdmissionsGate>;
}
