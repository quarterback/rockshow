import type { ExtractedClaim, ClaimKind, ClaimSection } from "./types.js";
import { classifyHeading } from "./anchors.js";
import { extractEntities, ACTION_VERBS } from "./entities.js";

type Section = {
  heading: string; // raw heading text ("" for any preamble before the first heading)
  section: ClaimSection;
  body: string; // body prose with fenced code blocks already removed
};

const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;
const FENCE_RE = /^```/;

/**
 * Split markdown into (heading, body) sections. Fenced code blocks are dropped
 * from the body so we never extract "claims" out of source listings. A heading
 * line opens a new section; everything before the first heading is a preamble
 * section classified as "other".
 */
function splitSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section = { heading: "", section: "other", body: "" };
  const bodyLines: string[] = [];
  let inFence = false;

  const flush = () => {
    current.body = bodyLines.join("\n").trim();
    if (current.heading !== "" || current.body !== "") sections.push(current);
    bodyLines.length = 0;
  };

  for (const line of lines) {
    if (FENCE_RE.test(line.trim())) {
      inFence = !inFence;
      continue; // drop the fence markers and their contents
    }
    if (inFence) continue;

    const m = HEADING_RE.exec(line);
    if (m) {
      flush();
      const heading = m[2].trim();
      current = { heading, section: classifyHeading(heading), body: "" };
      continue;
    }
    bodyLines.push(line);
  }
  flush();
  return sections;
}

/** Remove inline/markdown noise from a block of prose before claim splitting. */
function cleanLine(line: string): string {
  return line
    .replace(/^\s*[-*+]\s+/, "") // bullet marker
    .replace(/^\s*\d+[.)]\s+/, "") // ordered list marker
    .replace(/^\s*>\s?/, "") // blockquote marker
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, "$1") // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links -> text
    .trim();
}

// AAR front-matter lines ("**Branch:** ...", "PR: #73", "Commit: `abc`") are
// metadata, not claims — drop them so labels like "Commit:" aren't read as the
// verb "commit".
const METADATA_LINE_RE =
  /^(date(?:\s+completed)?|branch(?:\s+name)?|prs?|commit|commits|author|status|repo|completed)\b\s*[:：]/i;

/**
 * Join a section body into logical blocks. Markdown soft-wraps prose across
 * source lines; a single bullet can span several lines. Each block is one list
 * item or one paragraph, with wrapped continuation lines joined back together.
 */
function toBlocks(body: string): string[] {
  const blocks: string[] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) blocks.push(cur.join(" ").trim());
    cur = [];
  };
  for (const raw of body.split(/\n/)) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    if (/^\|/.test(line)) {
      flush();
      continue; // markdown table row
    }
    if (/^[-=]{3,}$/.test(line)) {
      flush();
      continue; // horizontal rule / table separator
    }
    if (/^([-*+]\s+|\d+[.)]\s+)/.test(line)) {
      flush();
      cur.push(line);
      continue; // new list item
    }
    cur.push(line); // continuation / paragraph line
  }
  flush();
  return blocks;
}

// Sentence boundary: a .!? followed by whitespace and a capital/opening paren.
// The lookahead keeps "app.py" from splitting (the dot is followed by a lower-
// case letter), while real sentence ends do split.
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z(`"])/;

// Coordinating-conjunction split. "edited app.py and ran the suite" -> two
// claims. v0 heuristic — LLM-assisted extraction plugs in here.
const CONJUNCTION_SPLIT_RE = /(?:;\s+|,\s+and\s+|,\s+then\s+|\s+and\s+|\s+then\s+)/;

function splitIntoClaims(body: string): string[] {
  const claims: string[] = [];
  for (const block of toBlocks(body)) {
    const line = cleanLine(block);
    if (!line) continue;
    if (METADATA_LINE_RE.test(line)) continue; // AAR front-matter, not a claim

    for (const sentence of line.split(SENTENCE_SPLIT_RE)) {
      const s = sentence.trim();
      if (!s) continue;
      // v0 heuristic — LLM-assisted extraction plugs in here.
      for (const clause of s.split(CONJUNCTION_SPLIT_RE)) {
        const c = clause.trim().replace(/[.;,]+$/, "").trim();
        if (c.length >= 3) claims.push(c);
      }
    }
  }
  return claims;
}

function hasActionVerb(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTION_VERBS.some((v) => new RegExp(`\\b${v}\\b`).test(lower));
}

function assignKind(
  section: ClaimSection,
  text: string,
  entities: ExtractedClaim["entities"],
): ClaimKind {
  switch (section) {
    case "intent":
      return "intent";
    case "negative_space":
      return "non_action";
    case "claimed_actions":
      return "action";
    case "other": {
      const hasAnchor =
        entities.files.length > 0 || entities.commands.length > 0;
      return hasActionVerb(text) || hasAnchor ? "action" : "statement";
    }
  }
}

/**
 * Parse AAR testimony (markdown) into a flat list of extracted claims. Headings
 * are classified into the anchor sections; prose under each heading is split
 * into one-clause-per-claim units; each claim is tagged with extracted entities
 * and a kind.
 */
export function parseAarTestimony(markdown: string): ExtractedClaim[] {
  const sections = splitSections(markdown);
  const claims: ExtractedClaim[] = [];
  let counter = 0;

  for (const sec of sections) {
    for (const text of splitIntoClaims(sec.body)) {
      const entities = extractEntities(text);
      const kind = assignKind(sec.section, text, entities);
      counter += 1;
      claims.push({
        id: `claim-${String(counter).padStart(3, "0")}`,
        text,
        section: sec.section,
        kind,
        heading: sec.heading || undefined,
        entities,
      });
    }
  }

  return claims;
}
