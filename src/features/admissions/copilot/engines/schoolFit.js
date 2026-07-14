// Engine 3 — deterministic school-fit brief.
//
// Cody verdict: rewrite (Cody produced LLM prose; Gate 4 emits a
// structured brief with one cite-attached statement per axis).
//
// Every fitStatement has ≥ 1 citation from the school-scoped
// citation set. If no matching citation exists for the axis, the
// engine throws — better to surface the gap loudly than to emit an
// uncited school claim (which Gate 3 would block anyway).

import { AXIS_TO_BRIEF_TEMPLATE } from "../constants.js";

function pickProgramName(keyPrograms) {
  return keyPrograms[0] || "flagship program";
}

/**
 * @param {object} inputs
 * @param {object} inputs.schoolResearch validated schoolResearch
 * @param {object} inputs.schoolListEntry validated schoolListEntry
 * @param {object[]} inputs.citations validated citations bank
 * @returns {{fitStatements: {axisKey: string, brief: string, programName: string, citationRefs: string[]}[]}}
 */
export function runSchoolFit(inputs) {
  const { schoolResearch, schoolListEntry, citations } = inputs;
  const schoolCitations = citations.filter(
    (c) => c.schoolScopeId === schoolListEntry.schoolId
  );
  if (schoolCitations.length === 0) {
    throw new Error(
      "schoolFit: no school-scoped citations available for this school; " +
        "school-claim.agent-uncited would fire — refusing to emit."
    );
  }
  const programName = pickProgramName(schoolResearch.keyPrograms || []);

  const fitStatements = schoolResearch.fitAxes.map((axis) => {
    const template = AXIS_TO_BRIEF_TEMPLATE[axis.axisKey] || AXIS_TO_BRIEF_TEMPLATE["other"];
    const brief = template
      .replaceAll("{schoolName}", schoolListEntry.officialSchoolName)
      .replaceAll("{programName}", programName);
    // Each statement inherits ALL school-scoped citations, so the
    // template selects the first as the primary and the rest are
    // available for the draft engine to rotate through if needed.
    return {
      axisKey: axis.axisKey,
      brief,
      programName,
      citationRefs: schoolCitations.map((c) => c.citationId),
    };
  });

  return { fitStatements };
}
