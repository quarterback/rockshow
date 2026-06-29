import type { ClaimSection } from "./types.js";

// Anchor-section detection. Three sections are the load-bearing anchors for
// reconciliation; every other heading is supporting prose ("other").
//
// The variant lists below were finalized from a heading-frequency table built
// over the whole AAR corpus (github.com/quarterback/hybrid-baseball/docs +
// tennis-team-manager/docs, ~280 files). See scripts/corpus-report.ts, which
// regenerates the frequency table and reports headings that still land in
// "other" so these lists can be extended as the corpus grows.

// Negative space is checked FIRST: many of its headings ("what i did not
// change", "what was not done") contain words that also appear in action
// headings, so the more specific negation patterns must win.
const NEGATIVE_SPACE_PATTERNS: RegExp[] = [
  /\bnot\b/, // "did not", "was not", "not changed", "not touched", "not done", "does not"
  /\bdid ?n[o']t\b/, // didn't / did not
  /\bdoes ?n[o']t\b/,
  /\bwon[o']?t\b/,
  /\bfollow[- ]?ups?\b/,
  /\bdeferred?\b/,
  /\bout[- ]of[- ]scope\b/,
  /\bdeliberately\b/,
  /\bknown (?:issues?|limitations?|gaps?|characteristics?)\b/,
  /\bstill (?:open|on the table)\b/,
  /\bleft (?:for later|alone|out)\b/,
  /\bdidn[o']?t (?:ship|do|change)\b/,
  /\bscope guardrails\b/,
];

// The human's ask.
const INTENT_PATTERNS: RegExp[] = [
  /\bwhat was asked\b/,
  /\bwhat (?:the )?(?:user|owner) (?:asked|reported|wanted|requested)\b/,
  /\bthe ask\b/,
  /\bwhat was reported\b/,
  /\bwhat was requested\b/,
  /\bthe request\b/,
  /\brequested\b/,
  /\bthe intent\b/,
  /\b(?:the )?goal\b/,
  /\bobjective\b/,
  /\b(?:the )?tasks?\b/,
  /\bwhy \(reported\)\b/,
];

// What the AAR says was done.
const CLAIMED_ACTIONS_PATTERNS: RegExp[] = [
  /\bwhat changed\b/,
  /\bwhat (?:was|got) built\b/,
  /\bwhat (?:was|got) shipped\b/,
  /\bwhat shipped\b/,
  /\bwhat was done\b/,
  /\bwhat i (?:built|changed|did|wrote|added|shipped)\b/,
  /\bwhat we (?:built|changed|did)\b/,
  /\bfiles? (?:touched|changed|modified|added)\b/,
  /\bfiles\b/,
  /\bthe fix(?:es)?\b/,
  /\bfix(?:es)?\b/,
  /\bthe change\b/,
  /\bchanges?\b/,
  /\bimplementation\b/,
  /\bimplemented\b/,
  /\bschema changes\b/,
  /\bresolution\b/,
];

/** Strip leading list/section numbering like "4.", "5b.", "2.1", "3c " from a heading. */
function stripNumbering(heading: string): string {
  return heading
    .replace(/^\s*\d+(?:\.\d+)*[a-z]?[.)]?\s+/i, "")
    .trim();
}

/**
 * Classify a heading line into one of the four sections. Matching is
 * case-insensitive and runs negative-space first so negations win over the
 * action words they contain.
 *
 * Returns both the section and which anchor pattern (if any) matched, so the
 * corpus report can show why a heading was classified the way it was.
 */
export function classifyHeading(heading: string): ClaimSection {
  const h = stripNumbering(heading).toLowerCase();

  if (NEGATIVE_SPACE_PATTERNS.some((re) => re.test(h))) return "negative_space";
  if (INTENT_PATTERNS.some((re) => re.test(h))) return "intent";
  if (CLAIMED_ACTIONS_PATTERNS.some((re) => re.test(h))) return "claimed_actions";
  return "other";
}

export const ANCHOR_PATTERNS = {
  negative_space: NEGATIVE_SPACE_PATTERNS,
  intent: INTENT_PATTERNS,
  claimed_actions: CLAIMED_ACTIONS_PATTERNS,
};
