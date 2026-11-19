import { activeQuestions, type QuestionSet } from "./data";

export const MIN_STEPS = 2;
export const MIN_PAIRS = 2;
export const BLANK = "___";

export type StepIssue = { pseudo?: string; java?: string };
/** field key → message. Keys: prompt, statement, code, accept, option0..3, left:<pairId>, right:<pairId>, pairs */
export type FieldIssues = Record<string, string>;

export type Issues = {
  title?: string;
  tooFew?: string;
  /** CodeLine: step id → missing fields (errors: block Save) */
  steps: Record<string, StepIssue>;
  /** CodeLine: step id → other step numbers with the same snippet (warning) */
  dupes: Record<string, number[]>;
  /** Other modes: question id → field errors (block Save) */
  questions: Record<string, FieldIssues>;
  /** Other modes: question id → field warnings (Save still allowed) */
  warnings: Record<string, FieldIssues>;
  /** number of blocking errors */
  errorCount: number;
};

/** Text that differs only by spacing/case looks identical to students. */
const norm = (t: string) => t.trim().replace(/\s+/g, " ").toLowerCase();

function dupesIn(values: string[]): Set<number> {
  const seen = new Map<string, number[]>();
  values.forEach((v, i) => {
    const k = norm(v);
    if (k) seen.set(k, [...(seen.get(k) ?? []), i]);
  });
  return new Set([...seen.values()].filter((ix) => ix.length > 1).flat());
}

export function validateSet(set: QuestionSet): Issues {
  const issues: Issues = { steps: {}, dupes: {}, questions: {}, warnings: {}, errorCount: 0 };

  if (!set.title.trim()) {
    issues.title = "Give the set a title";
    issues.errorCount++;
  }

  if (set.mode === "codeline") {
    if (set.steps.length < MIN_STEPS) {
      issues.tooFew = `A CodeLine set needs at least ${MIN_STEPS} steps`;
      issues.errorCount++;
    }
    set.steps.forEach((st) => {
      const e: StepIssue = {};
      if (!st.pseudo.trim()) e.pseudo = "Pseudocode is required";
      if (!st.java.trim()) e.java = "Java snippet is required";
      if (e.pseudo || e.java) {
        issues.steps[st.id] = e;
        issues.errorCount += Number(!!e.pseudo) + Number(!!e.java);
      }
    });
    const byCode = new Map<string, number[]>();
    set.steps.forEach((st, i) => {
      const k = st.java.trim().replace(/\s+/g, " ");
      if (k) byCode.set(k, [...(byCode.get(k) ?? []), i]);
    });
    for (const idxs of byCode.values()) {
      if (idxs.length < 2) continue;
      for (const i of idxs) issues.dupes[set.steps[i]!.id] = idxs.filter((j) => j !== i).map((j) => j + 1);
    }
    return issues;
  }

  const qs = activeQuestions(set);
  if (qs.length === 0) {
    issues.tooFew = "Add at least one question";
    issues.errorCount++;
  }

  for (const q of qs) {
    const e: FieldIssues = {};
    const w: FieldIssues = {};
    switch (q.kind) {
      case "mc": {
        if (!q.prompt.trim()) e.prompt = "Write the question";
        q.options.forEach((o, i) => {
          if (!o.trim()) e[`option${i}`] = `Option ${"ABCD"[i]} is empty`;
        });
        const d = dupesIn(q.options);
        d.forEach((i) => (w[`option${i}`] = "Same text as another option"));
        break;
      }
      case "tf":
        if (!q.statement.trim()) e.statement = "Write the statement students judge";
        break;
      case "match": {
        if (!q.prompt.trim()) e.prompt = "Write the instruction";
        if (q.pairs.length < MIN_PAIRS) e.pairs = `Add at least ${MIN_PAIRS} pairs`;
        q.pairs.forEach((p) => {
          if (!p.left.trim()) e[`left:${p.id}`] = "Code is required";
          if (!p.right.trim()) e[`right:${p.id}`] = "Meaning is required";
        });
        dupesIn(q.pairs.map((p) => p.left)).forEach((i) => (w[`left:${q.pairs[i]!.id}`] = "Same code as another pair"));
        dupesIn(q.pairs.map((p) => p.right)).forEach((i) => (w[`right:${q.pairs[i]!.id}`] = "Same meaning as another pair"));
        break;
      }
      case "fill": {
        if (!q.prompt.trim()) e.prompt = "Write the instruction";
        const blanks = q.code.split(BLANK).length - 1;
        if (!q.code.trim()) e.code = `Write the code and mark the gap with ${BLANK}`;
        else if (blanks === 0) e.code = `Mark the gap with ${BLANK} (three underscores)`;
        else if (blanks > 1) e.code = `Only one ${BLANK} per question — found ${blanks}`;
        if (!q.accept.some((a) => a.trim())) e.accept = "Add at least one accepted answer";
        break;
      }
    }
    if (Object.keys(e).length) {
      issues.questions[q.id] = e;
      issues.errorCount += Object.keys(e).length;
    }
    if (Object.keys(w).length) issues.warnings[q.id] = w;
  }

  return issues;
}
