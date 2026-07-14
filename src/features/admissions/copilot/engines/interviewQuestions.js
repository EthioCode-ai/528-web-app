// Engine 6 — deterministic interview questions.
//
// Cody verdict: rewrite. Gate 4 emits one question per fit axis on
// the school, drawing themes from AXIS_TO_QUESTION_TEMPLATE, with
// mappedEvidenceIds pulled from the story-match ordering.
//
// Every emitted question carries a sourceCitationId scoped to the
// school so the interview pack is trace-clean.

import { AXIS_TO_QUESTION_TEMPLATE } from "../constants.js";

/**
 * @param {object} inputs
 * @param {object} inputs.schoolResearch
 * @param {object} inputs.schoolListEntry
 * @param {object[]} inputs.citations
 * @param {object} inputs.matches ranked story matches
 * @param {object} inputs.interviewPrepInputs
 * @returns {{ questions: object[] }}
 */
export function runInterviewQuestions(inputs) {
  const {
    schoolResearch,
    schoolListEntry,
    citations,
    matches,
    interviewPrepInputs,
  } = inputs;

  const schoolCitations = citations.filter(
    (c) => c.schoolScopeId === schoolListEntry.schoolId
  );
  if (schoolCitations.length === 0) {
    throw new Error("interviewQuestions: no school-scoped citations");
  }
  const primaryCitationId = schoolCitations[0].citationId;
  const primaryProgram = (schoolResearch.keyPrograms || [])[0] || "flagship program";
  const evidenceIds = matches.matches
    .filter((m) => interviewPrepInputs.storyIds.includes(m.evidenceId))
    .map((m) => m.evidenceId);

  const questions = schoolResearch.fitAxes.map((axis) => {
    const template =
      AXIS_TO_QUESTION_TEMPLATE[axis.axisKey] || AXIS_TO_QUESTION_TEMPLATE["other"];
    const questionText = template.stem
      .replaceAll("{schoolName}", schoolListEntry.officialSchoolName)
      .replaceAll("{programName}", primaryProgram);
    return {
      axisKey: axis.axisKey,
      questionText,
      sourceCitationId: primaryCitationId,
      expectedThemes: [...template.themes],
      mappedEvidenceIds: [...evidenceIds],
    };
  });
  return { questions };
}
