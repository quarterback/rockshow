# closedtab — write After-Action Reports

An **After-Action Report (AAR)** is a two-minute note you write when you finish a
chunk of work: what was asked, what you did, and — the part everyone skips —
what you deliberately *didn't* do. `closedtab` gives you the structure and walks
you through it, so writing them becomes a habit instead of a chore.

The name is the idea: closing the tab on a task means writing down what happened.

```bash
npm install -g closedtab
```

## Start here: write one

```bash
closedtab new
```

It asks you a few questions and writes a dated `aar-<slug>.md`:

```markdown
# AAR — fix pitcher W/L

**Date:** 2026-06-29 · **Branch:** `claude/fix-wl` · **Commit:** `b1787ef`

## What was reported

Every pitcher rendered with a (W) or (L) in the box score.

## Root cause

`_aggregate_pitcher_rows` copied season W/L totals onto each per-game row.

## The fix

Read the per-game decision in `o27v2/web/app.py` instead of the season map.

## What I did NOT do / follow-ups

<!-- The honest part: deliberate non-changes, deferred follow-ups, known gaps. -->

## Validation

Ran `pytest o27v2/tests`; box score now shows one (W) and one (L).
```

Skip any section you don't have yet — a skipped section keeps its guidance as a
comment, so the file still teaches you what goes there. It auto-fills the branch
and commit from git if you're in a repo.

## Why bother

```bash
closedtab guide      # a short how-to on writing AARs and why they're worth it
```

The short version: future-you has no memory of today. An AAR is the cheapest way
to leave one. The most valuable section is **what you did NOT do** — it's what
stops the next person (often you, in a month) from wondering whether you missed
something or chose to skip it. Keep a `docs/` folder of `aar-*.md` files and it
becomes a real memory of a project.

## Templates

`closedtab new` offers four shapes (pick at the prompt, or pass `--type`):

| Type | For | Sections |
| --- | --- | --- |
| `generic` | any task (the default) | asked · changed · **not done** · validation |
| `bugfix` | a fix | reported · root cause · the fix · **not done** · validation |
| `feature` | new work | asked · built · design decisions · **not done** · validation |
| `investigation` | a look into something | question · found · bug-vs-intended · follow-ups · notes |

```bash
closedtab new "speed up standings" --type bugfix --dir docs
```

## Later: check an AAR against what actually happened

Once you're writing AARs *and* you have a machine record of a run (a trace),
`closedtab reconcile` checks one against the other — where they agree, where the
AAR claims things the trace doesn't support, where the trace shows work the AAR
never mentions, and direct contradictions ("left `app.py` untouched" while the
trace shows a write to it). This is the advanced layer; you don't need it to get
value from writing AARs.

```bash
closedtab reconcile --testimony ./aar.md --trace ./trace.jsonl --out ./diff.json
```

<details>
<summary>Trace format & sample diff</summary>

A trace is a JSON array or JSONL (one event per line):

```jsonc
{
  "id": "ev-3",
  "actor": "agent",                  // agent | human | tool | system
  "kind": "file_write",              // prompt | tool_call | file_read | file_write |
                                     // command | git_diff | test | network | decision | error | note
  "summary": "adjust decision map wiring in game_detail",
  "target": "o27v2/web/app.py"       // a path, a command, or a URL
}
```

The diff reports `claimed_actions`, `unsupported_claims`, `omitted_actions`,
`contradicted_claims`, `evidence_gaps`, a `status` (`aligned` · `partial` ·
`contradicted` · `insufficient_trace`), and a `review` block with follow-up
questions. See `examples/` for runnable fixtures.

</details>

## Library and MCP

Everything is a thin wrapper over a pure core.

```ts
import { renderAar, TEMPLATES, reconcileText } from "closedtab";
```

The MCP stdio server exposes `reconcile` as a tool:

```bash
npm run mcp        # or: node dist/mcp.js
```

## Deploy the reconcile endpoint (Vercel / Netlify)

The reconcile core is pure and network-free, so it drops into a serverless
function. This repo ships both, plus a one-page paste-and-diff UI
(`public/index.html`), exposing `POST /api/reconcile` with `{ testimony, trace }`.

- **Vercel** — `vercel deploy` (or connect the repo); config is in `vercel.json`.
- **Netlify** — `netlify deploy` (or connect the repo); config is in `netlify.toml`.

## Publish to npm

Published as **`closedtab`** (unscoped — `npm i closedtab`).

```bash
npm login
npm publish        # runs prepublishOnly: clean -> build -> test, then ships dist/
```

Later releases: `npm version patch` → push the tag → a GitHub Action publishes via
trusted publishing (OIDC), no token needed (`.github/workflows/publish.yml`).

## Develop

```bash
npm install
npm test                # vitest — 74 tests
npm run build           # tsc -> dist/
npm run corpus-report   # heading-frequency report over a local AAR corpus
```

Local and deterministic — no network, no API key. The reconcile matcher is plain
TS with a marked seam (`// v0 heuristic — LLM-assisted extraction plugs in here`)
for an optional LLM mode later.

More on the philosophy in [WHY.md](./WHY.md).
