// Authoritative types for the AAR Reconciliation Tool.
//
// The core is a pure function (testimony, trace) -> diff. These types describe
// the trace input, the intermediate claim representation the matcher operates
// on, and the reconciliation diff that is the tool's only output.

// ---- Trace input (canonical; vendor adapters come later) ----
export type TraceActor = "agent" | "human" | "tool" | "system";

export type TraceKind =
  | "prompt"
  | "tool_call"
  | "file_read"
  | "file_write"
  | "command"
  | "git_diff"
  | "test"
  | "network"
  | "decision"
  | "error"
  | "note";

export type TraceEvent = {
  id: string;
  ts?: string;
  run_id?: string;
  actor: TraceActor;
  kind: TraceKind;
  summary: string;
  target?: string; // e.g. a file path, a command, a URL
  input?: unknown;
  output?: unknown;
  evidence?: string[];
  metadata?: Record<string, unknown>;
};

// ---- Intermediate representation ----
// A claim is one assertion extracted from the testimony. The matcher operates on
// ExtractedClaim[] x TraceEvent[]. This intermediate object keeps the matcher
// readable and keeps matching logic separate from parsing.
export type ClaimKind =
  | "action" //    "ran the suite", "edited app.py", "added a column"
  | "intent" //    from the intent section: what was asked
  | "non_action" //from negative space: deliberately not done
  | "statement"; //supporting prose

export type ClaimSection =
  | "intent"
  | "claimed_actions"
  | "negative_space"
  | "other";

export type ClaimEntities = {
  files: string[]; //    extracted paths, e.g. "o27v2/web/app.py"
  commands: string[]; // extracted shell-ish commands
  tools: string[]; //    tool/function names, e.g. "_pick_decisions"
  commits: string[]; //  hashes
  prs: string[]; //      "#73"
  branches: string[];
  quoted: string[]; //   quoted task names / strings
  verbs: string[]; //    action verbs matched (edited, ran, added, removed, tested)
};

export type ExtractedClaim = {
  id: string; //         stable within a run, e.g. "claim-003"
  text: string; //       the sentence/clause as written
  section: ClaimSection;
  kind: ClaimKind;
  heading?: string; //   the heading this claim was extracted under (origin hint)
  entities: ClaimEntities;
};

// ---- Output (authoritative) ----
export type ReconciliationStatus =
  | "aligned"
  | "partial"
  | "contradicted"
  | "insufficient_trace";

export type MatchConfidence = "high" | "medium" | "low";

export type ClaimCheck = {
  claim: string;
  matched_events: string[]; // TraceEvent.id[]
  confidence: MatchConfidence;
};

export type TraceOmission = {
  event_id: string;
  summary: string;
  reason: string; // why this looks like an unmentioned action
};

export type UnsupportedClaim = {
  claim: string;
  reason: string; // why no trace evidence was found
};

export type ContradictedClaim = {
  claim: string;
  trace_evidence: string[]; // TraceEvent.id[] that contradict it
  reason: string;
};

export type EvidenceGap = {
  issue: string;
  missing_evidence: string;
};

export type ReconciliationDiff = {
  run_id?: string;
  status: ReconciliationStatus;
  summary: string;

  claimed_actions: ClaimCheck[];
  omitted_actions: TraceOmission[];
  unsupported_claims: UnsupportedClaim[];
  contradicted_claims: ContradictedClaim[];
  evidence_gaps: EvidenceGap[];

  review: {
    needs_human_review: boolean;
    reasons: string[];
    recommended_next_questions: string[];
  };
};
