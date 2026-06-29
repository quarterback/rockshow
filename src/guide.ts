// The "how to write AARs" explainer, printed by `closedtab guide`. Teaches the
// practice, not just the format — the point of the tool is the habit.

export const GUIDE = `How to write an After-Action Report (AAR)

An AAR is a short note you write when you finish a chunk of work — a bug fix, a
feature, an investigation, a weekend hack. It records what was asked, what you
did, and (most importantly) what you deliberately did NOT do. It takes two
minutes and saves future-you an hour of "wait, did I already try that?"

You don't need a process or a team. Write one for yourself. The habit is the
point: once you have a few, you'll wonder how you worked without them.

The shape (headers are freeform — these are just the load-bearing parts):

  1. What was asked for
     The request in the asker's own words (even if the asker was you).

  2. What changed
     What you actually did. Name files with exact paths, commits, PRs — the
     specifics are what make it findable and checkable later.

  3. What I did NOT do
     The honest part, and the most valuable. Deliberate non-changes, follow-ups
     you're punting, things you didn't get to or chose to skip. This is what
     stops the next person (or future-you) from guessing.

  4. Validation
     How you know it works: tests you ran, what you checked by hand. "Didn't
     verify X" is a perfectly good, useful answer.

Three habits that make AARs worth re-reading:

  - Be concrete. "Fixed the bug" tells you nothing in six months. "Changed the
    decision map in app.py to read per-game W/L instead of season totals" does.
  - Be honest about gaps. The value is in what you admit you didn't do.
  - Keep them together. A docs/ folder of aar-*.md files becomes a real memory
    of a project.

Get started:

  closedtab new          Walks you through one, question by question, and writes
                         a dated aar-<slug>.md file.

Later, once you have AARs and a record of what actually happened, closedtab can
reconcile the two — but that's a bonus. Writing them is the whole point.
`;
