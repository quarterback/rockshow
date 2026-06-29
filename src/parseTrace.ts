import type { TraceEvent, TraceActor, TraceKind } from "./types.js";

const ACTORS: ReadonlySet<string> = new Set([
  "agent",
  "human",
  "tool",
  "system",
]);

const KINDS: ReadonlySet<string> = new Set([
  "prompt",
  "tool_call",
  "file_read",
  "file_write",
  "command",
  "git_diff",
  "test",
  "network",
  "decision",
  "error",
  "note",
]);

/**
 * Parse a trace from text. Accepts either a JSON array of events or JSONL
 * (one JSON object per line). JSON.parse of the whole string is tried first;
 * on failure the input is treated as JSONL and each non-empty line is parsed.
 *
 * Validation is minimal and loud: every event must carry id, actor, kind and
 * summary. A bad field throws an error naming the offending line/index.
 */
export function parseTrace(input: string): TraceEvent[] {
  const text = input.trim();
  if (text === "") return [];

  let raw: unknown[];
  let lineForIndex: (i: number) => string;

  // Try array/object JSON first.
  let parsedWhole: unknown;
  let wholeOk = false;
  try {
    parsedWhole = JSON.parse(text);
    wholeOk = true;
  } catch {
    wholeOk = false;
  }

  if (wholeOk) {
    if (Array.isArray(parsedWhole)) {
      raw = parsedWhole;
      lineForIndex = (i) => `index ${i}`;
    } else if (parsedWhole && typeof parsedWhole === "object") {
      // A single event object is acceptable.
      raw = [parsedWhole];
      lineForIndex = () => `index 0`;
    } else {
      throw new Error(
        `parseTrace: expected a JSON array or JSONL of trace events, got ${typeof parsedWhole}`,
      );
    }
  } else {
    // Fall back to JSONL: parse each non-empty line.
    const lines = text.split(/\r?\n/);
    raw = [];
    const indexToLineNo: number[] = [];
    lines.forEach((line, lineNo) => {
      const trimmed = line.trim();
      if (trimmed === "") return;
      let obj: unknown;
      try {
        obj = JSON.parse(trimmed);
      } catch (e) {
        throw new Error(
          `parseTrace: line ${lineNo + 1} is not valid JSON: ${(e as Error).message}`,
        );
      }
      raw.push(obj);
      indexToLineNo.push(lineNo + 1);
    });
    lineForIndex = (i) => `line ${indexToLineNo[i]}`;
  }

  return raw.map((obj, i) => validateEvent(obj, lineForIndex(i)));
}

function validateEvent(obj: unknown, where: string): TraceEvent {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`parseTrace: ${where} is not a trace-event object`);
  }
  const rec = obj as Record<string, unknown>;

  for (const field of ["id", "actor", "kind", "summary"] as const) {
    if (rec[field] === undefined || rec[field] === null) {
      throw new Error(`parseTrace: ${where} is missing required field "${field}"`);
    }
    if (typeof rec[field] !== "string") {
      throw new Error(
        `parseTrace: ${where} field "${field}" must be a string, got ${typeof rec[field]}`,
      );
    }
  }

  if (!ACTORS.has(rec.actor as string)) {
    throw new Error(
      `parseTrace: ${where} has invalid actor "${rec.actor}" (expected one of ${[...ACTORS].join(", ")})`,
    );
  }
  if (!KINDS.has(rec.kind as string)) {
    throw new Error(
      `parseTrace: ${where} has invalid kind "${rec.kind}" (expected one of ${[...KINDS].join(", ")})`,
    );
  }

  const event: TraceEvent = {
    id: rec.id as string,
    actor: rec.actor as TraceActor,
    kind: rec.kind as TraceKind,
    summary: rec.summary as string,
  };

  if (typeof rec.ts === "string") event.ts = rec.ts;
  if (typeof rec.run_id === "string") event.run_id = rec.run_id;
  if (typeof rec.target === "string") event.target = rec.target;
  if ("input" in rec) event.input = rec.input;
  if ("output" in rec) event.output = rec.output;
  if (Array.isArray(rec.evidence)) {
    event.evidence = rec.evidence.filter((x): x is string => typeof x === "string");
  }
  if (rec.metadata && typeof rec.metadata === "object" && !Array.isArray(rec.metadata)) {
    event.metadata = rec.metadata as Record<string, unknown>;
  }

  return event;
}
