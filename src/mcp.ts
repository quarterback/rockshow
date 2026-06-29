#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { reconcileText } from "./index.js";

// MCP stdio server. Exposes a single `reconcile` tool that is the same core the
// CLI and library call. Load an AAR + trace, get the reconciliation diff back in
// one call — the headline surface for the agent/MCP crowd.

const server = new McpServer({
  name: "tabbycat",
  version: "0.1.0",
});

server.tool(
  "reconcile",
  "Reconcile an agent's After-Action Report (testimony, markdown) against a " +
    "machine trace of what the agent actually did (JSON array or JSONL text). " +
    "Returns a ReconciliationDiff describing where they agree, where the " +
    "testimony is unsupported, what the trace shows that the testimony omits, " +
    "and direct contradictions.",
  {
    testimony: z.string().describe("The AAR markdown."),
    trace: z
      .string()
      .describe("The trace as JSON (array of events) or JSONL (one per line)."),
  },
  async ({ testimony, trace }) => {
    try {
      const diff = reconcileText(testimony, trace);
      return {
        content: [{ type: "text", text: JSON.stringify(diff, null, 2) }],
      };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `reconcile failed: ${(e as Error).message}` }],
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so it never pollutes the stdio JSON-RPC channel.
  console.error("tabbycat MCP server running on stdio");
}

main().catch((e) => {
  console.error("tabbycat MCP server failed to start:", e);
  process.exit(1);
});
