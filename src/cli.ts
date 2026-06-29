#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { reconcileText } from "./index.js";

// Thin CLI over the reconcile() core.
//
//   closedtab reconcile --testimony ./testimony.md --trace ./trace.jsonl --out ./diff.json
//
// --trace accepts a .jsonl (one event per line) or .json (array); the format is
// auto-detected by the parser. With no --out the diff is pretty-printed to
// stdout. Exit code is 0 on a successful run — a contradiction is a finding in
// the diff, not a CLI error.

type Args = { [k: string]: string | boolean };

function parseArgs(argv: string[]): { command: string; args: Args } {
  const command = argv[0] ?? "";
  const args: Args = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return { command, args };
}

const USAGE = `closedtab — Agent AAR Reconciliation Tool  (alias: oi)

Usage:
  closedtab reconcile --testimony <file.md> --trace <file.jsonl|file.json> [--out <diff.json>]

Options:
  --testimony  Path to the AAR markdown (the testimony).
  --trace      Path to the trace (.jsonl one-object-per-line, or .json array).
  --out        Write the diff JSON here. Omit to pretty-print to stdout.
  -h, --help   Show this help.

Exit code is 0 on a successful run; a contradiction is reported in the diff,
not as a CLI error.`;

function main(): void {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (command === "" || args.help || args.h || command === "help") {
    console.log(USAGE);
    process.exit(command === "" ? 1 : 0);
  }

  if (command !== "reconcile") {
    console.error(`closedtab: unknown command "${command}"\n\n${USAGE}`);
    process.exit(2);
  }

  const testimonyPath = args.testimony;
  const tracePath = args.trace;
  if (typeof testimonyPath !== "string" || typeof tracePath !== "string") {
    console.error("closedtab reconcile: --testimony and --trace are both required.\n");
    console.error(USAGE);
    process.exit(2);
  }

  let testimony: string;
  let trace: string;
  try {
    testimony = readFileSync(testimonyPath, "utf8");
  } catch (e) {
    console.error(`closedtab: cannot read testimony "${testimonyPath}": ${(e as Error).message}`);
    process.exit(2);
    return;
  }
  try {
    trace = readFileSync(tracePath, "utf8");
  } catch (e) {
    console.error(`closedtab: cannot read trace "${tracePath}": ${(e as Error).message}`);
    process.exit(2);
    return;
  }

  let diff;
  try {
    diff = reconcileText(testimony, trace);
  } catch (e) {
    console.error(`closedtab: reconcile failed: ${(e as Error).message}`);
    process.exit(2);
    return;
  }

  const json = JSON.stringify(diff, null, 2);
  if (typeof args.out === "string") {
    writeFileSync(args.out, json + "\n", "utf8");
    console.error(`closedtab: ${diff.status} — wrote ${args.out}`);
  } else {
    console.log(json);
  }
  process.exit(0);
}

main();
