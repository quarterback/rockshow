import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcileText } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "..", "examples");

// The fixtures ARE the spec: each example dir holds a testimony, a synthetic
// trace, and the diff the core must produce. These tests assert that
// reconcile() reproduces diff.expected.json exactly.
describe("reconcile fixtures", () => {
  const dirs = readdirSync(examplesDir).filter((d) =>
    existsSync(join(examplesDir, d, "diff.expected.json")),
  );

  it("has fixtures to run", () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  for (const dir of dirs) {
    it(`${dir}: matches diff.expected.json`, () => {
      const base = join(examplesDir, dir);
      const testimony = readFileSync(join(base, "testimony.md"), "utf8");
      const traceFile = existsSync(join(base, "trace.jsonl"))
        ? join(base, "trace.jsonl")
        : join(base, "trace.json");
      const trace = readFileSync(traceFile, "utf8");
      const expected = JSON.parse(readFileSync(join(base, "diff.expected.json"), "utf8"));

      const actual = reconcileText(testimony, trace);
      expect(actual).toEqual(expected);
    });
  }
});

// The three behaviors the spec requires to hold across the fixtures.
describe("required behaviors", () => {
  const read = (dir: string, file: string) =>
    readFileSync(join(examplesDir, dir, file), "utf8");

  it("behavior 1: a claimed test with no test/command evidence is unsupported", () => {
    const diff = reconcileText(
      read("unsupported", "testimony.md"),
      read("unsupported", "trace.jsonl"),
    );
    expect(diff.unsupported_claims.some((u) => /pytest|suite/i.test(u.claim))).toBe(true);
  });

  it("behavior 2: trace writes/commands the testimony omits become omitted_actions", () => {
    const diff = reconcileText(
      read("omission", "testimony.md"),
      read("omission", "trace.jsonl"),
    );
    expect(diff.omitted_actions.length).toBeGreaterThan(0);
  });

  it("behavior 3: a trace too thin to check yields insufficient_trace", () => {
    const diff = reconcileText(
      read("insufficient", "testimony.md"),
      read("insufficient", "trace.jsonl"),
    );
    expect(diff.status).toBe("insufficient_trace");
  });

  it("a deliberate non-action contradicted by the trace is a contradiction", () => {
    const diff = reconcileText(
      read("contradiction", "testimony.md"),
      read("contradiction", "trace.jsonl"),
    );
    expect(diff.status).toBe("contradicted");
    expect(diff.contradicted_claims.length).toBeGreaterThan(0);
  });

  it("a matching testimony is aligned", () => {
    const diff = reconcileText(read("basic", "testimony.md"), read("basic", "trace.jsonl"));
    expect(diff.status).toBe("aligned");
  });
});
