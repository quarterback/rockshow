import { describe, it, expect } from "vitest";
import {
  extractFiles,
  extractCommands,
  extractTools,
  extractCommits,
  extractPrs,
  extractBranches,
  extractQuoted,
  extractVerbs,
  extractEntities,
} from "../src/entities.js";

// Entity extraction is the highest-value part of the parser, so it is tested
// against real identifier strings drawn from the AAR corpus.

describe("extractFiles", () => {
  it("captures slash paths with extensions", () => {
    expect(extractFiles("edited `o27v2/web/app.py` today")).toContain("o27v2/web/app.py");
  });
  it("captures bare filenames with known extensions", () => {
    expect(extractFiles("touched app.py and README.md")).toEqual(
      expect.arrayContaining(["app.py", "README.md"]),
    );
  });
  it("strips a trailing line range", () => {
    expect(extractFiles("see o27v2/web/app.py:1995-1999")).toContain("o27v2/web/app.py");
  });
  it("captures special files without extensions", () => {
    expect(extractFiles("updated the Dockerfile and .replit")).toEqual(
      expect.arrayContaining(["Dockerfile", ".replit"]),
    );
  });
  it("does not treat a plain word as a file", () => {
    expect(extractFiles("this is just prose")).toEqual([]);
  });
});

describe("extractCommands", () => {
  it("captures backticked shell commands", () => {
    expect(extractCommands("ran `pytest o27v2/tests` to check")).toContain(
      "pytest o27v2/tests",
    );
  });
  it("captures lines beginning with a shell verb", () => {
    expect(extractCommands("git commit -m wip\nnpm run build")).toEqual(
      expect.arrayContaining(["git commit -m wip", "npm run build"]),
    );
  });
  it("ignores prose that merely mentions git", () => {
    expect(extractCommands("the git history shows nothing")).toEqual([]);
  });
});

describe("extractTools", () => {
  it("captures snake_case and dunder identifiers", () => {
    expect(extractTools("the `_pick_decisions` and `_aggregate_pitcher_rows` helpers")).toEqual(
      expect.arrayContaining(["_pick_decisions", "_aggregate_pitcher_rows"]),
    );
  });
  it("captures function names with parens, stripping the parens", () => {
    expect(extractTools("called `game_detail()`")).toContain("game_detail");
  });
  it("does not treat a plain backticked word as a tool", () => {
    expect(extractTools("the `column` renders")).toEqual([]);
  });
  it("does not treat a backticked file as a tool", () => {
    expect(extractTools("`app.py` was edited")).toEqual([]);
  });
});

describe("extractCommits", () => {
  it("captures backticked short hashes", () => {
    expect(extractCommits("shipped in `b1787ef`")).toContain("b1787ef");
  });
  it("captures bare hashes that contain a digit", () => {
    expect(extractCommits("see commit d8eb5aa for the data change")).toContain("d8eb5aa");
  });
  it("does not match english words that are valid hex", () => {
    expect(extractCommits("the facade and the deadbeef were fine")).toEqual([]);
  });
});

describe("extractPrs", () => {
  it("captures #-prefixed PR numbers", () => {
    expect(extractPrs("landed in #73 and #88")).toEqual(["#73", "#88"]);
  });
});

describe("extractBranches", () => {
  it("captures claude/* branches", () => {
    expect(extractBranches("on `claude/fix-seconds-calculation-HszBM`")).toContain(
      "claude/fix-seconds-calculation-HszBM",
    );
  });
  it("captures a token after the word branch", () => {
    expect(extractBranches("branch main was used")).toContain("main");
  });
});

describe("extractQuoted", () => {
  it("captures double-quoted spans", () => {
    expect(extractQuoted('the task was "fully fund men to match women"')).toContain(
      "fully fund men to match women",
    );
  });
});

describe("extractVerbs", () => {
  it("matches closed-list action verbs", () => {
    expect(extractVerbs("I edited and ran and tested the thing")).toEqual(
      expect.arrayContaining(["edited", "ran", "tested"]),
    );
  });
  it("does not match non-verbs", () => {
    expect(extractVerbs("a quiet sentence")).toEqual([]);
  });
});

describe("extractEntities", () => {
  it("extracts a realistic mixed claim end-to-end", () => {
    const e = extractEntities(
      "Edited `o27v2/web/app.py` in `game_detail`, shipped as `b1787ef` (PR #73)",
    );
    expect(e.files).toContain("o27v2/web/app.py");
    expect(e.tools).toContain("game_detail");
    expect(e.commits).toContain("b1787ef");
    expect(e.prs).toContain("#73");
    expect(e.verbs).toEqual(expect.arrayContaining(["edited", "shipped"]));
  });
});
