// Vercel serverless function — POST { testimony, trace } -> ReconciliationDiff.
//
// Same pure core as the CLI and MCP server. The build step (see vercel.json,
// `npm run build`) emits ../dist before functions are bundled, so this imports
// real compiled JS. The core has zero node-specific or network dependencies,
// which is exactly why it drops cleanly into a serverless function.
import { reconcileText } from "../dist/index.js";

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST with a JSON body { testimony, trace }." });
    return;
  }

  const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) ?? {};
  const { testimony, trace } = body as { testimony?: unknown; trace?: unknown };

  if (typeof testimony !== "string" || typeof trace !== "string") {
    res.status(400).json({
      error: "Both `testimony` (markdown) and `trace` (JSON/JSONL text) must be strings.",
    });
    return;
  }

  try {
    res.status(200).json(reconcileText(testimony, trace));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}
