import type { Template, SectionSpec } from "./templates.js";

// Pure rendering of an AAR markdown file from a template + collected answers.
// Kept separate from the interactive prompt flow so it is trivially testable.

export type AarMeta = {
  title: string;
  date: string; // ISO date, e.g. "2026-06-29"
  branch?: string;
  pr?: string;
  commit?: string;
};

// answers: section id -> the author's text (may be empty/skipped)
export type Answers = Record<string, string>;

/** Turn a title into a stable file slug, e.g. "Fix pitcher W/L" -> "fix-pitcher-w-l". */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "untitled";
}

/** The filename an AAR is written to, e.g. "aar-fix-pitcher-w-l.md". */
export function aarFilename(title: string): string {
  return `aar-${slugify(title)}.md`;
}

function normalizePr(pr: string): string {
  const t = pr.trim();
  if (!t) return "";
  return /^#/.test(t) ? t : `#${t.replace(/^#/, "")}`;
}

function metaLine(meta: AarMeta): string {
  const parts = [`**Date:** ${meta.date}`];
  if (meta.branch?.trim()) parts.push(`**Branch:** \`${meta.branch.trim()}\``);
  if (meta.pr?.trim()) parts.push(`**PR:** ${normalizePr(meta.pr)}`);
  if (meta.commit?.trim()) parts.push(`**Commit:** \`${meta.commit.trim()}\``);
  return parts.join(" · ");
}

function renderSection(section: SectionSpec, answer: string | undefined): string {
  const body = (answer ?? "").trim();
  // A skipped section still teaches: the guidance is left as an HTML comment.
  const content = body !== "" ? body : `<!-- ${section.guidance} -->`;
  return `## ${section.heading}\n\n${content}\n`;
}

/**
 * Render a complete AAR markdown document. Sections with no answer are written
 * with their guidance as a comment, so the file is a usable scaffold even when
 * authored non-interactively.
 */
export function renderAar(template: Template, meta: AarMeta, answers: Answers): string {
  const header = `# AAR — ${meta.title.trim()}\n\n${metaLine(meta)}\n`;
  const body = template.sections
    .map((s) => renderSection(s, answers[s.id]))
    .join("\n");
  return `${header}\n${body}`;
}
