import { describe, it, expect } from "vitest";
import { parseTrace } from "../src/parseTrace.js";

describe("parseTrace", () => {
  it("parses a JSON array", () => {
    const events = parseTrace(
      JSON.stringify([
        { id: "a", actor: "agent", kind: "file_write", summary: "wrote x", target: "x.py" },
      ]),
    );
    expect(events).toHaveLength(1);
    expect(events[0].target).toBe("x.py");
  });

  it("parses JSONL (one object per line)", () => {
    const jsonl = [
      '{"id":"a","actor":"agent","kind":"prompt","summary":"do x"}',
      "",
      '{"id":"b","actor":"agent","kind":"command","summary":"ran","target":"pytest"}',
    ].join("\n");
    const events = parseTrace(jsonl);
    expect(events.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("parses a single object", () => {
    const events = parseTrace('{"id":"a","actor":"agent","kind":"note","summary":"hi"}');
    expect(events).toHaveLength(1);
  });

  it("returns [] for empty input", () => {
    expect(parseTrace("   ")).toEqual([]);
  });

  it("preserves optional fields including metadata and evidence", () => {
    const [e] = parseTrace(
      JSON.stringify([
        {
          id: "a",
          actor: "tool",
          kind: "test",
          summary: "tests",
          ts: "2026-01-01",
          run_id: "r1",
          evidence: ["log line", 5],
          metadata: { passed: 10 },
          output: "10 passed",
        },
      ]),
    );
    expect(e.run_id).toBe("r1");
    expect(e.evidence).toEqual(["log line"]); // non-strings filtered
    expect(e.metadata).toEqual({ passed: 10 });
    expect(e.output).toBe("10 passed");
  });

  it("throws naming the offending JSONL line on bad JSON", () => {
    const jsonl = '{"id":"a","actor":"agent","kind":"note","summary":"ok"}\n{not json}';
    expect(() => parseTrace(jsonl)).toThrow(/line 2/);
  });

  it("throws on a missing required field", () => {
    expect(() =>
      parseTrace(JSON.stringify([{ id: "a", actor: "agent", kind: "note" }])),
    ).toThrow(/missing required field "summary"/);
  });

  it("throws on an invalid kind", () => {
    expect(() =>
      parseTrace(JSON.stringify([{ id: "a", actor: "agent", kind: "explode", summary: "x" }])),
    ).toThrow(/invalid kind/);
  });

  it("throws on an invalid actor", () => {
    expect(() =>
      parseTrace(JSON.stringify([{ id: "a", actor: "wizard", kind: "note", summary: "x" }])),
    ).toThrow(/invalid actor/);
  });
});
