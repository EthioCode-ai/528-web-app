// §7.3 draft/output validation — placeholder markers, copied
// evidence phase escalation, citation split by author type,
// interview-defensibility split, length rules, repeated story,
// generic school-fit, doNotUseTopics hit at the draft-validator layer.

import { describe, test, expect } from "vitest";
import { validateDraft } from "../output/draftValidator.js";
import {
  APPLICANT_ID, SCHOOL_A_ID, DRAFT_A_ID, PROMPT_A_ID,
  EVIDENCE_A_ID, EVIDENCE_B_ID, CITATION_A_ID, TOPIC_A_ID,
  validDraftReadyForReview, validEvidenceConfirmed, validEvidenceUnconfirmed,
  validCitation, validDoNotUseTopic,
} from "../fixtures/synthetic/index.js";

function baseContext(overrides) {
  return {
    prompt: { wordLimit: 300, charLimit: null },
    evidenceItems: [validEvidenceConfirmed, validEvidenceUnconfirmed],
    citations: [validCitation],
    doNotUseTopics: [validDoNotUseTopic],
    cycleContext: { evidenceUsage: { [EVIDENCE_A_ID]: [DRAFT_A_ID] } },
    phase: "drafting",
    linkedSchoolId: SCHOOL_A_ID,
    schoolName: "Placeholder Medical School",
    keyPrograms: ["Longitudinal Community Clinic"],
    facultyNames: [],
    ...overrides,
  };
}

function baseDraft(overrides) {
  return { ...validDraftReadyForReview, ...overrides };
}

function ruleHit(hits, ruleId) {
  return hits.find((h) => h.ruleId === ruleId);
}

describe("draft.evidence.missing", () => {
  test("no evidenceCitations → blocking", () => {
    const hits = validateDraft(
      baseDraft({ evidenceCitations: [] }),
      baseContext({ phase: "export" })
    );
    expect(ruleHit(hits, "draft.evidence.missing")).toBeTruthy();
    expect(ruleHit(hits, "draft.evidence.missing").severity).toBe("blocking");
  });
});

describe("draft.evidence.unconfirmed / orphan", () => {
  test("unconfirmed evidence in citations → blocking", () => {
    const hits = validateDraft(
      baseDraft({ evidenceCitations: [EVIDENCE_B_ID] }),
      baseContext()
    );
    expect(ruleHit(hits, "draft.evidence.unconfirmed")).toBeTruthy();
  });

  test("evidence not in bank → orphan", () => {
    const hits = validateDraft(
      baseDraft({ evidenceCitations: ["00000000-0000-4000-8000-0000000000ff"] }),
      baseContext()
    );
    expect(ruleHit(hits, "draft.evidence.orphan")).toBeTruthy();
  });

  test("citation not in table → orphan", () => {
    const hits = validateDraft(
      baseDraft({ schoolCitations: ["00000000-0000-4000-8000-0000000000fe"] }),
      baseContext()
    );
    expect(ruleHit(hits, "draft.citation.orphan")).toBeTruthy();
  });
});

describe("word/char limits", () => {
  test("wordCount over limit → blocking (export)", () => {
    const hits = validateDraft(
      baseDraft({ wordCount: 350 }),
      baseContext({ phase: "export" })
    );
    const h = ruleHit(hits, "draft.wordLimit.exceeded");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("blocking");
  });

  test("underfilled → warning", () => {
    const hits = validateDraft(
      baseDraft({ wordCount: 100 }),
      baseContext()
    );
    const h = ruleHit(hits, "draft.underfilled");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("warning");
  });
});

describe("placeholder / third-person", () => {
  test("'the applicant' → blocking", () => {
    const hits = validateDraft(
      baseDraft({ draftText: "The applicant volunteered at a clinic." }),
      baseContext()
    );
    expect(ruleHit(hits, "draft.placeholder.third-person")).toBeTruthy();
  });

  test("bracket placeholder → blocking", () => {
    const hits = validateDraft(
      baseDraft({ draftText: "I volunteered at [insert clinic name here]." }),
      baseContext()
    );
    expect(ruleHit(hits, "draft.placeholder.third-person")).toBeTruthy();
  });

  test("clean first-person draft → no hit", () => {
    const hits = validateDraft(
      baseDraft({ draftText: "I volunteered at a free clinic weekly for a year." }),
      baseContext()
    );
    expect(ruleHit(hits, "draft.placeholder.third-person")).toBeFalsy();
  });
});

describe("doNotUseTopics.hit at the draft-validator layer", () => {
  test("phrase appears → blocking", () => {
    const hits = validateDraft(
      baseDraft({ draftText: "I mostly avoid family medical history in essays." }),
      baseContext()
    );
    const h = ruleHit(hits, "draft.doNotUseTopics.hit");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("blocking");
    expect(h.message).toMatch(/family-medical-history/);
  });
});

describe("copied-evidence phase escalation", () => {
  const near = validEvidenceConfirmed.narrative.slice(0, 200);
  const draftText = `I volunteered at a free clinic. ${near}`;
  test("drafting phase → warning", () => {
    const hits = validateDraft(
      baseDraft({ draftText, wordCount: 200, charCount: 500 }),
      baseContext({ phase: "drafting" })
    );
    const h = ruleHit(hits, "draft.copied-evidence");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("warning");
  });
  test("approval phase → blocking", () => {
    const hits = validateDraft(
      baseDraft({ draftText, wordCount: 200, charCount: 500 }),
      baseContext({ phase: "approval" })
    );
    const h = ruleHit(hits, "draft.copied-evidence.export-block");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("blocking");
  });
});

describe("school-claim citation severity split", () => {
  const draftText = "Placeholder Medical School emphasizes primary care.";
  const sentenceIndex = [
    {
      sentenceId: "00000000-0000-4000-8000-000000000091",
      spanStart: 0,
      spanEnd: draftText.length,
      classifiedAs: "school-claim",
      authorType: "agent",
      linkedEvidenceIds: [],
      linkedCitationIds: [],
    },
  ];
  test("agent authored, uncited → blocking", () => {
    const hits = validateDraft(
      baseDraft({
        draftText, wordCount: 6, charCount: draftText.length,
        authorType: "agent", sentenceIndex,
      }),
      baseContext()
    );
    const h = ruleHit(hits, "draft.school-claim.agent-uncited");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("blocking");
    expect(ruleHit(hits, "draft.school-claim.applicant-uncited")).toBeFalsy();
  });

  test("applicant authored, uncited → warning", () => {
    const applicantSentenceIndex = [
      { ...sentenceIndex[0], authorType: "applicant" },
    ];
    const hits = validateDraft(
      baseDraft({
        draftText, wordCount: 6, charCount: draftText.length,
        authorType: "applicant", sentenceIndex: applicantSentenceIndex,
      }),
      baseContext()
    );
    const h = ruleHit(hits, "draft.school-claim.applicant-uncited");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("warning");
    expect(ruleHit(hits, "draft.school-claim.agent-uncited")).toBeFalsy();
  });
});

describe("interview-defensibility split", () => {
  test("unconfirmed sensitive evidence in a claim → blocking", () => {
    const draftText =
      "I supported a loved one through a serious illness that shaped my perspective.";
    const sentenceIndex = [
      {
        sentenceId: "00000000-0000-4000-8000-000000000092",
        spanStart: 0,
        spanEnd: draftText.length,
        classifiedAs: "applicant-claim",
        authorType: "applicant",
        linkedEvidenceIds: [EVIDENCE_B_ID],
        linkedCitationIds: [],
      },
    ];
    const hits = validateDraft(
      baseDraft({ draftText, sentenceIndex, wordCount: 12, charCount: draftText.length }),
      baseContext({ phase: "approval" })
    );
    const h = ruleHit(hits, "draft.interview-defensibility.unconfirmed-sensitive");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("blocking");
  });

  test("confirmed but thin evidence → warning", () => {
    const thinEvidence = {
      ...validEvidenceConfirmed,
      evidenceId: "00000000-0000-4000-8000-0000000000cc",
      narrative: "Very short note.",
      confirmed: true,
      sensitivityTags: ["none"],
    };
    const draftText = "I mentored a peer through the application cycle.";
    const sentenceIndex = [
      {
        sentenceId: "00000000-0000-4000-8000-000000000093",
        spanStart: 0,
        spanEnd: draftText.length,
        classifiedAs: "applicant-claim",
        authorType: "applicant",
        linkedEvidenceIds: [thinEvidence.evidenceId],
        linkedCitationIds: [],
      },
    ];
    const hits = validateDraft(
      baseDraft({ draftText, sentenceIndex, wordCount: 9, charCount: draftText.length }),
      baseContext({ evidenceItems: [thinEvidence] })
    );
    const h = ruleHit(hits, "draft.interview-defensibility.thin");
    expect(h).toBeTruthy();
    expect(h.severity).toBe("warning");
  });
});
