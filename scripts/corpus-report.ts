#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyHeading } from "../src/anchors.js";
import { parseAarTestimony } from "../src/parseAar.js";

// Regenerate the heading-frequency table over the real AAR corpus and report
// every heading the parser still classifies as "other". A heading that recurs
// across many files and lands in "other" is the signal to extend the anchor
// variant lists in src/anchors.ts. This report is how the parser is shown to
// generalize beyond the four-file sample the spec started from.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const CORPUS_DIRS = [
  join(repoRoot, "..", "hybrid-baseball", "docs"),
  join(repoRoot, "..", "tennis-team-manager", "docs"),
];

const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;

type HeadingStat = { count: number; files: Set<string> };

function collect() {
  const bySection: Record<string, Map<string, HeadingStat>> = {
    intent: new Map(),
    claimed_actions: new Map(),
    negative_space: new Map(),
    other: new Map(),
  };
  let fileCount = 0;
  let parseErrors = 0;

  for (const dir of CORPUS_DIRS) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".md"));
    for (const f of files) {
      const path = join(dir, f);
      let text: string;
      try {
        text = readFileSync(path, "utf8");
      } catch {
        continue;
      }
      fileCount += 1;

      // Exercise the full parser too, to confirm it never throws on real input.
      try {
        parseAarTestimony(text);
      } catch {
        parseErrors += 1;
      }

      let inFence = false;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim().startsWith("```")) {
          inFence = !inFence;
          continue;
        }
        if (inFence) continue;
        const m = HEADING_RE.exec(line);
        if (!m) continue;
        const heading = m[2].trim();
        const section = classifyHeading(heading);
        const key = heading.toLowerCase();
        const map = bySection[section];
        const stat = map.get(key) ?? { count: 0, files: new Set<string>() };
        stat.count += 1;
        stat.files.add(f);
        map.set(key, stat);
      }
    }
  }
  return { bySection, fileCount, parseErrors };
}

function toSortedList(map: Map<string, HeadingStat>) {
  return [...map.entries()]
    .map(([heading, stat]) => ({
      heading,
      count: stat.count,
      files: stat.files.size,
    }))
    .sort((a, b) => b.count - a.count);
}

function main() {
  const present = CORPUS_DIRS.filter((d) => existsSync(d));
  if (present.length === 0) {
    console.error(
      "corpus-report: no corpus found. Expected sibling repos at:\n  " +
        CORPUS_DIRS.join("\n  "),
    );
    process.exit(1);
  }

  const { bySection, fileCount, parseErrors } = collect();

  const counts = Object.fromEntries(
    Object.entries(bySection).map(([k, v]) => [
      k,
      [...v.values()].reduce((n, s) => n + s.count, 0),
    ]),
  );

  const unmapped = toSortedList(bySection.other);
  const report = {
    generated_over_files: fileCount,
    parse_errors: parseErrors,
    heading_counts_by_section: counts,
    anchors: {
      intent: toSortedList(bySection.intent),
      claimed_actions: toSortedList(bySection.claimed_actions),
      negative_space: toSortedList(bySection.negative_space),
    },
    unmapped_headings: unmapped,
  };

  const outPath = join(repoRoot, "unmapped-headings.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`corpus-report: scanned ${fileCount} files, ${parseErrors} parse errors`);
  console.log("heading counts by section:", counts);
  console.log(`\nTop headings still landing in "other" (extend anchors if a row recurs):`);
  for (const row of unmapped.slice(0, 25)) {
    console.log(`  ${String(row.count).padStart(3)}  ${row.heading}`);
  }
  console.log(`\nFull report written to ${outPath}`);
}

main();
