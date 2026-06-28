# oi — Agent AAR Reconciliation Tool

Reconcile what an agent **said it did** (an After-Action Report) against what the
trace shows it **actually did**.

```bash
npm install -g @local/aar-reconcile
```

```bash
oi reconcile --testimony ./testimony.md --trace ./trace.jsonl --out ./diff.json
```

The AAR says it left a file untouched; the trace shows a write to it. The diff
says so:

```jsonc
{
  "status": "contradicted",
  "summary": "contradicted: 1 claimed action(s) verified, 0 unsupported, 0 omitted, 1 contradicted, 0 evidence gap(s).",
  "claimed_actions": [
    {
      "claim": "Changed `o27v2/web/box_text.py` to read the per-game decision instead of season totals",
      "matched_events": ["ev-2"],
      "confidence": "high"
    }
  ],
  "contradicted_claims": [
    {
      "claim": "Left `o27v2/web/app.py` untouched",
      "trace_evidence": ["ev-3"],
      "reason": "testimony states this was deliberately not done, but the trace shows a file_write on o27v2/web/app.py"
    }
  ],
  "review": {
    "needs_human_review": true,
    "reasons": ["the testimony contradicts the trace"],
    "recommended_next_questions": [
      "The AAR says \"Left `o27v2/web/app.py` untouched\", but the trace shows otherwise — which account is correct?"
    ]
  },
  "run_id": "run-contra"
}
```

That is the whole job: where the testimony and the trace agree, where the
testimony claims things the trace doesn't support, and where the trace shows
actions the testimony never mentions.

## What it reports

| Field | Meaning |
| --- | --- |
| `claimed_actions` | AAR claims that the trace backs up, with a `high` / `medium` / `low` confidence. |
| `unsupported_claims` | The AAR asserts work the trace has no evidence for (e.g. "ran the suite" with no test/command event). |
| `omitted_actions` | Consequential trace events (file writes, commands, diffs, network) the AAR never mentions. |
| `contradicted_claims` | The AAR says something was *not* done, but the trace shows it was — or claims a change a diff shows didn't happen. |
| `evidence_gaps` | Claims the trace format can't verify (e.g. "tests passed" but the test event records no pass/fail). |
| `status` | `aligned` · `partial` · `contradicted` · `insufficient_trace`. |
| `review` | Whether a human should look, why, and templated follow-up questions. |

## Inputs

**Testimony** — an AAR in Markdown. Headers are freeform; the parser is
header-agnostic and keys off three anchor sections detected by naming variants:
the **intent** (the ask), the **claimed actions** (what was done), and the
**negative space** (what was deliberately *not* done). The anchor variant lists
were derived from a real ~280-file AAR corpus; see `WHY.md`.

**Trace** — a normalized machine record, either a JSON array or JSONL (one event
per line). The format is auto-detected. Each event:

```jsonc
{
  "id": "ev-3",
  "actor": "agent",                  // agent | human | tool | system
  "kind": "file_write",              // prompt | tool_call | file_read | file_write |
                                     // command | git_diff | test | network |
                                     // decision | error | note
  "summary": "adjust decision map wiring in game_detail",
  "target": "o27v2/web/app.py"       // a path, a command, or a URL
  // optional: ts, run_id, input, output, evidence[], metadata{}
}
```

## Library and MCP

The CLI is a thin wrapper over a pure core; the MCP server is a second surface
over the identical `reconcile()`.

```ts
import { reconcileText, reconcile, parseAarTestimony, parseTrace } from "@local/aar-reconcile";

const diff = reconcileText(testimonyMarkdown, traceJsonlText);
```

Run the MCP stdio server (one tool, `reconcile`, params `{ testimony, trace }`):

```bash
npm run mcp        # or: node dist/mcp.js
```

## Deploy as an HTTP endpoint (Vercel / Netlify)

The core is a pure, stateless, network-free function, so it drops straight into a
serverless function. This repo ships both, plus a one-page paste-and-diff UI
(`public/index.html`). Both expose the same route, `POST /api/reconcile` with a
JSON body `{ testimony, trace }`.

```bash
curl -X POST https://<your-deployment>/api/reconcile \
  -H 'content-type: application/json' \
  -d '{"testimony":"## What I did not do\n- Left `app.py` untouched.\n","trace":"{\"id\":\"e1\",\"actor\":\"agent\",\"kind\":\"file_write\",\"summary\":\"edit\",\"target\":\"app.py\"}"}'
```

- **Vercel** — zero config beyond what's here. `vercel deploy` (or connect the
  repo). `vercel.json` runs `npm run build` and serves `public/` + `api/`.
- **Netlify** — `netlify deploy` (or connect the repo). `netlify.toml` builds,
  publishes `public/`, and redirects `/api/reconcile` to the function so the UI
  works unchanged on both.

The CLI and the **stdio** MCP server are not web services — run those locally (or
publish to npm and `npx` the CLI). A remote MCP would need the Streamable-HTTP
transport instead of stdio.

## Publish to npm

The package name in `package.json` (`@local/aar-reconcile`) is a placeholder —
`@local` is not a publishable scope. First pick a real name:

```bash
# pick ONE and set it as "name" in package.json:
#   unscoped:  aar-reconcile           (check it's free: npm view aar-reconcile)
#   scoped:    @yourname/aar-reconcile (publishConfig.access is already "public")
npm login
npm publish        # runs prepublishOnly: clean -> build -> test, then ships dist/
npm view <name>    # verify
```

Cutting later releases:

```bash
npm version patch   # or minor / major — bumps package.json and tags vX.Y.Z
git push --follow-tags
npm publish
```

After publishing, users get the CLI with `npm i -g <name>` (`oi reconcile …`) or
`npx <name> reconcile …`, and the library/MCP via `import` / `node dist/mcp.js`.

## Develop

```bash
npm install
npm test                # vitest — fixtures in examples/ ARE the spec
npm run build           # tsc -> dist/
npm run corpus-report   # regenerate unmapped-headings.json over a local corpus
```

It runs locally and deterministically — no network, no API key. v0 is
deterministic matching only; the code leaves a marked seam
(`// v0 heuristic — LLM-assisted extraction plugs in here`) for an optional
LLM-assisted matching mode later.

The philosophy lives in [WHY.md](./WHY.md).
