// User-facing message templates keyed by ruleId. In Gate 3 the
// message is derived from the rule registry's messageTemplate — this
// helper wraps the interpolation. Kept as a thin layer so a future
// i18n effort can swap the source without touching call sites.

import { rulesById } from "./rules.js";

const INTERP_RE = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Render the user-facing message for a rule violation.
 *
 * @param {string} ruleId
 * @param {Record<string, unknown>} [metadata] Values for {slot} interpolation.
 * @returns {{ ruleId: string, severity: string, message: string, scope: string, target: string[], phase: ("drafting"|"export"|"approval"|null) }}
 */
export function renderMessage(ruleId, metadata) {
  const rule = rulesById[ruleId];
  if (!rule) {
    throw new Error(`unknown ruleId: ${ruleId}`);
  }
  const meta = { ...rule.metadataTemplate, ...(metadata || {}) };
  const message = rule.messageTemplate.replace(INTERP_RE, (_full, key) => {
    if (Object.prototype.hasOwnProperty.call(meta, key)) return String(meta[key]);
    return `{${key}}`;
  });
  return {
    ruleId: rule.ruleId,
    severity: rule.severity,
    message,
    scope: rule.scope,
    target: [...rule.target],
    phase: rule.phase,
  };
}
