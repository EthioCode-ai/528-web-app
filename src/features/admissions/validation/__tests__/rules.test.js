// Meta-schema for the rule registry — ensures every rule follows the
// declared shape and that severities/scopes/phases are within their
// allowed enum values.

import { describe, test, expect } from "vitest";
import { z } from "zod";
import { rules, rulesById } from "../rules.js";
import { renderMessage } from "../messages.js";

const ruleShape = z.object({
  ruleId: z.string().min(1),
  severity: z.enum(["blocking", "warning", "informational"]),
  scope: z.enum(["field", "entity", "cross-entity", "output"]),
  target: z.array(z.string().min(1)).min(1),
  messageTemplate: z.string().min(1),
  metadataTemplate: z.record(z.string(), z.unknown()),
  phase: z.enum(["drafting", "export", "approval"]).nullable(),
});

describe("rule registry — shape", () => {
  test.each(rules)("%s conforms to the meta-schema", (rule) => {
    expect(ruleShape.safeParse(rule).success, JSON.stringify(rule)).toBe(true);
  });

  test("ruleIds are unique", () => {
    const ids = new Set();
    for (const r of rules) {
      expect(ids.has(r.ruleId), `duplicate ruleId: ${r.ruleId}`).toBe(false);
      ids.add(r.ruleId);
    }
  });

  test("rulesById covers every registered rule", () => {
    for (const r of rules) expect(rulesById[r.ruleId]).toStrictEqual(r);
  });
});

describe("renderMessage", () => {
  test("renders known ruleId with template metadata", () => {
    const m = renderMessage("mcat.total.range", {});
    expect(m.message).toBe("MCAT total must be between 472 and 528.");
    expect(m.severity).toBe("blocking");
  });

  test("interpolates metadata overrides", () => {
    const m = renderMessage("draft.wordLimit.exceeded", { n: 25, limit: 300 });
    expect(m.message).toBe("Draft is 25 words over the 300-word prompt limit.");
  });

  test("unknown ruleId throws", () => {
    expect(() => renderMessage("no.such.rule", {})).toThrow(/unknown ruleId/);
  });
});
