// `closedtab check`: score a doc against the quality vector a human-agent team
// relies on. The six dimensions come straight from the author's own AAR schema
// (quality_vector): scope, rationale, a delegation record (who decided),
// validation, negative space (what wasn't done), and residual risks. It's a
// nudge, not a gate: every dimension is detected by plain, readable heuristics.

export type QualityDimension =
  | "scope"
  | "rationale"
  | "delegation"
  | "validation"
  | "negative_space"
  | "residual_risk";

export type CheckResult = {
  score: number; // 0..6
  flags: Record<QualityDimension, boolean>;
  present: QualityDimension[];
  missing: QualityDimension[];
  suggestions: string[];
};

type DocSection = { heading: string; body: string };

const HEADING_RE = /^#{1,6}\s+(.*\S)\s*$/;

/** Split into (heading, body) sections, dropping fenced code and comment-only bodies. */
function sections(markdown: string): DocSection[] {
  const lines = markdown.split(/\r?\n/);
  const out: DocSection[] = [];
  let heading = "";
  let body: string[] = [];
  let inFence = false;
  const flush = () => {
    // Strip HTML comments (skipped-section guidance) before measuring content.
    const text = body.join("\n").replace(/<!--[\s\S]*?-->/g, "").trim();
    out.push({ heading, body: text });
    body = [];
  };
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = HEADING_RE.exec(line);
    if (m) {
      flush();
      heading = m[1].trim();
      continue;
    }
    body.push(line);
  }
  flush();
  return out;
}

// Real docs use freeform headers, so each dimension is detected from BOTH the
// heading names AND signal phrases in the prose. A dimension counts if a matching
// section has content, or the signal appears anywhere in the body. This is a
// generous nudge: better to over-credit a real doc than score a good one 1/6.
const HEADING_PATTERNS: Record<QualityDimension, RegExp> = {
  scope:
    /\b(what was asked|the ask|the brief|asked for|scope|objective|mission|context|the request|requested|reported|problem|the question|what we want|one-liner|summary|what the (user|owner))\b/i,
  rationale:
    /\b(why|rationale|root cause|design decision|design rationale|the intent|reason|decision|consequences|trade-?off|the fix|diagnosis|the problem)\b/i,
  delegation: /\b(decided by|delegation|decisions and follow-?ups|design decisions|key decisions|decision record|owner spec)\b/i,
  validation:
    /\b(verified|validation|verification|testing|tests|how (i|we) know|smoke|results|what got verified)\b/i,
  negative_space:
    /\b(not done|not changed|not touched|follow-?ups?|out of scope|deferred|what not to touch|deliberately|left (out|alone)|did not|caveats?|known (gaps|issues|limitations))\b/i,
  residual_risk:
    /\b(residual risk|risks?|what to watch|known (gaps|issues|limitations)|tech(nical)? debt|open questions?|gotchas?|fragile|honest (gaps|caveats)|still (open|broken))\b/i,
};

// Signal phrases scanned across the whole body (header-agnostic detection).
const BODY_PATTERNS: Record<QualityDimension, RegExp> = {
  scope: /\b(asked for|the ask|requested|the user (reported|asked|wanted)|the owner (asked|wanted)|wanted to|goal is|objective)\b/i,
  rationale:
    /\b(because|root cause|the reason|the trap|that's why|instead of|design decision|trade-?off|decided to|chose to|so that|by design)\b/i,
  delegation:
    /\b(owner-directed|user (confirmed|approved|decided|directed|chose)|the owner (wanted|asked|chose|decided)|i inferred|inferred|sanity-check|per the owner|we agreed|jointly?\s|decided by|owner spec|owner decision)\b/i,
  validation:
    /\b(tested|verified|verification|validation|pytest|npm test|unit test|passed|confirmed (it|that|the)|smoke test|re-?sim|reproduced|spot-check|manually checked|green\b)\b/i,
  negative_space:
    /\b(did not|didn'?t|not changed|not touched|no code change|follow-?ups?|out of scope|deferred|left (it|them|that)? ?(alone|out)|deliberately (left|did not)|not done|won'?t)\b/i,
  residual_risk:
    /\b(risk|known (gap|issue|limitation)|open questions?|tech(nical)? debt|fragile|to watch|caveat|to-?do\b|still (open|broken)|not yet|follow-?up needed)\b/i,
};

const LABELS: Record<QualityDimension, string> = {
  scope: "scope / the ask",
  rationale: "rationale (the why)",
  delegation: "delegation record (who decided)",
  validation: "validation",
  negative_space: "follow-ups and known gaps",
  residual_risk: "residual risks",
};

const SUGGESTIONS: Record<QualityDimension, string> = {
  scope: "State what the owner asked for, in their words.",
  rationale: "Record why it was done this way, beyond what changed.",
  delegation:
    "Note who decided what (owner / agent / joint), and flag any call the agent inferred.",
  validation: "Say how you know it works: tests run, what you checked.",
  negative_space: "List the follow-ups you left and the parts you scoped out for later.",
  residual_risk: "Name the known gaps, risks, or open questions carried forward.",
};

function hasContentSection(secs: DocSection[], pattern: RegExp): boolean {
  return secs.some((s) => pattern.test(s.heading) && s.body.length > 0);
}

/** Score a doc on the six quality-vector dimensions. */
export function checkDoc(markdown: string): CheckResult {
  const secs = sections(markdown);
  const wholeBody = secs.map((s) => s.body).join("\n");

  // A dimension is satisfied if a heading matches a section that has content, OR
  // the signal phrase appears anywhere in the prose (header-agnostic).
  const satisfied = (d: QualityDimension): boolean =>
    hasContentSection(secs, HEADING_PATTERNS[d]) || BODY_PATTERNS[d].test(wholeBody);

  const flags: Record<QualityDimension, boolean> = {
    scope: satisfied("scope"),
    rationale: satisfied("rationale"),
    delegation: satisfied("delegation"),
    validation: satisfied("validation"),
    negative_space: satisfied("negative_space"),
    residual_risk: satisfied("residual_risk"),
  };

  const dims = Object.keys(flags) as QualityDimension[];
  const present = dims.filter((d) => flags[d]);
  const missing = dims.filter((d) => !flags[d]);

  return {
    score: present.length,
    flags,
    present,
    missing,
    suggestions: missing.map((d) => SUGGESTIONS[d]),
  };
}

/** Human-readable report for the CLI. */
export function formatCheck(result: CheckResult, path?: string): string {
  const dims = Object.keys(result.flags) as QualityDimension[];
  const lines: string[] = [];
  lines.push(`closedtab check${path ? `: ${path}` : ""}`);
  lines.push(`score: ${result.score}/6`);
  lines.push("");
  for (const d of dims) {
    lines.push(`  ${result.flags[d] ? "✓" : "✗"} ${LABELS[d]}`);
  }
  if (result.suggestions.length) {
    lines.push("");
    lines.push("to strengthen it:");
    for (const s of result.suggestions) lines.push(`  - ${s}`);
  } else {
    lines.push("");
    lines.push("all six breadcrumbs present.");
  }
  return lines.join("\n");
}
