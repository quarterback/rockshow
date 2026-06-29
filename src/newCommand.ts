import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { Readable, Writable } from "node:stream";
import { TEMPLATES, getTemplate, type Template } from "./templates.js";
import {
  renderAar,
  aarFilename,
  type AarMeta,
  type Answers,
} from "./renderAar.js";

export type NewOptions = {
  type?: string;
  title?: string;
  dir?: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function gitValue(args: string): string {
  try {
    return execSync(`git ${args}`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/** Read a possibly multi-line answer for one section. */
async function readSection(
  rl: readline.Interface,
  out: Writable,
  heading: string,
  guidance: string,
): Promise<string> {
  out.write(`\n## ${heading}\n  ${guidance}\n`);
  out.write(
    `  (write as many lines as you like; finish with a line containing just "." — or press Enter now to skip)\n`,
  );
  const lines: string[] = [];
  for (;;) {
    const line = await rl.question("  > ");
    if (line.trim() === ".") break;
    if (lines.length === 0 && line.trim() === "") break; // immediate Enter = skip
    lines.push(line);
  }
  return lines.join("\n").trim();
}

async function chooseTemplate(
  rl: readline.Interface,
  out: Writable,
  preset?: string,
): Promise<Template> {
  if (preset) {
    const t = getTemplate(preset);
    if (t) return t;
    out.write(`Unknown template "${preset}" — pick one below.\n`);
  }
  out.write("\nPick a template:\n");
  TEMPLATES.forEach((t, i) => {
    out.write(`  ${i + 1}) ${t.label.padEnd(22)} ${t.description}\n`);
  });
  for (;;) {
    const ans = (await rl.question("\nTemplate [1]: ")).trim();
    if (ans === "") return TEMPLATES[0];
    const byNum = TEMPLATES[Number(ans) - 1];
    if (byNum) return byNum;
    const byId = getTemplate(ans);
    if (byId) return byId;
    out.write("  Enter a number or template id.\n");
  }
}

async function ask(
  rl: readline.Interface,
  prompt: string,
  fallback = "",
): Promise<string> {
  const suffix = fallback ? ` [${fallback}]` : "";
  const ans = (await rl.question(`${prompt}${suffix}: `)).trim();
  return ans || fallback;
}

function resolveDir(optDir?: string): string {
  if (optDir) {
    mkdirSync(optDir, { recursive: true });
    return optDir;
  }
  if (existsSync("docs") && statSync("docs").isDirectory()) return "docs";
  return ".";
}

/** Pick a non-colliding path (aar-x.md, aar-x-2.md, ...). */
function uniquePath(dir: string, base: string): string {
  let candidate = join(dir, base);
  if (!existsSync(candidate)) return candidate;
  const stem = base.replace(/\.md$/, "");
  for (let n = 2; ; n++) {
    candidate = join(dir, `${stem}-${n}.md`);
    if (!existsSync(candidate)) return candidate;
  }
}

/**
 * Interactive `closedtab new`: walk the author through a template question by
 * question, then write a dated aar-<slug>.md. Returns the written path.
 */
export async function runNew(
  opts: NewOptions,
  io: { input?: Readable; output?: Writable } = {},
): Promise<string> {
  const input = io.input ?? stdin;
  const out = io.output ?? stdout;
  const rl = readline.createInterface({ input, output: out });
  try {
    out.write("closedtab — new After-Action Report\n");

    const template = await chooseTemplate(rl, out, opts.type);

    let title = opts.title?.trim() ?? "";
    while (!title) title = (await rl.question("\nTitle: ")).trim();

    out.write("\nOptional context (press Enter to skip any):\n");
    const branch = await ask(rl, "  Branch", gitValue("rev-parse --abbrev-ref HEAD"));
    const pr = await ask(rl, "  PR #");
    const commit = await ask(rl, "  Commit", gitValue("rev-parse --short HEAD"));

    const meta: AarMeta = { title, date: todayIso(), branch, pr, commit };

    out.write(
      `\nNow the sections. Skip any you don't have yet — a skipped section keeps its guidance as a comment so you can fill it in later.\n`,
    );
    const answers: Answers = {};
    for (const section of template.sections) {
      answers[section.id] = await readSection(rl, out, section.heading, section.guidance);
    }

    const dir = resolveDir(opts.dir);
    const path = uniquePath(dir, aarFilename(title));
    writeFileSync(path, renderAar(template, meta, answers), "utf8");

    out.write(`\n✓ Wrote ${path}\n`);
    out.write(`  Open it, flesh out anything you skipped, and commit it alongside your work.\n`);
    return path;
  } finally {
    rl.close();
  }
}
