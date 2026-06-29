# closedtab: write After-Action Reports

An After-Action Report (AAR) is a two-minute note you write when you finish a
chunk of work: what was asked, what you did, why you did it that way, and the
decisions worth remembering. closedtab gives you the structure and walks you
through it, so writing them becomes a habit instead of a chore.

The name is the idea: closing the tab on a task means writing down what happened.

```
npm install -g closedtab
```

## Start here: write one

```
closedtab new
```

It asks you a few questions and writes a dated `aar-<slug>.md`:

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
<!-- The part that ages well: deliberate choices, known gaps, deferred follow-ups. -->

## Verified
Ran `pytest o27v2/tests`; box score now shows one (W) and one (L).
```

Skip any section you have nothing for; a skipped section keeps its guidance as a
comment, so the file still teaches you what goes there. It auto-fills the branch
and commit from git when you are in a repo.

## Why bother

```
closedtab guide      # a short how-to on writing AARs and why they pay off
```

The short version: an AAR is the cheapest memory a project has. The section that
ages best is decisions and follow-ups. It tells the next person (often you, a
month later) which choices were deliberate and which gaps are known, so they
build on the work instead of relitigating it. Keep a `docs/` folder of
`aar-*.md` files and it becomes a real record of how the project got here.

## Templates

`closedtab new` offers four shapes (pick at the prompt, or pass `--type`):

| Type | For | Sections |
|---|---|---|
| `generic` | any task (the default) | asked · changed · decisions · verified |
| `bugfix` | a fix | reported · root cause · the fix · decisions · verified |
| `feature` | new work | asked · built · design decisions · verified |
| `investigation` | a look into something | question · found · bug vs intended · follow-ups · notes |

## Reconcile

```
closedtab reconcile --testimony ./aar.md --trace ./trace.jsonl --out ./diff.json
```

`closedtab reconcile` compares an AAR against a run trace and reports four things:
where they agree, where the AAR claims more than the trace shows, where the trace
shows work the AAR omitted, and any direct contradictions.

## Library and MCP

Everything is a thin wrapper over a pure core.

```javascript
import { renderAar, TEMPLATES, reconcileText } from "closedtab";
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
npm test                # vitest, 74 tests
npm run build           # tsc to dist/
npm run corpus-report   # heading-frequency report over a local AAR corpus
```

Local and deterministic: no network, no API key. The reconcile matcher is plain
TS with a marked seam (`// v0 heuristic: LLM-assisted extraction plugs in here`)
for an optional LLM mode later.

More on the philosophy in `WHY.md`.
