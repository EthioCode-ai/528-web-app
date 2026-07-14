"use client";

import { useAdmissionsRunStore } from "../runStore.js";

const SEVERITY_STYLES = {
  blocking: "border-red-400 bg-red-50 text-red-900",
  warning: "border-amber-400 bg-amber-50 text-amber-900",
  informational: "border-slate-300 bg-slate-50 text-slate-800",
};

function Row({ hit, acknowledged, onAcknowledge }) {
  const style = SEVERITY_STYLES[hit.severity] || SEVERITY_STYLES.informational;
  return (
    <li
      data-testid={`integrity-hit-${hit.ruleId}`}
      className={`border rounded p-2 my-1 text-xs ${style}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono text-[0.7rem] mr-2">{hit.ruleId}</span>
          <span>{hit.message}</span>
        </div>
        {hit.severity === "warning" && !acknowledged && (
          <button
            type="button"
            onClick={() => onAcknowledge(hit.ruleId)}
            data-testid={`ack-${hit.ruleId}`}
            className="ml-2 text-[0.7rem] underline"
          >
            Acknowledge
          </button>
        )}
        {hit.severity === "warning" && acknowledged && (
          <span className="ml-2 text-[0.7rem] italic">(acknowledged, session-only)</span>
        )}
      </div>
    </li>
  );
}

export function IntegrityPanel() {
  const report = useAdmissionsRunStore((s) => s.report);
  const acknowledgements = useAdmissionsRunStore((s) => s.acknowledgements);
  const acknowledgeWarning = useAdmissionsRunStore((s) => s.acknowledgeWarning);
  if (!report?.integrity) return null;
  const { blocking, warning, informational, phase } = report.integrity;

  const isAck = (id) => acknowledgements.includes(id);

  return (
    <section
      data-testid="integrity-panel"
      className="border rounded p-4 my-3"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Integrity ({phase})</h3>
        <div className="text-xs text-slate-500" data-testid="integrity-counts">
          {blocking.length} blocking · {warning.length} warning ·{" "}
          {informational.length} info
        </div>
      </div>
      <ul>
        {blocking.map((h, i) => (
          <Row key={`b${i}`} hit={h} acknowledged={false} onAcknowledge={() => {}} />
        ))}
        {warning.map((h, i) => (
          <Row
            key={`w${i}`}
            hit={h}
            acknowledged={isAck(h.ruleId)}
            onAcknowledge={acknowledgeWarning}
          />
        ))}
        {informational.map((h, i) => (
          <Row key={`i${i}`} hit={h} acknowledged={false} onAcknowledge={() => {}} />
        ))}
      </ul>
    </section>
  );
}
