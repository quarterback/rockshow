#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { reconcileText } from "./index.js";
import { TEMPLATES, getTemplate } from "./templates.js";
import { renderAar, docFilename, type AarMeta, type Answers } from "./renderAar.js";
import { checkDoc } from "./check.js";

// MCP stdio server. Exposes the closedtab core as tools so an agent in a
// human-agent loop can write, score, and reconcile its own docs. Same pure core
// the CLI and library call. Non-interactive: every tool takes all inputs at once.

const server = new McpServer({
  name: "closedtab",
  version: "0.3.0",
});

const TEMPLATE_IDS = TEMPLATES.map((t) => t.id).join(" | ");

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}
function errorText(s: string) {
  return { isError: true, content: [{ type: "text" as const, text: s }] };
}

// ---- list_templates: discover what to fill before scaffolding ----
server.tool(
  "list_templates",
  "List the closedtab doc templates (AAR, ADR, handoff, proposal) and the " +
    "sections each one prompts for, with guidance. Call this first to learn the " +
    "section ids to pass to new_doc.",
  {},
  async () => {
    const out = TEMPLATES.map((t) => ({
      type: t.id,
      label: t.label,
      doc_label: t.docLabel,
      file_prefix: t.filePrefix,
      sections: t.sections.map((s) => ({
        id: s.id,
        heading: s.heading,
        guidance: s.guidance,
      })),
    }));
    return text(JSON.stringify(out, null, 2));
  },
);

// ---- new_doc: render a complete doc (AAR/ADR/handoff/proposal) ----
server.tool(
  "new_doc",
  "Scaffold a doc for a human-agent team and return its markdown plus the " +
    "filename to write it to (e.g. aar-<slug>.md, adr-<slug>.md). Provide section " +
    "content via `sections` (a map of section id -> text); omitted sections are " +
    "rendered with their guidance as an HTML comment so they still instruct. Use " +
    "list_templates to learn the section ids.",
  {
    type: z.string().describe(`template id: ${TEMPLATE_IDS}`),
    title: z.string().describe("The doc title."),
    branch: z.string().optional().describe("Git branch, optional."),
    pr: z.string().optional().describe("PR number, optional."),
    commit: z.string().optional().describe("Commit hash, optional."),
    date: z.string().optional().describe("ISO date; defaults to today."),
    sections: z
      .record(z.string())
      .optional()
      .describe("Map of section id -> content. Omitted ids become guidance comments."),
  },
  async ({ type, title, branch, pr, commit, date, sections }) => {
    const template = getTemplate(type);
    if (!template) {
      return errorText(`unknown template "${type}". Valid types: ${TEMPLATE_IDS}`);
    }
    const meta: AarMeta = {
      title,
      date: date ?? todayIso(),
      branch,
      pr,
      commit,
    };
    const answers: Answers = sections ?? {};
    const markdown = renderAar(template, meta, answers);
    const filename = docFilename(template, title);
    return text(JSON.stringify({ filename, markdown }, null, 2));
  },
);

// ---- check: score a doc on the quality vector ----
server.tool(
  "check",
  "Score a doc on the quality vector a human-agent team relies on: scope, " +
    "rationale, delegation record (who decided), validation, negative space, and " +
    "residual risks. Returns the score (0-6), per-dimension flags, and suggestions.",
  {
    markdown: z.string().describe("The doc's markdown."),
  },
  async ({ markdown }) => {
    return text(JSON.stringify(checkDoc(markdown), null, 2));
  },
);

// ---- reconcile: check a doc's claims against a trace ----
server.tool(
  "reconcile",
  "Reconcile a doc (testimony, markdown) against a machine trace of what the " +
    "agent actually did (JSON array or JSONL text). Returns a ReconciliationDiff: " +
    "where they agree, where the doc is unsupported, what the trace shows that the " +
    "doc omits, and direct contradictions.",
  {
    testimony: z.string().describe("The doc markdown."),
    trace: z
      .string()
      .describe("The trace as JSON (array of events) or JSONL (one per line)."),
  },
  async ({ testimony, trace }) => {
    try {
      const diff = reconcileText(testimony, trace);
      return text(JSON.stringify(diff, null, 2));
    } catch (e) {
      return errorText(`reconcile failed: ${(e as Error).message}`);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so it never pollutes the stdio JSON-RPC channel.
  console.error("closedtab MCP server running on stdio");
}

main().catch((e) => {
  console.error("closedtab MCP server failed to start:", e);
  process.exit(1);
});
