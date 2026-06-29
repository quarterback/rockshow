// Netlify Function (2.0 Web signature) — POST { testimony, trace } -> diff.
//
// Identical core to the CLI / MCP / Vercel surfaces. `npm run build` (see
// netlify.toml) emits ../../dist before functions are bundled.
import { reconcileText } from "../../dist/index.js";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return Response.json(
      { error: "Use POST with a JSON body { testimony, trace }." },
      { status: 405 },
    );
  }

  let body: { testimony?: unknown; trace?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { testimony, trace } = body ?? {};
  if (typeof testimony !== "string" || typeof trace !== "string") {
    return Response.json(
      {
        error:
          "Both `testimony` (markdown) and `trace` (JSON/JSONL text) must be strings.",
      },
      { status: 400 },
    );
  }

  try {
    return Response.json(reconcileText(testimony, trace));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
};
