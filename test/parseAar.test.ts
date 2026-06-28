import { describe, it, expect } from "vitest";
import { parseAarTestimony } from "../src/parseAar.js";
import { classifyHeading } from "../src/anchors.js";

describe("classifyHeading", () => {
  it("maps intent variants", () => {
    expect(classifyHeading("What was asked for")).toBe("intent");
    expect(classifyHeading("The ask")).toBe("intent");
    expect(classifyHeading("What the user reported")).toBe("intent");
  });
  it("maps claimed-action variants", () => {
    expect(classifyHeading("What changed")).toBe("claimed_actions");
    expect(classifyHeading("Files touched")).toBe("claimed_actions");
    expect(classifyHeading("The fix")).toBe("claimed_actions");
    expect(classifyHeading("What was built")).toBe("claimed_actions");
  });
  it("maps negative-space variants, winning over action words they contain", () => {
    expect(classifyHeading("What I did NOT do")).toBe("negative_space");
    expect(classifyHeading("What I did not change")).toBe("negative_space");
    expect(classifyHeading("Not changed / follow-ups")).toBe("negative_space");
    expect(classifyHeading("Follow-ups")).toBe("negative_space");
    expect(classifyHeading("What this does not change")).toBe("negative_space");
  });
  it("strips leading section numbering", () => {
    expect(classifyHeading("4. Validation")).toBe("other");
    expect(classifyHeading("5b. What I did not change")).toBe("negative_space");
    expect(classifyHeading("3. The fix (owner-directed)")).toBe("claimed_actions");
  });
  it("falls back to other for unrecognized headings", () => {
    expect(classifyHeading("Segment summary")).toBe("other");
    expect(classifyHeading("Why this is better")).toBe("other");
  });
});

describe("parseAarTestimony", () => {
  const md = `# After-Action Report — Example

**Branch:** \`claude/example-aB12\`
**PR:** #88
**Commit:** \`a1b2c3d\`

## What was asked for

Add a pitch-count column to the box score.

## What changed

- Edited \`o27v2/web/box_text.py\` and ran \`pytest o27v2/tests\`.

## What I did NOT do

- Did not touch \`o27v2/web/templates/box.html\`.
`;

  it("drops front-matter metadata lines (Branch/PR/Commit) as non-claims", () => {
    const claims = parseAarTestimony(md);
    const texts = claims.map((c) => c.text);
    expect(texts.some((t) => /^Branch:/i.test(t))).toBe(false);
    expect(texts.some((t) => /^Commit:/i.test(t))).toBe(false);
    expect(texts.some((t) => /^PR:/i.test(t))).toBe(false);
  });

  it("splits a conjoined sentence into separate claims", () => {
    const claims = parseAarTestimony(md);
    const texts = claims.map((c) => c.text);
    expect(texts).toContain("Edited `o27v2/web/box_text.py`");
    expect(texts).toContain("ran `pytest o27v2/tests`");
  });

  it("tags intent / claimed_actions / negative_space sections", () => {
    const claims = parseAarTestimony(md);
    const intent = claims.find((c) => c.text.startsWith("Add a pitch-count"));
    const action = claims.find((c) => c.text === "Edited `o27v2/web/box_text.py`");
    const neg = claims.find((c) => c.text.startsWith("Did not touch"));
    expect(intent?.section).toBe("intent");
    expect(intent?.kind).toBe("intent");
    expect(action?.section).toBe("claimed_actions");
    expect(action?.kind).toBe("action");
    expect(neg?.section).toBe("negative_space");
    expect(neg?.kind).toBe("non_action");
  });

  it("joins soft-wrapped lines within a bullet into one claim", () => {
    const wrapped = `## What changed

- Updated \`o27v2/web/standings.py\` to batch the per-team record lookup into one
  query.
`;
    const claims = parseAarTestimony(wrapped);
    expect(claims.map((c) => c.text)).toContain(
      "Updated `o27v2/web/standings.py` to batch the per-team record lookup into one query",
    );
    // no stray "query" fragment
    expect(claims.some((c) => c.text === "query")).toBe(false);
  });

  it("does not extract claims from fenced code blocks", () => {
    const withCode = `## The fix

\`\`\`python
for prow in rows:
    _decisions[pid] = "W"
\`\`\`

Edited \`app.py\`.
`;
    const claims = parseAarTestimony(withCode);
    expect(claims.some((c) => c.text.includes("_decisions[pid]"))).toBe(false);
    expect(claims.some((c) => c.text === "Edited `app.py`")).toBe(true);
  });

  it("assigns stable sequential ids", () => {
    const claims = parseAarTestimony(md);
    expect(claims[0].id).toBe("claim-001");
    expect(claims.every((c, i) => c.id === `claim-${String(i + 1).padStart(3, "0")}`)).toBe(
      true,
    );
  });
});
