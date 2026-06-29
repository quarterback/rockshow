// AAR authoring templates. Each template is an ordered list of sections; each
// section carries the guidance that teaches the practice (shown as the prompt
// during interactive authoring, and written into the file as an HTML comment
// when a section is left blank, so even a skipped section still instructs).
//
// The section set mirrors the real corpus the author writes against
// (~280 aar-*.md files): the three load-bearing parts are the ask, what
// changed, and — the signature move — what was deliberately NOT done.

export type SectionSpec = {
  id: string;
  heading: string;
  guidance: string;
};

export type Template = {
  id: string;
  label: string;
  description: string;
  sections: SectionSpec[];
};

// Reused sections, so guidance stays consistent across templates.
const ASK: SectionSpec = {
  id: "asked",
  heading: "What was asked for",
  guidance:
    "The request in the asker's own words. One or two sentences — what did they actually want?",
};

const NEGATIVE_SPACE: SectionSpec = {
  id: "not_done",
  heading: "What I did NOT do",
  guidance:
    "The honest part: things you deliberately did not change, follow-ups you're punting, known gaps. This is the highest-value section — it stops future-you (or the next person) from wondering whether you missed something or chose to skip it.",
};

const VALIDATION: SectionSpec = {
  id: "validation",
  heading: "Validation",
  guidance:
    "How you know it works: tests you ran, what you checked by hand. \"Didn't verify X\" is a valid and useful answer.",
};

export const TEMPLATES: Template[] = [
  {
    id: "generic",
    label: "Generic / minimal",
    description: "The core sections only — a good default for any task.",
    sections: [
      ASK,
      {
        id: "changed",
        heading: "What changed",
        guidance:
          "What you actually did. Name the files you touched with exact paths so it's findable later.",
      },
      NEGATIVE_SPACE,
      VALIDATION,
    ],
  },
  {
    id: "bugfix",
    label: "Bug fix",
    description: "A fix: symptom, root cause, the change, validation.",
    sections: [
      {
        id: "reported",
        heading: "What was reported",
        guidance:
          "The symptom as observed, ideally in the reporter's words. What looked wrong?",
      },
      {
        id: "root_cause",
        heading: "Root cause",
        guidance:
          "What was actually wrong underneath — not the symptom, the cause. Name the file/function.",
      },
      {
        id: "fix",
        heading: "The fix",
        guidance: "What you changed to address the root cause. Exact paths.",
      },
      { ...NEGATIVE_SPACE, heading: "What I did NOT do / follow-ups" },
      VALIDATION,
    ],
  },
  {
    id: "feature",
    label: "Feature / what was built",
    description: "New work: what shipped, design decisions, validation.",
    sections: [
      ASK,
      {
        id: "built",
        heading: "What was built",
        guidance:
          "What shipped. List files touched or added with exact paths.",
      },
      {
        id: "design",
        heading: "Design decisions / trade-offs",
        guidance:
          "Choices worth recording and why — what you considered and rejected. Future-you will ask \"why did I do it this way.\"",
      },
      { ...NEGATIVE_SPACE, heading: "What I did NOT do / follow-ups" },
      VALIDATION,
    ],
  },
  {
    id: "investigation",
    label: "Investigation",
    description: "A look into something: findings, verdicts, follow-ups.",
    sections: [
      {
        id: "question",
        heading: "The question",
        guidance: "What prompted this — the question you set out to answer.",
      },
      {
        id: "found",
        heading: "What I found",
        guidance: "The findings. Be concrete; cite files/lines.",
      },
      {
        id: "verdict",
        heading: "Bug vs. working-as-intended",
        guidance:
          "For each finding: is it actually a bug, or behaving as designed? Distinguishing these is the whole point of an investigation.",
      },
      {
        id: "followups",
        heading: "Recommended follow-ups (not done)",
        guidance: "What should happen next that you did NOT do here.",
      },
      {
        id: "notes",
        heading: "Notes / things to remember",
        guidance: "Anything the next person needs to know.",
      },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
