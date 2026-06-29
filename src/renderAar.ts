import type { Template, SectionSpec } from "./templates.js";

// Pure rendering of a doc from a template + collected answers. Two shapes:
// the Agent Action Record (a labeled header block + sections of labeled fields),
// and the lighter task docs (an inline meta line + prose sections). Kept
// separate from the interactive flow so it is trivially testable.

export type AarMeta = {
  title: string;
  date: string; // ISO date, e.g. "2026-06-29"
  branch?: string;
  pr?: string;
  commit?: string;
};

// answers: section id (prose) or field id (fielded) -> the author's text
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

/** The filename a doc is written to, e.g. "aar-fix-pitcher-w-l.md" or "adr-x.md". */
export function docFilename(template: Template, title: string): string {
  return `${template.filePrefix}-${slugify(title)}.md`;
}

/** Back-compat helper: the aar-prefixed filename for a title. */
export function aarFilename(title: string): string {
  return `aar-${slugify(title)}.md`;
}

function normalizePr(pr: string): string {
  const t = pr.trim();
  if (!t) return "";
  return /^#/.test(t) ? t : `#${t.replace(/^#/, "")}`;
}

function extraMetaLines(meta: AarMeta): string[] {
  const lines: string[] = [];
  if (meta.branch?.trim()) lines.push(`**Branch:** \`${meta.branch.trim()}\``);
  if (meta.pr?.trim()) lines.push(`**PR:** ${normalizePr(meta.pr)}`);
  if (meta.commit?.trim()) lines.push(`**Commit:** \`${meta.commit.trim()}\``);
  return lines;
}

function header(template: Template, meta: AarMeta): string {
  const title = meta.title.trim();
  if (template.metaFields) {
    // Labeled header block (the Agent Action Record).
    const lines = template.metaFields.map((f) => {
      const v = f.auto === "date" ? meta.date : f.auto === "title" ? title : "";
      return `**${f.label}:** ${v}`.trimEnd();
    });
    lines.push(...extraMetaLines(meta));
    return `# ${template.docLabel}: ${title}\n\n${lines.join("\n")}\n\n---\n`;
  }
  // Inline meta line (task docs).
  const meta1 = [`**Date:** ${meta.date}`, ...extraMetaLines(meta)].join(" · ");
  return `# ${template.docLabel}: ${title}\n\n${meta1}\n`;
}

function renderProseSection(section: SectionSpec, answer: string | undefined): string {
  const body = (answer ?? "").trim();
  // A skipped section still teaches: the guidance is left as an HTML comment.
  const content = body !== "" ? body : `<!-- ${section.guidance} -->`;
  return `## ${section.heading}\n\n${content}\n`;
}

function renderFieldedSection(section: SectionSpec, answers: Answers): string {
  const parts = (section.fields ?? []).map((f) => {
    const ans = (answers[f.id] ?? "").trim();
    if (ans !== "") return `**${f.label}:**\n\n${ans}\n`;
    return f.hint ? `**${f.label}:**\n<!-- ${f.hint} -->\n` : `**${f.label}:**\n`;
  });
  return `## ${section.heading}\n\n${parts.join("\n")}`;
}

/**
 * Render a complete doc. Fielded sections (the record) render as a labeled form;
 * prose sections render with their guidance as an HTML comment when skipped, so
 * the file is a usable scaffold even when authored non-interactively.
 */
export function renderAar(template: Template, meta: AarMeta, answers: Answers): string {
  const body = template.sections
    .map((s) =>
      s.fields && s.fields.length > 0
        ? renderFieldedSection(s, answers)
        : renderProseSection(s, answers[s.id]),
    )
    .join("\n");
  return `${header(template, meta)}\n${body}`;
}
