// The guide printed by `closedtab guide`. Teaches the Agent Action Record:
// a manager-led review of agent work, judgment over outputs.

export const GUIDE = `Running an Agent Action Record

An AI agent finishes a task. closedtab helps you review what it did and keep a
record: a short, comparable artifact built around one idea. Outputs are easy to
measure, and judgment is hard. The review surfaces the decisions the agent made on
its own, the moments a human should have been in the loop, the places it was
confidently wrong, and what that cost or risked.

It works best when you stay hands-on: you as the product owner, agents as
engineer or PM. Run it feature by feature, on the work you are steering. Across
many runs, the patterns in the Deviation and Change sections tell you more than
any single review.

The six parts:

  1. Intent — what was supposed to happen
     The instruction (actual wording), how success was defined, the authority the
     agent had to act on its own, and what fell out of scope.

  2. Action — what actually happened
     What the agent did (from logs where you have them), what it produced or
     changed, where it diverged, and whether it stayed within its authority.

  3. Judgment — human in the loop
     The decisions the agent made alone, which of those a human should have made
     or seen, where a human stepped in, where it should have escalated, and who
     is accountable. This is the part that matters most.

  4. Deviation — the gaps
     The gaps between intent and action, and the root cause. The good deviations
     (correct departures from a flawed instruction). The confidently-wrong.

  5. Consequence — what it cost or risked
     The actual outcome, the harm or cost or risk, who was affected downstream,
     and the expected failure if this run happened 100 times.

  6. Change — what happens next
     What changes before the next run, what to keep doing, what belongs with a
     human rather than an agent, and the signal that the change worked.

Get started:

  closedtab new          Scaffold a blank Agent Action Record to fill in.
  closedtab check FILE   Score a record on whether it surfaced the right things.
  closedtab reconcile    Line a record up against a trace of what the agent did.

The record-template.md is a plain form too: work through the six sections by
hand, no AI required, and keep the record.
`;
