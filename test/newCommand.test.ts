import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Writable } from "node:stream";
import { runNew } from "../src/newCommand.js";

// Drive the interactive flow in-process with scripted stdin, so the whole
// question -> file path is exercised without spawning a shell. readline's
// question() only catches the *next* line event, so answers must be fed one at
// a time — we watch the output for a prompt (ends in ": " or "> ") and push the
// next scripted answer in response, perfectly synchronized to the questions.
function drive(answers: string[]): { input: PassThrough; output: Writable } {
  const input = new PassThrough();
  let i = 0;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (/[:>] $/.test(chunk.toString())) {
        const line = answers[i++] ?? "."; // run dry -> skip remaining sections
        setImmediate(() => input.write(line + "\n"));
      }
      cb();
    },
  });
  return { input, output };
}

describe("runNew (interactive authoring)", () => {
  const dirs: string[] = [];
  const mkTmp = () => {
    const d = mkdtempSync(join(tmpdir(), "closedtab-"));
    dirs.push(d);
    return d;
  };
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it("writes a dated aar-<slug>.md from scripted answers", async () => {
    const dir = mkTmp();
    const answers = [
      "", // branch (Enter -> git default or blank)
      "", // PR
      "", // commit
      "the W column showed season totals", ".", // reported
      "`_aggregate_pitcher_rows` copied season W/L", ".", // root cause
      "edited `o27v2/web/app.py`", ".", // fix
      ".", // not_done -> skipped
      "ran `pytest o27v2/tests`", ".", // validation
    ];
    const path = await runNew({ type: "bugfix", title: "Fix pitcher W/L", dir }, drive(answers));

    expect(path).toBe(join(dir, "aar-fix-pitcher-w-l.md"));
    const md = readFileSync(path, "utf8");
    expect(md).toContain("# AAR — Fix pitcher W/L");
    expect(md).toContain("## Root cause");
    expect(md).toContain("`_aggregate_pitcher_rows` copied season W/L");
    expect(md).toContain("edited `o27v2/web/app.py`");
    // skipped section keeps its guidance comment
    expect(md).toMatch(/## What I did NOT do[\s\S]*<!--/);
  });

  it("does not overwrite an existing AAR — picks a -2 suffix", async () => {
    const dir = mkTmp();
    const base = ["", "", "", ".", ".", ".", "."]; // branch/pr/commit + skip 4 sections
    const p1 = await runNew({ type: "generic", title: "Same title", dir }, drive(base));
    const p2 = await runNew({ type: "generic", title: "Same title", dir }, drive(base));
    expect(p1).toBe(join(dir, "aar-same-title.md"));
    expect(p2).toBe(join(dir, "aar-same-title-2.md"));
    expect(readdirSync(dir).sort()).toEqual([
      "aar-same-title-2.md",
      "aar-same-title.md",
    ]);
  });
});
