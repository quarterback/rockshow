// The "how to write AARs" explainer, printed by `closedtab guide`. Teaches the
// practice, not just the format. The point of the tool is the habit.

export const GUIDE = `How to write an After-Action Report (AAR)

An AAR is a short note you write when you finish a chunk of work: a bug fix, a
feature, an investigation, a weekend hack. It records what was asked, what you
did, why you did it that way, and the decisions worth remembering. It takes two
minutes and it is the cheapest memory a project has.

You don't need a process or a team. Write one for yourself. The habit is the
point: once you have a few, you'll wonder how you worked without them.

The shape (headers are freeform; these are just the load-bearing parts):

  1. What was asked for
     The request in the asker's own words (even if the asker was you).

  2. What changed
     What you actually did. Name files with exact paths, commits, PRs. The
     specifics are what make it findable and checkable later.

  3. Decisions and follow-ups
     The section that ages best. The choices you made on purpose, the gaps you
     already know about, the follow-ups you're leaving for later. It tells the
     next person which decisions were deliberate, so they build on the work
     instead of relitigating it. This is exactly how a good CLAUDE.md reads: a
     list of deliberate calls, labeled so nobody reverts them by accident.

  4. Verified
     How you know it works: tests you ran, what you checked by hand. "Didn't
     verify X" is a perfectly good, useful answer.

Three habits that make AARs worth re-reading:

  - Be concrete. "Fixed the bug" tells you nothing in six months. "Changed the
    decision map in app.py to read per-game W/L instead of season totals" does.
  - Record the why. The decisions section is where the real value lives.
  - Keep them together. A docs/ folder of aar-*.md files becomes a real record
    of how the project got here.

Get started:

  closedtab new          Walks you through one, question by question, and writes
                         a dated aar-<slug>.md file.

Later, once you have AARs and a record of what actually happened, closedtab can
reconcile the two. That's a bonus. Writing them is the whole point.
`;
