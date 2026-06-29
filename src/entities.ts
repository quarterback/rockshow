import type { ClaimEntities } from "./types.js";

// Deterministic entity extraction over claim text. These extracted anchors,
// file paths, commands, function names, commit hashes, PR numbers, branches,
// are what the matcher keys on, so this is the highest-value part of the parser.
// Each extractor is small and independently testable.

// File extensions we treat as code/doc files when a token has no slash.
const CODE_EXTENSIONS = [
  "py", "ts", "tsx", "js", "jsx", "mjs", "cjs", "md", "json", "html", "htm",
  "css", "scss", "sql", "yml", "yaml", "toml", "ini", "cfg", "sh", "bash",
  "go", "rs", "java", "rb", "c", "h", "cpp", "hpp", "txt", "lock", "env",
  "xml", "svg", "vue", "php", "kt", "swift", "proto", "dockerfile",
];

// First-token shell verbs that mark a line/backtick span as a command.
const SHELL_VERBS = [
  "npm", "pnpm", "yarn", "npx", "python", "python3", "py", "pytest", "git",
  "node", "make", "curl", "wget", "bash", "sh", "docker", "docker-compose",
  "cd", "ls", "grep", "rg", "sed", "awk", "cat", "flask", "vitest", "tsc",
  "tsx", "cargo", "go", "pip", "pip3", "poetry", "ruff", "eslint", "prettier",
  "mypy", "deno", "bun", "kubectl", "terraform", "psql", "sqlite3",
];

// Closed list of action verbs used for classification and matching. The spec's
// past-tense set, plus a few base/related forms so action detection is robust.
export const ACTION_VERBS = [
  "edited", "edit", "changed", "change", "added", "add", "removed", "remove",
  "deleted", "delete", "ran", "run", "tested", "test", "fixed", "fix",
  "replaced", "replace", "wrote", "write", "created", "create", "updated",
  "update", "refactored", "refactor", "renamed", "rename", "dropped", "drop",
  "moved", "move", "committed", "commit", "merged", "merge", "built", "build",
  "shipped", "ship", "implemented", "implement", "wired", "wire",
];

const codeExtAlt = CODE_EXTENSIONS.join("|");
const shellVerbAlt = SHELL_VERBS.join("|");

// A path with at least one slash and a final dotted extension, e.g. o27v2/web/app.py
const SLASH_PATH_RE = new RegExp(
  String.raw`(?:[\w@.+-]+\/)+[\w@.+-]+\.(?:${codeExtAlt})\b`,
  "gi",
);
// A bare filename with a known code extension, e.g. app.py, db.py, README.md
const BARE_FILE_RE = new RegExp(
  String.raw`\b[\w@+-]+\.(?:${codeExtAlt})\b`,
  "gi",
);
// Special-case known filenames without a code extension. Dotfiles need their
// own pattern: a leading \b never matches before a dot.
const SPECIAL_FILES_RE = /\b(?:Dockerfile|Makefile)\b|(?<![\w.])\.(?:replit|gitignore|env|dockerignore)\b/g;

const BACKTICK_RE = /`([^`]+)`/g;
const DOUBLE_QUOTE_RE = /"([^"]+)"|“([^”]+)”/g;
const PR_RE = /#\d+\b/g;
// 7-40 char hex; bare form must contain a digit to avoid matching english words.
const HEX_RE = /\b[0-9a-f]{7,40}\b/gi;
const CLAUDE_BRANCH_RE = /\bclaude\/[\w./-]+/g;

function dedupe(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

function stripPunct(token: string): string {
  // Strip trailing punctuation that commonly clings to inline tokens.
  return token.replace(/^[("'<]+/, "").replace(/[)"'>.,;:!?]+$/, "");
}

export function extractFiles(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(SLASH_PATH_RE)) out.push(m[0]);
  for (const m of text.matchAll(BARE_FILE_RE)) out.push(m[0]);
  for (const m of text.matchAll(SPECIAL_FILES_RE)) out.push(m[0]);
  // A file token may be written with a trailing line range, e.g. app.py:1995-1999.
  // The base regexes already stop at the extension, so nothing extra to strip,
  // but normalize away any accidental trailing colon-range that slipped in.
  return dedupe(out.map((f) => f.replace(/:[0-9-]+$/, "")));
}

export function extractCommands(text: string): string[] {
  const out: string[] = [];

  // 1. Backtick spans whose first word is a shell verb.
  for (const m of text.matchAll(BACKTICK_RE)) {
    const inner = m[1].trim();
    const first = inner.split(/\s+/)[0];
    if (SHELL_VERBS.includes(first.toLowerCase())) out.push(inner);
  }

  // 2. Lines (e.g. inside fenced blocks the caller may pass) that start with a
  //    shell verb. Operates line by line so prose mentioning "git" mid-sentence
  //    is not captured.
  const lineRe = new RegExp(String.raw`^\s*((?:${shellVerbAlt})\b[^\n\r]*)$`, "gim");
  for (const m of text.matchAll(lineRe)) {
    const cmd = m[1].trim().replace(/`/g, "");
    out.push(cmd);
  }

  return dedupe(out);
}

export function extractTools(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(BACKTICK_RE)) {
    let inner = m[1].trim();
    // Allow a single trailing () to denote a function.
    const fn = /^_?[A-Za-z][A-Za-z0-9_]*(\(\))?$/.test(inner);
    if (!fn) continue;
    // Skip things that are really files (have an extension) or commands.
    const base = inner.replace(/\(\)$/, "");
    if (new RegExp(`\\.(?:${codeExtAlt})$`, "i").test(base)) continue;
    if (SHELL_VERBS.includes(base.toLowerCase())) continue;
    // Qualify as a symbol only if it looks like an identifier: has an
    // underscore, has parens, or is camelCase (an internal capital).
    const looksSymbol =
      base.includes("_") || /\(\)$/.test(inner) || /[a-z][A-Z]/.test(base);
    if (!looksSymbol) continue;
    out.push(inner.replace(/\(\)$/, ""));
  }
  return dedupe(out);
}

export function extractCommits(text: string): string[] {
  const out: string[] = [];
  // Backticked hex tokens count even without a digit (they are explicitly marked).
  for (const m of text.matchAll(BACKTICK_RE)) {
    const inner = m[1].trim();
    if (/^[0-9a-f]{7,40}$/i.test(inner)) out.push(inner.toLowerCase());
  }
  // Bare hex tokens must contain a digit to avoid matching english words like "deedface".
  for (const m of text.matchAll(HEX_RE)) {
    const tok = m[0].toLowerCase();
    if (/\d/.test(tok)) out.push(tok);
  }
  return dedupe(out);
}

export function extractPrs(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PR_RE)) out.push(m[0]);
  return dedupe(out);
}

export function extractBranches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CLAUDE_BRANCH_RE)) out.push(stripPunct(m[0]));
  // Token following the word "branch".
  const afterBranch = /\bbranch(?:\s+name)?\s+`?([\w./-]+)`?/gi;
  for (const m of text.matchAll(afterBranch)) {
    const tok = stripPunct(m[1]);
    if (tok) out.push(tok);
  }
  // Backticked feature-branch shapes (a/b style without a file extension).
  for (const m of text.matchAll(BACKTICK_RE)) {
    const inner = m[1].trim();
    if (
      /^[\w-]+\/[\w./-]+$/.test(inner) &&
      !new RegExp(`\\.(?:${codeExtAlt})$`, "i").test(inner)
    ) {
      out.push(inner);
    }
  }
  return dedupe(out);
}

export function extractQuoted(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(DOUBLE_QUOTE_RE)) {
    const inner = (m[1] ?? m[2] ?? "").trim();
    if (inner) out.push(inner);
  }
  return dedupe(out);
}

export function extractVerbs(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const v of ACTION_VERBS) {
    if (new RegExp(`\\b${v}\\b`).test(lower)) out.push(v);
  }
  return dedupe(out);
}

/** Run every extractor over one piece of claim text. */
export function extractEntities(text: string): ClaimEntities {
  return {
    files: extractFiles(text),
    commands: extractCommands(text),
    tools: extractTools(text),
    commits: extractCommits(text),
    prs: extractPrs(text),
    branches: extractBranches(text),
    quoted: extractQuoted(text),
    verbs: extractVerbs(text),
  };
}
