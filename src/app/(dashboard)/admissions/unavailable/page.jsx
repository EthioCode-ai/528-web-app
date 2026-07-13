import Link from "next/link";

export default function AdmissionsUnavailablePage() {
  return (
    <div data-testid="admissions-unavailable" className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Admissions Copilot
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Not available in your account yet
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Admissions Copilot is being staged as an Elite+ capability. If you
          were expecting access, please contact support.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Your other 528 AI features work normally.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-[#1a56db] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1648b8]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
