// Text normalization pipeline used by every output validator.
// NFKC → casefold → typographic-to-straight quotes → strip zero-width
// → collapse whitespace → trim.

const ZERO_WIDTH_RE = /[​‌‍﻿]/g;
const SMART_QUOTES = new Map([
  ["‘", "'"], ["’", "'"], ["‚", "'"], ["‛", "'"],
  ["“", '"'], ["”", '"'], ["„", '"'], ["‟", '"'],
  ["′", "'"], ["″", '"'],
]);

function replaceSmartQuotes(s) {
  let out = "";
  for (const ch of s) out += SMART_QUOTES.get(ch) ?? ch;
  return out;
}

/**
 * Normalize a text span deterministically for downstream tokenization.
 * @param {string} input
 * @returns {string}
 */
export function normalize(input) {
  if (typeof input !== "string") throw new TypeError("normalize expects a string");
  let s = input.normalize("NFKC");
  s = s.toLowerCase();
  s = replaceSmartQuotes(s);
  s = s.replace(ZERO_WIDTH_RE, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}
