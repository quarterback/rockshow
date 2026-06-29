import { describe, it, expect } from "vitest";
import { checkDoc, formatCheck } from "../src/check.js";

describe("checkDoc", () => {
  // A doc that hits all six quality-vector dimensions, with freeform headers to
  // prove detection is content-aware, not heading-name-bound.
  const rich = `# AAR: thing

## What the user reported
The owner asked for a fix to the pitcher W/L display.

## Issue 2 — the real bug
The trap: those fields were season totals, read instead of the per-game value,
which is why everyone got a (W).

## Decisions
Owner-directed: keep the season map. I inferred the display fix; flagged for the
owner to sanity-check.

## Verified
Ran pytest; 42 passed. Confirmed the box score by hand.

## Not changed
Did not touch the template. Follow-ups: the seconds column, deferred.

## Risks
Known gap: the fix assumes one decision per game. Open question for next sprint.
`;

  it("scores a complete doc 6/6 across freeform headers", () => {
    const r = checkDoc(rich);
    expect(r.score).toBe(6);
    expect(r.missing).toEqual([]);
    expect(r.flags.delegation).toBe(true);
    expect(r.flags.negative_space).toBe(true);
  });

  it("scores an empty scaffold low and lists what's missing", () => {
    const skeleton = `# AAR: x

## What was asked for
<!-- guidance comment only, no real content -->

## Verified
<!-- skipped -->
`;
    const r = checkDoc(skeleton);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.missing).toContain("delegation");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("ignores HTML-comment guidance when measuring content", () => {
    const onlyComments = `# AAR: x\n\n## Decisions\n<!-- who decided -->\n`;
    expect(checkDoc(onlyComments).flags.delegation).toBe(false);
  });

  it("formatCheck renders a score line and a tick per dimension", () => {
    const out = formatCheck(checkDoc(rich), "x.md");
    expect(out).toContain("score: 6/6");
    expect(out).toContain("✓ scope");
    expect(out).toContain("delegation record");
  });
});
