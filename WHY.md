# WHY

## Who this is for: human-agent teams

`closedtab` is built for human-agent teams. A person and one or more AI agents do
work across a sprint, or a stack of sprints, and that work needs a memory the
whole team can carry: the human, the agent that did this segment, the agent that
picks up the next one, and the agent re-reading it three sprints later. These are
not human-human retrospectives; those exist and are a different thing. This is the
shared record a human-agent team leaves so the next tab opens where the last one
closed.

## Start with the habit, not the audit

`closedtab` is two things, in order of importance. First and foremost it helps the
team **write** these docs, because almost nobody does, and the practice is worth
more than any tool built on top of it. A doc is a two-minute note at the end of a
segment of work: what the owner asked, what the agent did, why it was done that
way, and the decisions worth remembering. Writing them is the whole point; the
structure and the guided prompts exist to lower the friction until it's a habit.

Two sections carry the human-agent signal. **Decisions and follow-ups** records
the deliberate choices and *who made them*, owner or agent or joint, which is the
thing a future agent most needs and most often lacks. **For the next agent** is
the breadcrumb trail: the open hooks left in the code, the gotchas burned in
during the build, and what not to touch. That is exactly how a good `CLAUDE.md`
reads, a list of deliberate calls labeled so nobody reverts them by accident.

The second thing, reconciliation, only makes sense once the first exists. It
presupposes you *have* docs to check. If nobody writes them, an audit tool has no
input. So authoring is the front door, and the rest of this document is about the
audit layer you grow into later.

## The audit layer: does the account match the run

We delegate work to agents and then read their account of it. The account, the
After-Action Report, is written by the same actor whose work it describes. When
the account and the work diverge, nothing catches it. The agent that misremembers
"I left `app.py` untouched" while having written to `app.py`, or claims "the suite
passed" when no suite ran, produces testimony that reads exactly like testimony
that's true.

`closedtab reconcile` answers one question and only one: **does the account of the
run match the run.** It takes the testimony (the AAR) and a trace (a normalized
machine record of what actually happened) and reports the deltas. It is a
deviation logger for delegated agent work.

## What it deliberately is not

It does not score risk. It does not grade the agent. It does not decide whether a
deviation was dangerous, acceptable, or worth escalating. Those are real and
separate jobs; conflating them with reconciliation would make the reconciliation
less trustworthy, because you'd be tempted to soften a contradiction to avoid a
scary score. Here a contradiction is just a finding: flat, mechanical, logged.
Judgment lives in other tools that can consume this diff.

That is also why a contradiction is not a CLI error. The tool succeeding means it
*produced the diff*, not that the diff is clean.

## Why deterministic, local, no LLM (in v0)

The thing checking the agent's testimony shouldn't itself be an opaque generator
of plausible-sounding text. v0 matches claims to events with plain, readable
rules: an exact file path against a `file_write` target is a high-confidence
match; a substring is medium; a lone verb is low. An engineer can read
`matchLevel()` and see exactly why a claim matched an event. No network, no API
key, no nondeterminism.

An LLM-assisted matching mode is a sensible *later* addition for the fuzzy middle
(paraphrased claims, semantic equivalence). The code leaves a marked seam for it,
`// v0 heuristic: LLM-assisted extraction plugs in here`, behind the same
`ExtractedClaim` x `TraceEvent` interface, so it can be added without the
deterministic core losing its legibility.

## Built against real AARs, not an idealized schema

Real AARs use freeform, task-specific headers: "What bit me", "The fix", "Files
touched", "Decisions and follow-ups", "TL;DR". So the parser is header-agnostic:
it pulls claims from prose under whatever headings exist, and uses headings only
as section-origin *hints*.

Three sections do real work in reconciliation, so they're detected by matching
their naming variants:

- **intent**: the human's ask.
- **claimed_actions**: what the AAR says was done.
- **negative_space**: what was deliberately not done or deferred. The parser
  still recognizes the older "what I did not do" phrasing as well as the
  decisions-and-follow-ups framing, because both appear across real AARs, and a
  deferred follow-up is exactly the kind of claim worth checking against the run.

The variant lists weren't guessed. They were finalized from a heading-frequency
table built over the whole corpus (~280 `aar-*.md` files across two projects).
`npm run corpus-report` regenerates that table and writes `unmapped-headings.json`,
every heading the parser still files under "other". A heading that recurs there is
the signal to extend the lists. The recurring ones today (`validation`,
`verification`, `tl;dr`, `why`, `context`) are genuinely supporting prose, not
anchors, which is the parser showing it generalizes.

## The anchors are exact identifiers

Real AARs are dense with file paths (`o27v2/web/app.py`), line ranges
(`1626-1648`), commit hashes (`b1787ef`), PR numbers (`#73`), branch names, and
function names (`_pick_decisions`). Those identifiers are what make a claim
checkable against an event, so extracting them cleanly is the highest-value part
of the parser, and the most heavily tested, against real identifier strings
pulled from the corpus.

## On the trace side

The corpus gives us real testimony but no traces. So in v0 the testimony is
tested against real data while traces stay synthetic fixtures (`examples/`). The
fixtures are the spec: each is a testimony plus trace plus the exact diff the core
must produce. A vendor trace adapter, turning real agent logs into the canonical
`TraceEvent` shape, is the next milestone, after which the trace side gets the
same real-data treatment the testimony side already has.
