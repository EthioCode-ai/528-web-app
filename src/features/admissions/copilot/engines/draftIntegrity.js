// Engine 5 — draft integrity checker.
//
// Wraps Gate 3's validateDraft() with the Gate 4 fixture context and
// groups results by severity for the UI panel. No new rules are
// introduced.

import { validateDraft } from "../../validation/output/draftValidator.js";

/**
 * @param {object} inputs
 * @param {object} inputs.draft
 * @param {object} inputs.prompt (for wordLimit/charLimit)
 * @param {object[]} inputs.evidenceItems
 * @param {object[]} inputs.citations
 * @param {object[]} inputs.doNotUseTopics
 * @param {"drafting"|"export"|"approval"} inputs.phase
 * @param {object} [inputs.schoolListEntry]
 * @param {object} [inputs.schoolResearch]
 * @param {object} [inputs.cycleContext] { evidenceUsage: {evidenceId: draftId[]} }
 * @returns {{
 *   blocking: object[],
 *   warning: object[],
 *   informational: object[],
 *   phase: string,
 *   ruleCount: number,
 * }}
 */
export function runDraftIntegrity(inputs) {
  const {
    draft,
    prompt,
    evidenceItems,
    citations,
    doNotUseTopics,
    phase,
    schoolListEntry,
    schoolResearch,
    cycleContext,
  } = inputs;

  const context = {
    prompt: {
      wordLimit: prompt.wordLimit ?? null,
      charLimit: prompt.charLimit ?? null,
    },
    evidenceItems,
    citations,
    doNotUseTopics,
    cycleContext: cycleContext || { evidenceUsage: {} },
    phase,
    linkedSchoolId: schoolListEntry?.schoolId,
    schoolName: schoolListEntry?.officialSchoolName,
    keyPrograms: schoolResearch?.keyPrograms || [],
    facultyNames: [],
  };
  const hits = validateDraft(draft, context);
  const blocking = hits.filter((h) => h.severity === "blocking");
  const warning = hits.filter((h) => h.severity === "warning");
  const informational = hits.filter((h) => h.severity === "informational");
  return { blocking, warning, informational, phase, ruleCount: hits.length };
}
