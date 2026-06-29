# WHY

## The problem

We delegate work to agents and then read their account of it. The account — the
After-Action Report — is written by the same actor whose work it describes. When
the account and the work diverge, nothing catches it. The agent that misremembers
"I left `app.py` untouched" while having written to `app.py`, or claims "the suite
passed" when no suite ran, produces testimony that reads exactly like testimony
that's true.

This tool answers one question and only one: **does the account of the run match
the run.** It takes the testimony (the AAR) and a trace (a normalized machine
record of what actually happened) and reports the deltas. It is a deviation
logger for delegated agent work.

## What it deliberately is not

It does not score risk. It does not grade the agent. It does not decide whether a
deviation was dangerous, acceptable, or worth escalating. Those are real and
separate jobs; conflating them with reconciliation would make the reconciliation
less trustworthy, because you'd be tempted to soften a contradiction to avoid a
scary score. Here a contradiction is just a finding — flat, mechanical, logged.
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
(paraphrased claims, semantic equivalence). The code leaves a marked seam for it
— `// v0 heuristic — LLM-assisted extraction plugs in here` — behind the same
`ExtractedClaim × TraceEvent` interface, so it can be added without the
deterministic core losing its legibility.

## Built against real AARs, not an idealized schema

Real AARs use freeform, task-specific headers — "What bit me", "The fix", "What I
did NOT do", "Files touched", "TL;DR". So the parser is header-agnostic: it pulls
claims from prose under whatever headings exist, and uses headings only as
section-origin *hints*.

Three sections do real work in reconciliation, so they're detected by matching
their naming variants:

- **intent** — the human's ask.
- **claimed_actions** — what the AAR says was done.
- **negative_space** — what was deliberately not done. This one is the
  distinctive part of these reports, and it's where the highest-value finding
  lives: testimony that says "I did *not* touch X" while the trace shows X was
  touched.

The variant lists weren't guessed. They were finalized from a heading-frequency
table built over the whole corpus (~280 `aar-*.md` files across two projects).
`npm run corpus-report` regenerates that table and writes `unmapped-headings.json`
— every heading the parser still files under "other". A heading that recurs there
is the signal to extend the lists. The recurring ones today (`validation`,
`verification`, `tl;dr`, `why`, `context`) are genuinely supporting prose, not
anchors — which is the parser showing it generalizes.

## The anchors are exact identifiers

Real AARs are dense with file paths (`o27v2/web/app.py`), line ranges
(`1626-1648`), commit hashes (`b1787ef`), PR numbers (`#73`), branch names, and
function names (`_pick_decisions`). Those identifiers are what make a claim
checkable against an event, so extracting them cleanly is the highest-value part
of the parser — and the most heavily tested, against real identifier strings
pulled from the corpus.

## On the trace side

The corpus gives us real testimony but no traces. So in v0 the testimony is
tested against real data while traces stay synthetic fixtures (`examples/`). The
fixtures are the spec: each is a testimony + trace + the exact diff the core must
produce. A vendor trace adapter — turning real agent logs into the canonical
`TraceEvent` shape — is the next milestone, after which the trace side gets the
same real-data treatment the testimony side already has.
