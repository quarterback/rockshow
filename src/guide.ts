// The "how to write these docs" explainer, printed by `closedtab guide`.
// Teaches the practice for human-agent teams, not just the format.

export const GUIDE = `Writing docs for a human-agent team

closedtab is for human-agent teams: a person and one or more AI agents doing
work across a sprint, or a stack of sprints. The docs it writes are the
breadcrumb trail. When you (or a future agent, or a past one) come back, the
trail tells you what was asked, what got done, what was decided and by whom,
what's deliberately left, and where to pick up.

Write one for every useful segment of work: a bug fix, a feature, a tuning pass,
a decision, a handoff at the end of a session. Many people do it every PR. The
agent did the work; the doc is how the team keeps a shared memory of it.

The load-bearing parts:

  1. What was asked for
     The owner's request, in their words. Quote it. This is the contract the
     work is checked against.

  2. What changed
     What the agent actually did. Name files, commits, PRs with exact paths, so
     the next agent can trace it (and so closedtab can reconcile it later).

  3. Decisions and follow-ups
     The part that ages best. The deliberate choices, who made them (owner,
     agent, or joint), and any call the agent inferred that the owner should
     sanity-check. Plus the known gaps and deferred follow-ups. This is exactly
     how a good CLAUDE.md reads: settled calls, labeled so nobody reverts them.

  4. Verified
     How you know it works, stated so it's checkable against the repo.

  5. For the next agent
     The breadcrumbs: open hooks left in the code, gotchas burned in during the
     build, what NOT to touch, and any question that needs an owner decision
     before the work continues.

It's not only AARs. closedtab new also writes decision records (ADR), sprint
handoffs (state, what's open, what not to touch, owner questions), and forward
proposals. Pick the shape that fits the work.

Three habits that make these worth re-reading:

  - Be concrete. Exact paths, commits, line ranges. Vague notes rot.
  - Record who decided. Owner vs. agent vs. joint is the human-agent signal.
  - Leave breadcrumbs. The next agent inherits your open hooks and your gotchas.

Get started:

  closedtab new          Walks you through one, question by question, and writes
                         a dated, prefixed file (aar-*, adr-*, handoff-*, ...).
  closedtab check FILE   Scores a doc on whether it left the right breadcrumbs.

Later, once you have these docs and a record of what actually happened,
closedtab reconcile checks the claims against the run: done vs. requested vs.
left. Writing them is the whole point; the checking is the payoff.
`;
