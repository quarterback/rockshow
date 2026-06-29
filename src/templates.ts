// Document templates for human-agent teams. closedtab writes the breadcrumbs a
// human-agent team leaves across a sprint: what the owner asked, what the agent
// did, what was decided (and by whom), what's deliberately left, and what the
// next agent needs to pick the work up. Each template is an ordered list of
// sections; each section's guidance teaches the practice and is written into the
// file as an HTML comment when left blank, so even a skipped section instructs.
//
// The section sets and the doc types (AAR, ADR, handoff, proposal) are drawn
// from the real corpus these were modeled on (~300 docs across several repos:
// aar-*, adr-/ard-*, HANDOFF-*, ASSIGNMENT-*, prd-*), where the load-bearing
// parts are the ask, what changed, the decisions (owner vs. agent), the
// negative space, and the breadcrumbs left for whoever picks the work up next.

export type SectionSpec = {
  id: string;
  heading: string;
  guidance: string;
};

export type Template = {
  id: string;
  label: string;
  description: string;
  docLabel: string; // title prefix, e.g. "AAR", "ADR", "Handoff"
  filePrefix: string; // filename prefix, e.g. "aar", "adr", "handoff"
  sections: SectionSpec[];
};

// ---- Reused sections (shared guidance across templates) ----

const ASK: SectionSpec = {
  id: "asked",
  heading: "What was asked for",
  guidance:
    "The owner's request, in their words. Quote it if you can. What did they actually want from this segment of work?",
};

const CHANGED: SectionSpec = {
  id: "changed",
  heading: "What changed",
  guidance:
    "What the agent actually did. Name files, commits, and PRs with exact paths so the next agent can trace it.",
};

const DECISIONS: SectionSpec = {
  id: "decisions",
  heading: "Decisions and follow-ups",
  guidance:
    "The part that ages best: deliberate choices, who made them (owner, agent, or joint), and any calls the agent inferred that the owner should sanity-check. Plus known gaps and deferred follow-ups.",
};

const VERIFIED: SectionSpec = {
  id: "validation",
  heading: "Verified",
  guidance:
    "How you know it works: tests run, what was checked by hand. State it so it's checkable against the repo later. \"Didn't verify X\" is a valid, useful answer.",
};

const NEXT_AGENT: SectionSpec = {
  id: "next_agent",
  heading: "For the next agent",
  guidance:
    "Breadcrumbs for whoever picks this up: open hooks left in the code, gotchas burned in during the build, what NOT to touch (and why), and any question that needs an owner decision before continuing.",
};

// ---- Templates ----

export const TEMPLATES: Template[] = [
  {
    id: "generic",
    label: "Generic / minimal",
    description: "The core sections for any segment of work.",
    docLabel: "AAR",
    filePrefix: "aar",
    sections: [ASK, CHANGED, DECISIONS, VERIFIED, NEXT_AGENT],
  },
  {
    id: "bugfix",
    label: "Bug fix",
    description: "A fix: symptom, root cause, the change, verification.",
    docLabel: "AAR",
    filePrefix: "aar",
    sections: [
      {
        id: "reported",
        heading: "What was reported",
        guidance:
          "The symptom as observed, ideally in the reporter's words. What looked wrong?",
      },
      {
        id: "root_cause",
        heading: "Root cause",
        guidance:
          "What was actually wrong underneath, not the symptom but the cause. Name the file/function.",
      },
      {
        id: "fix",
        heading: "The fix",
        guidance: "What you changed to address the root cause. Exact paths.",
      },
      DECISIONS,
      VERIFIED,
    ],
  },
  {
    id: "feature",
    label: "Feature / what was built",
    description: "New work: what shipped, design decisions, verification.",
    docLabel: "AAR",
    filePrefix: "aar",
    sections: [
      ASK,
      {
        id: "built",
        heading: "What was built",
        guidance:
          "What shipped. List files touched or added with exact paths.",
      },
      {
        id: "design",
        heading: "Design decisions",
        guidance:
          "Choices worth recording and why: what you considered and rejected, which gaps you left on purpose, and which calls the owner should sanity-check.",
      },
      VERIFIED,
      NEXT_AGENT,
    ],
  },
  {
    id: "investigation",
    label: "Investigation",
    description: "A look into something: findings, verdicts, follow-ups.",
    docLabel: "AAR",
    filePrefix: "aar",
    sections: [
      {
        id: "question",
        heading: "The question",
        guidance: "What prompted this: the question you set out to answer.",
      },
      {
        id: "found",
        heading: "What I found",
        guidance: "The findings. Be concrete; cite files/lines.",
      },
      {
        id: "verdict",
        heading: "Bug vs. working-as-intended",
        guidance:
          "For each finding: is it actually a bug, or behaving as designed? Distinguishing these is the whole point of an investigation.",
      },
      {
        id: "recommendations",
        heading: "Recommended follow-ups",
        guidance: "What should happen next, beyond what you did here, and what needs an owner decision.",
      },
    ],
  },
  {
    id: "adr",
    label: "Decision record (ADR)",
    description: "A design/architecture decision: context, decision, alternatives, consequences.",
    docLabel: "ADR",
    filePrefix: "adr",
    sections: [
      {
        id: "context",
        heading: "Context",
        guidance:
          "The forces at play: what prompted this decision, the constraints, what the owner asked for.",
      },
      {
        id: "decision",
        heading: "Decision",
        guidance: "What we're doing. State it plainly, in the present tense.",
      },
      {
        id: "alternatives",
        heading: "Alternatives considered",
        guidance:
          "What else was on the table and why it was rejected. This is what stops the decision being relitigated later.",
      },
      {
        id: "consequences",
        heading: "Consequences",
        guidance:
          "What this enables, what it costs, the trade-offs accepted, and the residual risks carried forward.",
      },
      {
        id: "decided_by",
        heading: "Decided by",
        guidance:
          "Who made the call: owner, agent, or joint. If the agent inferred it, flag it for the owner to confirm.",
      },
    ],
  },
  {
    id: "handoff",
    label: "Sprint handoff",
    description: "State transfer to the next agent: what works, what's open, what not to touch.",
    docLabel: "Handoff",
    filePrefix: "handoff",
    sections: [
      {
        id: "state",
        heading: "Current state",
        guidance:
          "What works end-to-end, and what's confirmed broken (with evidence: file/line, error, repro).",
      },
      {
        id: "pick_up",
        heading: "Where to pick up",
        guidance:
          "The next concrete steps, in priority order. Where to start reading.",
      },
      {
        id: "do_not_touch",
        heading: "What not to touch",
        guidance:
          "Settled decisions and invariants. Each with a one-line reason so the next agent doesn't relitigate or revert them.",
      },
      {
        id: "open_questions",
        heading: "Open questions for the owner",
        guidance:
          "Decisions that need the owner, not more code. The things you can't resolve alone.",
      },
      {
        id: "watch",
        heading: "What to watch",
        guidance: "Residual risks, fragile spots, gotchas burned in during the build.",
      },
    ],
  },
  {
    id: "proposal",
    label: "Proposal / feature request",
    description: "Forward-looking: what we want, why, scope, open questions.",
    docLabel: "Proposal",
    filePrefix: "proposal",
    sections: [
      {
        id: "what",
        heading: "What we want",
        guidance: "The ask in one or two sentences. The change you're proposing.",
      },
      {
        id: "why",
        heading: "Why",
        guidance: "The motivation. What problem it solves, who it's for.",
      },
      {
        id: "scope",
        heading: "Scope: what it is and isn't",
        guidance:
          "Draw the boundary explicitly. Saying what's out of scope is as useful as saying what's in.",
      },
      {
        id: "open_questions",
        heading: "Open questions",
        guidance: "What needs an owner decision before work starts.",
      },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
