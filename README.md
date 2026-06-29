# closedtab: docs for human-agent teams

When a person and one or more AI agents do work across a sprint, the work needs
a memory: what was asked, what the agent did, what got decided and by whom, what
was deliberately left, and where the next agent should pick up. closedtab writes
those docs and keeps them in a shape the whole team (future agents and past ones)
can follow. Write one for every useful segment of work: a bug fix, a feature, a
tuning pass, a decision, an end-of-session handoff. Many people do it every PR.

The name is the idea: closing the tab on a segment of work means writing down
what happened, so the next tab can open where this one left off.

```
npm install -g closedtab
```

## Start here: write one

```
closedtab new
```

It picks a template, asks you a few questions, and writes a dated, prefixed file
(`aar-<slug>.md`, `adr-<slug>.md`, `handoff-<slug>.md`, ...):

```markdown
# AAR: fix pitcher W/L
**Date:** 2026-06-29 · **Branch:** `claude/fix-wl` · **Commit:** `b1787ef`

## What was reported
Every pitcher rendered with a (W) or (L) in the box score.

## Root cause
`_aggregate_pitcher_rows` copied season W/L totals onto each per-game row.

## The fix
Read the per-game decision in `o27v2/web/app.py` instead of the season map.

## Decisions and follow-ups
<!-- Deliberate choices, who made them (owner/agent/joint), and gaps left on purpose. -->

## Verified
Ran `pytest o27v2/tests`; box score now shows one (W) and one (L).
```

Skip any section you have nothing for; a skipped section keeps its guidance as a
comment, so the file still teaches what goes there. It auto-fills the branch and
commit from git when you are in a repo.

## Why bother

```
closedtab guide      # the practice, and why it pays off for a human-agent team
```

The short version: across a stack of human-agent sprints, the doc is the shared
memory. The section that ages best is decisions and follow-ups: it records which
choices were deliberate, who made them, and which gaps are known, so the next
agent builds on the work instead of relitigating it. The "for the next agent"
section is the breadcrumb trail: open hooks, gotchas, what not to touch. Keep a
`docs/` folder of these and the project carries its own history.

## Templates

`closedtab new` ships seven shapes (pick at the prompt, or pass `--type`). The
first four are AARs; the rest are the other docs a human-agent team leaves.

| Type | For | Writes |
|---|---|---|
| `generic` | any segment of work (default) | `aar-*.md` |
| `bugfix` | a fix: reported, root cause, fix, decisions, verified | `aar-*.md` |
| `feature` | new work: built, design decisions, verified, next agent | `aar-*.md` |
| `investigation` | a look into something: findings, verdicts, follow-ups | `aar-*.md` |
| `adr` | a design/architecture decision: context, decision, alternatives, decided-by | `adr-*.md` |
| `handoff` | end-of-sprint state transfer: current state, what's open, what not to touch | `handoff-*.md` |
| `proposal` | a forward-looking feature request: what, why, scope, open questions | `proposal-*.md` |

## Check a doc

```
closedtab check ./docs/aar-fix-pitcher-wl.md
```

Scores a doc on whether it left the breadcrumbs a human-agent team needs: a
scope/ask, a rationale, a delegation record (who decided), validation, negative
space (what wasn't done), and residual risks. It's a nudge, not a gate.

## Reconcile

```
closedtab reconcile --testimony ./aar.md --trace ./trace.jsonl --out ./diff.json
```

Once you have a doc and a record of what the agent actually did, reconcile checks
the claims against the run: where they agree, where the doc claims more than the
trace shows, where the trace shows work the doc omitted, and any direct
contradictions. Done vs. requested vs. left, made checkable.

## Library and MCP

Everything is a thin wrapper over a pure core.

```javascript
import { renderAar, TEMPLATES, checkDoc, reconcileText } from "closedtab";
```

Published unscoped (`npm i closedtab`).

```
npm login
npm publish        # runs prepublishOnly: clean, build, test, then ships dist/
```

Later releases: `npm version patch`, push the tag, and a GitHub Action publishes
via trusted publishing (OIDC), no token needed (`.github/workflows/publish.yml`).

## Develop

```
npm install
npm test                # vitest
npm run build           # tsc to dist/
npm run corpus-report   # heading-frequency report over a local doc corpus
```

Local and deterministic: no network, no API key. The reconcile matcher is plain
TS with a marked seam (`// v0 heuristic: LLM-assisted extraction plugs in later`)
for an optional LLM mode later.

More on the philosophy in `WHY.md`.
