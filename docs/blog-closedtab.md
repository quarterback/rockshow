# closedtab: a shared memory for you and your AI agents

You and your AI agents ship a lot of work. A bug fix here, a feature there, a
design decision, a tuning pass, a handoff at the end of a long session. Each one
is a small story worth keeping. closedtab helps you write that story down in
about two minutes, so the whole team carries the same memory forward.

The name says the idea: when you close the tab on a piece of work, you leave a
note, and the next tab opens right where this one ended.

## Why it exists

Agents move fast and work across many sessions. You set a direction, an agent
builds a piece, another agent picks up the next piece, and weeks later someone
reopens the project to add more. Everyone in that chain reads better when there
is a short record of what happened: what you asked for, what the agent built,
which calls were deliberate and who made them, how it was checked, and what the
next agent should know.

That record is the point. Write it once, and future-you, the next agent, and the
agent re-reading it three sprints later all share the same trail. closedtab gives
the record a consistent shape so it stays quick to write and easy to read.

Two parts of each doc earn their keep:

- **Decisions and follow-ups** holds the choices you made on purpose, who made
  them (you, the agent, or both together), and the gaps you already know about.
  This is the part a future agent reads first.
- **For the next agent** holds the breadcrumbs: the open hooks left in the code,
  the gotchas learned along the way, the parts to keep stable, and any question
  that needs your call.

## What you'd use it for

Write one for any segment of work the team will want to remember:

- A **bug fix**: what was reported, the root cause, the fix, how you verified it.
- A **feature** you built: what shipped, the design decisions, what comes next.
- A **decision** worth recording (an ADR): the context, the decision, the
  alternatives you weighed, and who made the call.
- An **end-of-sprint handoff**: the current state, where to pick up, the parts to
  keep stable, and the open questions for you.
- A **proposal** for new work: what you want, why, the scope, the open questions.

Many teams write one per pull request. Over time you get a `docs/` folder of small
docs that together tell the whole history of the project.

## How to use it: the command line

Install it once:

```
npm install -g closedtab
```

Write a doc by answering a few questions:

```
closedtab new
```

It picks a template, asks you a handful of questions, fills in the date, branch,
and commit from git, and writes a dated file like `aar-fix-pitcher-wl.md`. Fill
the sections you have; leave the rest for later, and the guidance stays in the
file to help you finish it. A completed one reads like this:

```markdown
# AAR: fix pitcher W/L

**Date:** 2026-06-29 · **Branch:** `claude/fix-wl` · **Commit:** `b1787ef`

## What was reported
Every pitcher rendered with a (W) or (L) in the box score.

## Root cause
`_aggregate_pitcher_rows` copied season W/L totals onto each per-game row.

## The fix
Read the per-game decision in `o27v2/web/app.py`.

## Decisions and follow-ups
Owner-directed: keep the season map. I inferred the display fix; flagged for you
to sanity-check. Follow-up: the seconds column, left for a later pass.

## Verified
Ran `pytest o27v2/tests`; the box score shows one (W) and one (L).
```

Read the short guide any time:

```
closedtab guide
```

Score a doc to see how complete it is. closedtab looks for six things a
human-agent team relies on: the scope, the why, who decided, how it was verified,
the follow-ups, and the known risks:

```
closedtab check ./docs/aar-fix-pitcher-wl.md
```

```
score: 5/6

  ✓ scope / the ask
  ✓ rationale (the why)
  ✓ delegation record (who decided)
  ✓ validation
  ✓ follow-ups and known gaps
  ✗ residual risks

to strengthen it:
  - Name the known gaps, risks, or open questions carried forward.
```

And once you have a doc plus a record of what the agent actually did, line them
up:

```
closedtab reconcile --testimony ./aar.md --trace ./trace.jsonl
```

reconcile reports four things: the claims the run confirms, the claims that still
want evidence, the actions in the run that are worth adding to the doc, and any
place where the doc and the run tell different stories. It runs locally and reads
plainly; it needs only Node.

## How to use it: MCP (let the agent write its own docs)

closedtab also runs as an MCP server, so an agent can write and score its own docs
as part of doing the work. Point your MCP client at it:

```json
{
  "mcpServers": {
    "closedtab": {
      "command": "closedtab-mcp"
    }
  }
}
```

That gives the agent four tools:

- `list_templates` returns the templates and the sections each one asks for, so
  the agent learns the shape.
- `new_doc` takes a template, a title, and a map of section content, and returns
  the finished markdown plus the filename to save it to.
- `check` takes the markdown and returns the score and the suggestions.
- `reconcile` takes the doc and a run trace and returns where they line up.

A typical loop: the agent finishes a segment of work, calls `new_doc` to write the
AAR with everything it just did, calls `check` to confirm it left the right
breadcrumbs, and saves the file alongside the change. The human reads a clean,
consistent record, and the next agent inherits it.

## Start tonight

Pick the last thing you shipped and write one doc about it:

```
npm install -g closedtab
closedtab new
```

Two minutes, and the next tab opens where this one ended.
