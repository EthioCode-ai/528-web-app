// §7.3 doNotUseTopics — normalized phrase/token matching. Regex is
// disallowed; substring false-positives are guarded by word-boundary
// tokenization; homoglyphs are normalized via NFKC.

import { describe, test, expect } from "vitest";
import { doNotUseTopicSchema } from "../entities/doNotUseTopics.js";
import { tokenize, phraseIsContiguousSubsequence } from "../output/tokenize.js";
import { validDoNotUseTopic } from "../fixtures/synthetic/index.js";

function matches(phrase, draft) {
  return phraseIsContiguousSubsequence(tokenize(phrase), tokenize(draft));
}

describe("doNotUseTopics — phrase matching semantics", () => {
  test("exact phrase hit", () => {
    expect(matches("family medical history", "…discussing family medical history openly…"))
      .toBe(true);
  });

  test("case-insensitive hit", () => {
    expect(matches("FAMILY medical HISTORY", "family medical history matters here"))
      .toBe(true);
  });

  test("word-boundary false positive guarded", () => {
    // Phrase "eader" MUST NOT match "leader"
    expect(matches("eader", "our team leader guided the group"))
      .toBe(false);
  });

  test("homoglyph safe (NFKC + casefold)", () => {
    // "cаncer" contains a Cyrillic "а" (U+0430). NFKC does NOT collapse
    // this to Latin "a", so a strict-tokenized match is intentionally
    // NOT triggered. This test locks that behavior — we do not want the
    // matcher to guess at intent silently.
    expect(matches("cancer", "the word cаncer with a cyrillic character"))
      .toBe(false);
  });

  test("ligature and full-width normalization", () => {
    // "ﬁnance" (U+FB01 ligature fi) normalizes to "finance"
    expect(matches("finance", "her ﬁnance work at the clinic")).toBe(true);
    // Full-width "Ａ" normalizes to "A"
    expect(matches("aims", "our Ａims include community service")).toBe(true);
  });

  test("smart quotes normalized to straight", () => {
    expect(matches("mother's illness", "…my mother’s illness impacted us…"))
      .toBe(true);
  });

  test("punctuation between tokens does NOT prevent a match", () => {
    // Tokenization strips non-alphanumeric characters, so a phrase's
    // tokens may span an intervening period/comma. This is intentional
    // per the plan (§6.2): false positives from lax boundaries are
    // acceptable; false negatives are not.
    expect(matches("family medical history", "family medical. history repeats"))
      .toBe(true);
  });

  test("miss when phrase tokens are not contiguous", () => {
    // "family history medical" has the tokens out of order, so the
    // subsequence check must return false.
    expect(matches("family medical history", "family history medical status")).toBe(false);
  });
});

describe("doNotUseTopic schema — regex characters are refused", () => {
  test("phrase containing regex metacharacter → rejected", () => {
    expect(() =>
      doNotUseTopicSchema.parse({
        ...validDoNotUseTopic,
        matchPhrases: ["cancer.*"],
      })
    ).toThrow(/literal phrases; regex metacharacters/);
  });

  test("phrase containing bracket → rejected", () => {
    expect(() =>
      doNotUseTopicSchema.parse({
        ...validDoNotUseTopic,
        matchPhrases: ["cancer[er]"],
      })
    ).toThrow(/literal phrases/);
  });

  test("clean literal phrase → accepted", () => {
    expect(() =>
      doNotUseTopicSchema.parse({
        ...validDoNotUseTopic,
        matchPhrases: ["family medical history"],
      })
    ).not.toThrow();
  });
});
