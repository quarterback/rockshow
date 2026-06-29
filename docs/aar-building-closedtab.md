# AAR — building closedtab

**Date:** 2026-06-29 · **Repo:** `quarterback/rockshow` · **Branch:** `claude/agent-aar-reconciliation-93fwaw` · **PRs:** #1 (merged), #2 (open)

> Written in the format the tool itself produces — this is closedtab eating its
> own dog food. It's for me; it's honest about the wrong turn.

## What was asked for

Two things, and they changed shape along the way:

1. Originally: build the **Agent AAR Reconciliation Tool** from a detailed spec —
   take an AAR (testimony) + a machine trace, report where they disagree.
2. What I actually wanted (realized partway through): a tool that gets *people*
   into the habit of **writing AARs** the way I do in my repos — structure and
   guidance, so it's a two-minute thing instead of a blank page. Reconciliation
   only matters once AARs exist, and almost nobody writes them.

## What was built

A single npm package, **`closedtab`** (unscoped), with three commands over one
pure core:

- `closedtab new` — interactive, question-by-question AAR authoring. Writes a
  dated `aar-<slug>.md`. Four templates (`generic`, `bugfix`, `feature`,
  `investigation`) modeled on my real corpus sections. Auto-fills branch/commit
  from git; won't overwrite (picks an `-N` suffix). **This is the front door.**
- `closedtab guide` — a short how-to on writing AARs and why they're worth it.
- `closedtab reconcile` — the original audit tool: AAR vs. trace → a diff of
  agreements, unsupported claims, omitted actions, contradictions, evidence gaps.

Other surfaces over the same core: a library (`import { renderAar, reconcileText }`),
an MCP stdio server (`reconcile` tool), and Vercel/Netlify serverless functions +
a paste-and-diff web UI for reconcile.

Key files: `src/templates.ts` (the four templates), `src/renderAar.ts` (pure
renderer + slugify), `src/newCommand.ts` (the interactive flow), `src/guide.ts`,
`src/reconcile.ts` + `src/parseAar.ts` + `src/entities.ts` (the audit core).

## Design decisions worth recording

- **Authoring is the product; reconcile is the bonus.** The README leads with
  `new`; reconcile is demoted to "the advanced layer you grow into." This is the
  whole reframe — a deviation logger with no AARs to log has no users.
- **Templates come from the real corpus**, not invented. I built a heading-
  frequency table over ~280 real `aar-*.md` files and derived the section shapes
  and the anchor variant lists from it (`scripts/corpus-report.ts`).
- **Every template carries a "what I did NOT do" section.** That negative-space
  section is the signature move and the highest-value part — it's enforced, and a
  test asserts every template has one.
- **Skipped sections still teach.** Leave a section blank and its guidance is
  written into the file as an HTML comment, so the scaffold instructs even unfilled.
- **Deterministic, local, no network/API key.** The reconcile matcher is plain,
  readable TS with a marked seam for an optional later LLM mode.

## What I did NOT do / follow-ups

- **Did NOT publish 0.2.0 yet.** `0.1.0` (reconcile-only) is on npm, published
  manually. `0.2.0` (adds authoring) is built and tested but not pushed to npm.
- **Did NOT merge PR #2.** It carries the Vercel build fix *and* the npm
  trusted-publishing workflow *and* (because I pushed to the same branch) the
  authoring feature. So the Vercel production deploy is still red until #2 lands
  on `main`, and the PR is mislabeled "Fix Vercel build" for what it now contains.
- **Did NOT split/retitle PR #2.** It should probably be one clean "v0.2 authoring"
  PR; right now it's a grab-bag.
- **No trace adapter.** Reconcile still runs on synthetic trace fixtures; there's
  no converter from real agent logs to the canonical `TraceEvent` shape.
- **Authoring has no edit/lint command.** Only `new` (create). No "check my AAR
  has the load-bearing sections" linter yet.
- **The git tag `v0.1.0`** never reached the remote (proxy denied the tag push);
  versioning is effectively tracked by npm + commits only.

## Validation

- `npm test` → **74 tests pass** (templates, renderer, slugify, interactive flow
  via scripted stdin, the reconcile fixtures, and a corpus parse test over all
  ~280 real AARs with 0 parse errors).
- Built `dist/` clean with `tsc`; verified the real binary end-to-end: a spawned
  `closedtab new` produced a correct dated AAR with auto-detected branch/commit.
- `0.1.0` confirmed installable and working from npm (`npm i -g closedtab`,
  `closedtab reconcile` on the bundled examples returned the expected diff).
- The Vercel deploy is **not** verified green — it failed on an invalid
  `vercel.json` runtime; the fix is in unmerged PR #2.

## Things to remember

- The name is the idea: *closing the tab* on a task = writing down what happened.
- Process notes from the build: spent real effort building reconcile from the
  spec before realizing it was the wrong front door. Not wasted — it's the
  payoff layer — but the lesson is to pin down "who's the user and what's their
  first action" before building the deep feature. The npm name churned three
  times (tabbycat → @quarterback/tabbycat → closedtab) before landing.
