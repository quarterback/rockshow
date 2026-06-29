import type {
  ExtractedClaim,
  TraceEvent,
  ReconciliationDiff,
  ClaimCheck,
  TraceOmission,
  UnsupportedClaim,
  ContradictedClaim,
  EvidenceGap,
  MatchConfidence,
  ReconciliationStatus,
} from "./types.js";

// Consequential trace events: the ones whose absence from the testimony is a
// real omission, and whose presence makes a trace checkable. Reads, prompts and
// notes are excluded by design.
const CONSEQUENTIAL: ReadonlySet<string> = new Set([
  "file_write",
  "command",
  "git_diff",
  "network",
]);

const LEVEL_NAME: Record<number, MatchConfidence> = {
  3: "high",
  2: "medium",
  1: "low",
};

const lc = (s: string | undefined): string => (s ?? "").toLowerCase();
const normPath = (s: string): string => s.trim().replace(/^\.\//, "").toLowerCase();

function metaString(ev: TraceEvent): string {
  let s = "";
  if (ev.metadata) {
    try {
      s += " " + JSON.stringify(ev.metadata);
    } catch {
      /* ignore unserializable metadata */
    }
  }
  return s.toLowerCase();
}

/**
 * Score how strongly one claim matches one event. Strongest signal wins:
 *   3 high   : an exact identifier match (file path == event target, command
 *              == command event, commit/PR token present in summary/metadata)
 *   2 medium : an identifier appears as a substring of summary/target
 *   1 low    : only a verb or quoted token overlaps; no identifier anchor
 *   0 none
 * The matcher is deliberately plain so a reader can see why a claim matched.
 */
export function matchLevel(claim: ExtractedClaim, ev: TraceEvent): number {
  const e = claim.entities;
  const target = ev.target ?? "";
  const tNorm = normPath(target);
  const tLc = lc(target).trim();
  const sLc = lc(ev.summary).trim();
  const hay = `${lc(ev.summary)}\n${lc(target)}`;
  const summaryAndMeta = `${lc(ev.summary)} ${metaString(ev)}`;

  // ---- HIGH: exact identifier match ----
  if (ev.kind === "file_write" || ev.kind === "file_read" || ev.kind === "git_diff") {
    for (const f of e.files) {
      if (tNorm && normPath(f) === tNorm) return 3;
    }
  }
  if (ev.kind === "command" || ev.kind === "test" || ev.kind === "tool_call") {
    for (const c of e.commands) {
      const cN = lc(c).trim();
      if (cN && (cN === tLc || cN === sLc)) return 3;
    }
  }
  for (const tok of [...e.commits, ...e.prs]) {
    if (tok && summaryAndMeta.includes(lc(tok))) return 3;
  }

  // ---- MEDIUM: identifier substring ----
  for (const f of e.files) {
    if (f && hay.includes(normPath(f))) return 2;
  }
  for (const c of e.commands) {
    if (c && hay.includes(lc(c))) return 2;
  }
  for (const t of e.tools) {
    if (t && hay.includes(lc(t))) return 2;
  }
  for (const tok of [...e.commits, ...e.prs, ...e.branches]) {
    if (tok && hay.includes(lc(tok))) return 2;
  }

  // ---- LOW: verb or quoted-token overlap only ----
  for (const v of e.verbs) {
    if (new RegExp(`\\b${v}\\b`).test(sLc)) return 1;
  }
  for (const q of e.quoted) {
    if (q && hay.includes(lc(q))) return 1;
  }

  return 0;
}

function unsupportedReason(claim: ExtractedClaim): string {
  const e = claim.entities;
  if (e.files.length) {
    return `claimed work on ${e.files.join(", ")}; no file_write/git_diff/command event targets it`;
  }
  if (e.commands.length) {
    return `claimed command ${e.commands.map((c) => `\`${c}\``).join(", ")}; no command/test event matches it`;
  }
  if (e.tools.length) {
    return `claimed work on ${e.tools.join(", ")}; not found in any event summary`;
  }
  if (e.commits.length || e.prs.length) {
    return `referenced ${[...e.commits, ...e.prs].join(", ")}; not present in any event summary or metadata`;
  }
  return `no file/command/identifier anchor in this claim matched any trace event`;
}

const TEST_CLAIM_RE = /\b(pass(?:ed|es|ing)?|green|red|suite|all tests|tests? (?:pass|ran|run))\b/i;
const PASSFAIL_RE = /\b(pass|passed|passing|fail|failed|failing|ok|green|red|\d+\s*(?:passed|failed))\b/i;

function testEventHasResult(ev: TraceEvent): boolean {
  if (ev.metadata && typeof ev.metadata === "object") {
    const m = ev.metadata as Record<string, unknown>;
    if (typeof m.passed === "boolean") return true;
    if (typeof m.failed === "number" || typeof m.passed === "number") return true;
    if (typeof m.result === "string" && PASSFAIL_RE.test(m.result)) return true;
  }
  const out = typeof ev.output === "string" ? ev.output : "";
  if (out && PASSFAIL_RE.test(out)) return true;
  if (PASSFAIL_RE.test(ev.summary)) return true;
  return false;
}

/**
 * The pure core. Match every claim against the trace and assemble the
 * reconciliation diff. Deterministic; no network, no LLM. The later
 * LLM-assisted matching mode would plug in alongside matchLevel(), behind the
 * same ExtractedClaim x TraceEvent interface.
 */
export function reconcile(
  claims: ExtractedClaim[],
  trace: TraceEvent[],
): ReconciliationDiff {
  // Level matrix: levels[i][j] = how strongly claim i matches event j.
  const levels = claims.map((c) => trace.map((ev) => matchLevel(c, ev)));

  const bestLevel = (i: number): number =>
    levels[i].reduce((max, l) => Math.max(max, l), 0);
  const eventsAtBest = (i: number): string[] => {
    const best = bestLevel(i);
    if (best === 0) return [];
    return trace.filter((_, j) => levels[i][j] === best).map((ev) => ev.id);
  };

  // An event is "covered" if some claim mentions it at medium/high (>= 2).
  const coveredEventIds = new Set<string>();
  claims.forEach((_, i) => {
    trace.forEach((ev, j) => {
      if (levels[i][j] >= 2) coveredEventIds.add(ev.id);
    });
  });

  const claimed_actions: ClaimCheck[] = [];
  const unsupported_claims: UnsupportedClaim[] = [];
  const contradicted_claims: ContradictedClaim[] = [];
  const evidence_gaps: EvidenceGap[] = [];

  const hasTestEvent = trace.some((ev) => ev.kind === "test");
  const seenGapClaims = new Set<string>();

  claims.forEach((claim, i) => {
    const best = bestLevel(i);
    const matched = eventsAtBest(i);

    if (claim.kind === "action" || claim.kind === "intent") {
      // Evidence gap: a "tests passed" style claim where a test event exists
      // but records no pass/fail result. The pass/fail is unverifiable from the
      // trace as given, that is a gap, not an unsupported claim.
      const isEvidenceGap =
        TEST_CLAIM_RE.test(claim.text) &&
        hasTestEvent &&
        !trace.some((ev) => ev.kind === "test" && testEventHasResult(ev));

      if (isEvidenceGap && !seenGapClaims.has(claim.text)) {
        seenGapClaims.add(claim.text);
        evidence_gaps.push({
          issue: claim.text,
          missing_evidence:
            "a test event is present but its output records no pass/fail result",
        });
      }

      if (best >= 1) {
        claimed_actions.push({
          claim: claim.text,
          matched_events: matched,
          confidence: LEVEL_NAME[best],
        });
      } else if (!isEvidenceGap) {
        // Unsupported: an action claim with no match, or an intent claim that
        // asserts work was actually done (carries an action verb).
        const assertsWork =
          claim.kind === "action" || claim.entities.verbs.length > 0;
        if (assertsWork) {
          unsupported_claims.push({
            claim: claim.text,
            reason: unsupportedReason(claim),
          });
        }
      }
    }

    if (claim.kind === "non_action") {
      // Contradiction: testimony says NOT done, trace shows a consequential
      // event on the same target. Only on a real target collision (level >= 2).
      const collisions = trace.filter(
        (ev, j) => levels[i][j] >= 2 && CONSEQUENTIAL.has(ev.kind),
      );
      if (collisions.length) {
        const target = collisions[0].target ?? collisions[0].summary;
        contradicted_claims.push({
          claim: claim.text,
          trace_evidence: collisions.map((ev) => ev.id),
          reason: `testimony states this was deliberately not done, but the trace shows a ${collisions[0].kind} on ${target}`,
        });
      }
    }

    if (claim.kind === "action") {
      // Contradiction: claim asserts a specific file changed, but a git_diff
      // event for that file shows no change (when that signal is present).
      for (const f of claim.entities.files) {
        const noChange = trace.find(
          (ev) =>
            ev.kind === "git_diff" &&
            ev.target &&
            normPath(ev.target) === normPath(f) &&
            gitDiffShowsNoChange(ev),
        );
        if (noChange) {
          contradicted_claims.push({
            claim: claim.text,
            trace_evidence: [noChange.id],
            reason: `testimony claims a change to ${f}, but the git_diff event for it shows no change`,
          });
        }
      }
    }
  });

  // Omissions: consequential events no claim mentions.
  const omitted_actions: TraceOmission[] = trace
    .filter((ev) => CONSEQUENTIAL.has(ev.kind) && !coveredEventIds.has(ev.id))
    .map((ev) => ({
      event_id: ev.id,
      summary: ev.summary,
      reason: `consequential ${ev.kind} event present in the trace but not mentioned in the testimony`,
    }));

  // ---- Status ----
  const consequentialCount = trace.filter((ev) => CONSEQUENTIAL.has(ev.kind)).length;
  const actionClaims = claims.filter((c) => c.kind === "action");
  const actionClaimIdx = claims
    .map((c, i) => (c.kind === "action" ? i : -1))
    .filter((i) => i >= 0);

  let status: ReconciliationStatus;
  if (consequentialCount === 0 && actionClaims.length >= 1) {
    status = "insufficient_trace";
  } else if (contradicted_claims.length > 0) {
    status = "contradicted";
  } else if (
    actionClaimIdx.every((i) => bestLevel(i) >= 2) &&
    omitted_actions.length === 0
  ) {
    status = "aligned";
  } else {
    status = "partial";
  }

  // ---- Review block ----
  const reasons: string[] = [];
  if (status === "contradicted") reasons.push("the testimony contradicts the trace");
  if (status === "insufficient_trace")
    reasons.push("the trace has no consequential events to verify action claims against");
  if (unsupported_claims.length)
    reasons.push(`${unsupported_claims.length} claim(s) have no trace evidence`);
  if (omitted_actions.length)
    reasons.push(`${omitted_actions.length} trace action(s) go unmentioned in the testimony`);

  const needs_human_review =
    status === "contradicted" ||
    status === "insufficient_trace" ||
    unsupported_claims.length > 0 ||
    omitted_actions.length > 0;

  const recommended_next_questions = buildQuestions(
    status,
    omitted_actions,
    unsupported_claims,
    contradicted_claims,
  );

  const summary =
    `${status}: ${claimed_actions.length} claimed action(s) verified, ` +
    `${unsupported_claims.length} unsupported, ${omitted_actions.length} omitted, ` +
    `${contradicted_claims.length} contradicted, ${evidence_gaps.length} evidence gap(s).`;

  const diff: ReconciliationDiff = {
    status,
    summary,
    claimed_actions,
    omitted_actions,
    unsupported_claims,
    contradicted_claims,
    evidence_gaps,
    review: {
      needs_human_review,
      reasons,
      recommended_next_questions,
    },
  };

  const runId = trace.find((ev) => ev.run_id)?.run_id;
  if (runId) diff.run_id = runId;

  return diff;
}

function gitDiffShowsNoChange(ev: TraceEvent): boolean {
  if (ev.metadata && typeof ev.metadata === "object") {
    const m = ev.metadata as Record<string, unknown>;
    if (m.changed === false) return true;
    if (m.lines_changed === 0) return true;
  }
  const out = typeof ev.output === "string" ? ev.output.toLowerCase() : "";
  if (/\b(no change|no diff|unchanged|0 files changed)\b/.test(out)) return true;
  if (/\b(no change|no diff|unchanged)\b/.test(ev.summary.toLowerCase())) return true;
  return false;
}

function buildQuestions(
  status: ReconciliationStatus,
  omitted: TraceOmission[],
  unsupported: UnsupportedClaim[],
  contradicted: ContradictedClaim[],
): string[] {
  const qs: string[] = [];
  for (const o of omitted) {
    qs.push(
      `The trace shows a ${o.summary ? `"${o.summary}"` : o.event_id} ${"action"} but the AAR doesn't mention it, was this part of the task?`,
    );
  }
  for (const u of unsupported) {
    qs.push(
      `The AAR claims "${u.claim}" but the trace has no matching evidence, did this actually happen?`,
    );
  }
  for (const c of contradicted) {
    qs.push(
      `The AAR says "${c.claim}", but the trace shows otherwise, which account is correct?`,
    );
  }
  if (status === "insufficient_trace") {
    qs.push(
      "The trace has no file-write/command/git_diff events to verify the AAR against, can you attach a fuller trace?",
    );
  }
  return qs;
}
