import { describe, it, expect } from "vitest";
import { renderAar, slugify, aarFilename } from "../src/renderAar.js";
import { TEMPLATES, getTemplate } from "../src/templates.js";
import { parseAarTestimony } from "../src/parseAar.js";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Fix pitcher W/L decisions")).toBe("fix-pitcher-w-l-decisions");
  });
  it("trims and collapses separators", () => {
    expect(slugify("  Box-Score:  pitch  counts!! ")).toBe("box-score-pitch-counts");
  });
  it("falls back to untitled when empty", () => {
    expect(slugify("!!!")).toBe("untitled");
  });
  it("aarFilename wraps the slug", () => {
    expect(aarFilename("Fall transfer portal")).toBe("aar-fall-transfer-portal.md");
  });
});

describe("templates", () => {
  it("ships the expected templates with doc labels and file prefixes", () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([
      "adr",
      "bugfix",
      "feature",
      "generic",
      "handoff",
      "investigation",
      "proposal",
    ]);
    // Doc type drives the title label and the filename prefix.
    expect(getTemplate("adr")!.docLabel).toBe("ADR");
    expect(getTemplate("adr")!.filePrefix).toBe("adr");
    expect(getTemplate("handoff")!.filePrefix).toBe("handoff");
    expect(getTemplate("generic")!.docLabel).toBe("AAR");
  });
  it("every AAR template prompts for decisions / design / follow-ups", () => {
    // The section that ages best: deliberate choices and known gaps.
    for (const t of TEMPLATES.filter((t) => t.filePrefix === "aar")) {
      const hasDecisions = t.sections.some((s) =>
        /decision|follow-?up|recommend/i.test(s.heading),
      );
      expect(hasDecisions, `${t.id} should prompt for decisions/follow-ups`).toBe(true);
    }
  });
  it("AAR templates carry a 'for the next agent' breadcrumb section where it fits", () => {
    // generic and feature explicitly leave breadcrumbs for the next agent.
    expect(getTemplate("generic")!.sections.some((s) => s.id === "next_agent")).toBe(true);
    expect(getTemplate("feature")!.sections.some((s) => s.id === "next_agent")).toBe(true);
  });
});

describe("renderAar", () => {
  const template = getTemplate("bugfix")!;
  const meta = {
    title: "Fix pitcher W/L",
    date: "2026-06-29",
    branch: "claude/fix-wl",
    pr: "73",
    commit: "b1787ef",
  };

  it("renders a title, meta line, and every section heading", () => {
    const md = renderAar(template, meta, {});
    expect(md).toContain("# AAR: Fix pitcher W/L");
    expect(md).toContain("**Date:** 2026-06-29");
    expect(md).toContain("**Branch:** `claude/fix-wl`");
    expect(md).toContain("**PR:** #73"); // normalizes bare number to #73
    expect(md).toContain("**Commit:** `b1787ef`");
    for (const s of template.sections) expect(md).toContain(`## ${s.heading}`);
  });

  it("leaves guidance as an HTML comment for skipped sections", () => {
    const md = renderAar(template, meta, {});
    const decisions = template.sections.find((s) => s.id === "decisions")!;
    expect(md).toContain(`<!-- ${decisions.guidance} -->`);
  });

  it("uses author text when a section is answered", () => {
    const md = renderAar(template, meta, {
      root_cause: "`w`/`l` were season totals, copied in `_aggregate_pitcher_rows`",
    });
    expect(md).toContain("`w`/`l` were season totals, copied in `_aggregate_pitcher_rows`");
    expect(md).not.toContain(`<!-- What was actually wrong`);
  });

  it("omits optional meta fields that are blank", () => {
    const md = renderAar(getTemplate("generic")!, { title: "x", date: "2026-06-29" }, {});
    expect(md).toContain("**Date:** 2026-06-29");
    expect(md).not.toContain("**Branch:**");
    expect(md).not.toContain("**PR:**");
  });

  it("produces an AAR the closedtab parser can read back", () => {
    // The authored file should round-trip: its anchor sections parse as anchors.
    const md = renderAar(getTemplate("generic")!, { title: "round trip", date: "2026-06-29" }, {
      asked: "Add a pitch-count column.",
      changed: "Edited `o27v2/web/box_text.py`.",
      decisions: "Left `o27v2/web/templates/box.html` alone; follow-ups: none.",
      validation: "Ran `pytest o27v2/tests`.",
    });
    const claims = parseAarTestimony(md);
    expect(claims.some((c) => c.section === "intent")).toBe(true);
    expect(claims.some((c) => c.section === "claimed_actions")).toBe(true);
    expect(claims.some((c) => c.section === "negative_space")).toBe(true);
  });
});
