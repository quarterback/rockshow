#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { reconcileText } from "./index.js";
import { runNew } from "./newCommand.js";
import { GUIDE } from "./guide.js";

// Thin CLI over the closedtab core. Three commands:
//
//   closedtab new [title] [--type bugfix|feature|investigation|generic]
//   closedtab guide
//   closedtab reconcile --testimony <file.md> --trace <file.jsonl|json> [--out <diff.json>]
//
// Authoring (`new`) is the front door — write AARs the way you'd want to read
// them. `reconcile` is the advanced step: once you have an AAR and a record of
// what actually happened, check one against the other.

type Args = { [k: string]: string | boolean | string[]; _: string[] };

function parseArgs(argv: string[]): { command: string; args: Args } {
  const command = argv[0] ?? "";
  const args: Args = { _: [] };
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
    } else {
      args._.push(a);
    }
  }
  return { command, args };
}

const USAGE = `closedtab — write After-Action Reports (and, later, check them)  (alias: oi)

Usage:
  closedtab new [title] [--type bugfix|feature|investigation|generic] [--dir docs]
      Walk through a new AAR question by question and write a dated aar-<slug>.md.

  closedtab guide
      Print a short how-to on writing AARs and why they're worth the two minutes.

  closedtab reconcile --testimony <file.md> --trace <file.jsonl|file.json> [--out <diff.json>]
      Check an AAR (testimony) against a machine trace of what actually happened.

  -h, --help    Show this help.`;

function reconcileCommand(args: Args): number {
  const testimonyPath = args.testimony;
  const tracePath = args.trace;
  if (typeof testimonyPath !== "string" || typeof tracePath !== "string") {
    console.error("closedtab reconcile: --testimony and --trace are both required.\n");
    console.error(USAGE);
    return 2;
  }

  let testimony: string;
  let trace: string;
  try {
    testimony = readFileSync(testimonyPath, "utf8");
  } catch (e) {
    console.error(`closedtab: cannot read testimony "${testimonyPath}": ${(e as Error).message}`);
    return 2;
  }
  try {
    trace = readFileSync(tracePath, "utf8");
  } catch (e) {
    console.error(`closedtab: cannot read trace "${tracePath}": ${(e as Error).message}`);
    return 2;
  }

  let diff;
  try {
    diff = reconcileText(testimony, trace);
  } catch (e) {
    console.error(`closedtab: reconcile failed: ${(e as Error).message}`);
    return 2;
  }

  const json = JSON.stringify(diff, null, 2);
  if (typeof args.out === "string") {
    writeFileSync(args.out, json + "\n", "utf8");
    console.error(`closedtab: ${diff.status} — wrote ${args.out}`);
  } else {
    console.log(json);
  }
  return 0;
}

async function main(): Promise<number> {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (command === "" || args.help || args.h || command === "help") {
    console.log(USAGE);
    return command === "" ? 1 : 0;
  }

  switch (command) {
    case "new": {
      const title = typeof args.title === "string" ? args.title : args._[0];
      await runNew({
        type: typeof args.type === "string" ? args.type : undefined,
        title: typeof title === "string" ? title : undefined,
        dir: typeof args.dir === "string" ? args.dir : undefined,
      });
      return 0;
    }
    case "guide":
      console.log(GUIDE);
      return 0;
    case "reconcile":
      return reconcileCommand(args);
    default:
      console.error(`closedtab: unknown command "${command}"\n\n${USAGE}`);
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`closedtab: ${(e as Error).message}`);
    process.exit(1);
  },
);
