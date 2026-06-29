# What the hell is going on in this repo

A plain-English orientation. If you come back to this in three months and think
"wait, what is closedtab and what state is it in," start here.

## The one-sentence version

**closedtab helps you write After-Action Reports — short notes about what you
did on a task — and (later, optionally) check those notes against a record of
what actually happened.**

If someone asks "what is it," say: *"It's a little tool that makes you write a
two-minute wrap-up when you finish a task, so future-you isn't guessing. It gives
you the structure and walks you through it."* That's the pitch. The audit half is
a footnote until people are actually writing AARs.

## Why it exists

You write AARs in your repos and they're useful. Almost nobody else does, because
a blank page is friction. closedtab removes the friction: it asks you questions
and writes the file. The bet is that the *habit* is the valuable thing, and the
tool's job is to make starting the habit trivial.

There's a second, fancier idea underneath — once AARs exist, you can mechanically
check an AAR ("I left app.py untouched") against a trace of what really happened
(a write to app.py) and flag the lie. That's the `reconcile` half. It's real and
it works, but it's the dessert, not the meal.

## What you can actually do with it

It's a command-line tool (plus some other surfaces). The three commands:

| Command | What it does |
| --- | --- |
| `closedtab new` | Walks you through writing an AAR, question by question, and saves a dated `aar-<slug>.md`. **The main thing.** |
| `closedtab guide` | Prints a short how-to on writing AARs and why they matter. |
| `closedtab reconcile --testimony aar.md --trace trace.jsonl` | The audit step: compares an AAR to a machine record of a run and reports the mismatches. |

`closedtab new` offers four templates — `generic` (default), `bugfix`, `feature`,
`investigation` — each a set of sections with built-in guidance. Every one
includes a "what I did NOT do" section, because that's the part worth the most.
Skip a section and the file keeps its guidance as a comment so you can fill it in
later.

## The other surfaces (same engine, different doors)

All of these call the same core code:

- **CLI** — what you'd normally use (`closedtab ...`).
- **Library** — `import { renderAar, reconcileText } from "closedtab"` to use it
  in code.
- **MCP server** — exposes `reconcile` as a tool for AI agents (`node dist/mcp.js`).
- **Web app** — Vercel/Netlify serverless function + a paste-two-boxes-get-a-diff
  page (`public/index.html`), for the reconcile feature. This is the part that's
  not deployed-green yet (see below).

## Where the code lives

It's a TypeScript / Node package. The important bits:

- `src/templates.ts` — the four AAR templates (sections + guidance text).
- `src/renderAar.ts` — turns answers into a markdown AAR file (pure, tested).
- `src/newCommand.ts` — the interactive `closedtab new` flow.
- `src/guide.ts` — the how-to text.
- `src/reconcile.ts`, `src/parseAar.ts`, `src/entities.ts`, `src/anchors.ts` —
  the audit engine (parses an AAR into claims, parses a trace, matches them).
- `src/cli.ts` — the command dispatcher. `src/mcp.ts` — the MCP server.
- `api/` + `netlify/` + `public/` + `vercel.json` + `netlify.toml` — the web deploy.
- `examples/` — runnable reconcile fixtures (these double as the test spec).
- `test/` — 74 tests. `npm test` runs them.
- `scripts/corpus-report.ts` — regenerates a heading-frequency report from your
  real AAR corpus (how the templates were derived).

Build with `npm run build` (compiles `src/` → `dist/`). The published package
ships only `dist/` + the docs.

## Current state (as of 2026-06-29)

- **On npm:** `closedtab@0.1.0` is **published and live** — but that's the
  *reconcile-only* version, before authoring existed. `npm i -g closedtab` works
  and gives you the old feature set.
- **Authoring (`new`/`guide`) is version `0.2.0`** — built, tested, committed,
  **but NOT published to npm yet.** To get it live you publish 0.2.0.
- **GitHub:** repo is `quarterback/closedtab`.
  - **PR #1** (the v0 reconcile tool + deploy + naming) — **merged** into `main`.
  - **PR #2** (open) — started as the Vercel build fix, but now also contains the
    npm publishing workflow *and* the 0.2.0 authoring feature, because it was all
    pushed to the same branch. So merging #2 lands authoring on `main` too.
- **Vercel deploy:** not green yet. The first build failed on a bad `vercel.json`
  setting; the fix is sitting in unmerged PR #2.
- **npm auto-publishing:** a GitHub Action for token-free publishing (OIDC
  "trusted publishing") exists at `.github/workflows/publish.yml`, set up but not
  exercised.

## What's left / loose ends

1. **Publish 0.2.0** so the authoring feature is actually installable.
2. **Sort out PR #2** — it's a grab-bag; consider splitting or at least retitling
   it, then merge so (a) Vercel goes green and (b) authoring reaches `main`.
3. **Trace adapter** — reconcile still runs on hand-made trace fixtures; there's
   no converter from real agent logs yet.
4. **An AAR linter** — `new` creates them; nothing yet checks an existing AAR has
   the load-bearing sections.

## How to think about it

Two layers, in order of importance:

1. **Write AARs** (the habit) — this is the product. Everything should serve
   making this easy and worth doing.
2. **Check AARs** (the audit) — the payoff once the habit exists. Don't lead with
   it; it confuses people who don't yet write AARs at all.

See `docs/aar-building-closedtab.md` for the project's own AAR, and `WHY.md` for
the longer philosophy.
