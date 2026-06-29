# closedtab: review the work your AI agents do

An AI agent finishes a task. closedtab helps you review what it did and keep a
record. The record is a short, comparable artifact built around one idea:
outputs are easy to measure, judgment is hard. It surfaces the decisions the
agent made on its own, the moments a human should have been in the loop, the
places it was confidently wrong, and what that cost or risked.

It works best when you stay hands-on: you as the product owner, agents as
engineer or PM. Run it feature by feature, on the work you are steering. Read the
records across many runs, where patterns in the Deviation and Change sections
tell you more than any single review.

```
npm install -g closedtab
```

## The Agent Action Record

```
closedtab new
```

It scaffolds a dated **Agent Action Record** to fill in: a six-part review of one
agent run.

| Part | What it captures |
|---|---|
| **Intent** | the instruction, how success was defined, the authority the agent had, what was out of scope |
| **Action** | what it did (from logs), what it produced, where it diverged, whether it stayed within authority |
| **Judgment** | the decisions it made alone, which a human should have seen, where it should have escalated, who is accountable |
| **Deviation** | the gaps and their root cause, the good deviations, the confidently-wrong |
| **Consequence** | the outcome, the harm or cost or risk, who was affected, the expected failure at 100 runs |
| **Change** | what changes before the next run, what to keep, what belongs with a human, the signal it worked |

The `record-template.md` in this repo is the same form by hand: work through the
six sections in order, no AI required, and keep the record.

## Score a record

```
closedtab check ./docs/aar-fall-portal.md
```

Scores a record on whether it surfaced the things that matter: the intent, the
reasoning, who decided, how it held up, the deviations, and the risks carried
forward.

## Reconcile against a trace

```
closedtab reconcile --testimony ./aar.md --trace ./trace.jsonl --out ./diff.json
```

Lines a record up against a machine trace of what the agent actually did. Intent
and Action go in; the Deviation falls out: where they agree, where the record
claims more than the trace shows, where the trace shows work the record omits,
and any direct contradiction.

## Task docs too

`closedtab new --type bugfix` (also `feature`, `adr`, `handoff`) writes lighter
task docs for the same human-agent team, each to its own prefix (`aar-*`,
`adr-*`, `handoff-*`). The Agent Action Record is the default and the point.

## Let the agent review its own run (MCP)

```json
{ "mcpServers": { "closedtab": { "command": "closedtab-mcp" } } }
```

That gives the agent four tools: `list_templates`, `new_doc`, `check`, and
`reconcile`. The agent finishes a segment, writes the record of what it just did,
checks it, and saves it alongside the change.

## Library

```javascript
import { renderAar, TEMPLATES, checkDoc, reconcileText } from "closedtab";
```

## Publish and develop

```
npm publish             # runs prepublishOnly: clean, build, test, ships dist/
npm test                # vitest
npm run build           # tsc to dist/
```

Local and deterministic: it needs only Node. The record format comes from the
Agent After-Action Review skill (github.com/quarterback/AAR), here under MIT.
More on the thinking in `WHY.md`.
