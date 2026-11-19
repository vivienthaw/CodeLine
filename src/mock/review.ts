import { PROBLEM } from "./problem";
import { QUIZ, type QuizQuestion } from "./quiz";

/**
 * Student review area (/me): sessions the signed-in student attended. Mock data only.
 *
 * Access rules
 *  - Live rounds (/join, /lobby, /play/*) need the campus network — unchanged.
 *  - Review, Progress and Rank work from anywhere once signed in with a student email.
 *  - Each session's review content is open for REVIEW_DAYS from the session date.
 *    After that the card is locked, but its numbers still count in Progress and Rank.
 *  - Review is read-only: nothing here changes scores or rank.
 */

export const REVIEW_DAYS = 30;
/** Badge turns orange when this many days or fewer are left. */
export const REVIEW_URGENT_DAYS = 3;

const DAY = 86_400_000;

export type Topic = "Loops" | "Arrays" | "Strings" | "Conditions";

export type ReviewSession = {
  id: string;
  title: string;
  /** ISO local date-time the session ran */
  date: string;
  topic: Topic;
  className: string;
  mode: "individual" | "team";
  /** team sessions only */
  team?: { name: string; members: string[] };
  /** your score — the team's score in a team session */
  score: number;
  rank: number;
  /** players (individual) or teams (team) ranked */
  of: number;
  /** first-try correct / attempted (0–1) */
  accuracy: number;
  wrongAttempts: number;
  /** average seconds to place your CodeLine line */
  avgLineSec: number;
  /** "absent" sessions give no review and no practice */
  attendance: "joined" | "absent";
  /** review content; empty once it's no longer kept (expired) or if absent */
  rounds: ReviewRound[];
};


/* ---------------- round content (read-only snapshot of what happened) ---------------- */

export type BoardLine = { n: number; pseudo: string; indent: number; java: string; explanation: string };

/** One drop of your snippet onto a slot. `at` = seconds since the round started. */
export type Attempt = { at: number; step: number; ok: boolean; points: number; speed?: number; by?: string };

/** Every round has a question id (what practice access is checked against) and whether you took part. */
type RoundBase = { id: string; participated: boolean };

export type CodeLineReview = RoundBase & {
  kind: "codeline";
  /** with squads, each squad gets its own problem — this is YOUR squad's board */
  squad?: { name: string; count: number };
  title: string;
  statement: string;
  timerSec: number;
  lines: BoardLine[];
  /** the line you (or your team) held */
  yourLine: number;
  attempts: Attempt[];
};

export type QuizItem = {
  n: number;
  kind: "mc" | "tf" | "match" | "fill";
  prompt: string;
  code?: string;
  /** MC options, shown with yours / the correct one marked */
  options?: string[];
  yours: string;
  correct: string;
  isCorrect: boolean;
  points: number;
  explanation: string;
  /** team sessions: who submitted the team's answer */
  by?: string;
  /** match: the correct pairs (practice shuffles the right side) */
  pairs?: { left: string; right: string }[];
  /** fill: accepted answers */
  accept?: string[];
};

export type QuizReview = RoundBase & { kind: "quiz"; title: string; items: QuizItem[] };
export type ReviewRound = CodeLineReview | QuizReview;

export const roundScore = (r: ReviewRound) =>
  !r.participated ? 0 : r.kind === "codeline" ? r.attempts.reduce((a, t) => a + t.points + (t.speed ?? 0), 0) : r.items.reduce((a, q) => a + q.points, 0);

const indentOf = (pseudo: string) => Math.floor((pseudo.length - pseudo.trimStart().length) / 4);

/** Week 10 replays the real game content (UI_SPEC problem + quiz). */
const W10_CODELINE: CodeLineReview = {
  id: "w10-r1-squad-b",
  participated: true,
  squad: { name: "Squad B", count: 2 },
  kind: "codeline",
  title: PROBLEM.title,
  statement: PROBLEM.statement,
  timerSec: 300,
  lines: PROBLEM.lines.map((l) => ({ n: l.line, pseudo: l.pseudo.trim(), indent: indentOf(l.pseudo), java: l.java, explanation: l.explanation })),
  yourLine: PROBLEM.assignedLine,
  attempts: [
    { at: 38, step: 3, ok: false, points: -10 },
    { at: 72, step: 6, ok: false, points: -10 },
    { at: 101, step: 4, ok: true, points: 100, speed: 35 },
  ],
};

function quizAnswer(q: QuizQuestion): string {
  switch (q.kind) {
    case "mc":
      return q.options[q.answer]!;
    case "tf":
      return q.answer ? "True" : "False";
    case "match":
      return q.left.map((l, i) => `${l} → ${q.right[q.answer[i]!]}`).join("\n");
    case "fill":
      return q.accept[0]!;
  }
}

/** What Vivi answered in the Week 10 quiz (index-aligned with QUIZ). */
const W10_ANSWERS: { yours: string; speed: number }[] = [
  { yours: "10", speed: 38 },
  { yours: "10 7 4", speed: 0 },
  { yours: "False", speed: 22 },
  { yours: "i++ → add 1 to i\ni % 2 == 0 → i is even\nsum += i → keep looping up to n\ni <= n → add i to the total", speed: 0 },
  { yours: "%", speed: 41 },
];

const W10_QUIZ: QuizReview = {
  id: "w10-r2",
  participated: true,
  kind: "quiz",
  title: "Loops quiz",
  items: QUIZ.map((q, i) => {
    const correct = quizAnswer(q);
    const a = W10_ANSWERS[i]!;
    const isCorrect = a.yours === correct;
    return {
      n: i + 1,
      kind: q.kind,
      prompt: q.prompt,
      code: q.code,
      options: q.kind === "mc" ? q.options : q.kind === "tf" ? ["True", "False"] : undefined,
      yours: a.yours,
      correct,
      isCorrect,
      points: isCorrect ? 100 + a.speed : 0,
      explanation: q.explanation,
      pairs: q.kind === "match" ? q.left.map((l, k) => ({ left: l, right: q.right[q.answer[k]!]! })) : undefined,
      accept: q.kind === "fill" ? q.accept : undefined,
    };
  }),
};

/** Round 3 ran after Vivi had left — it's in the session, but not reviewable or practisable for them. */
const W10_BONUS: QuizReview = {
  id: "w10-r3",
  participated: false,
  kind: "quiz",
  title: "Bonus round",
  items: [
    {
      n: 1,
      kind: "tf",
      prompt: "True or false: a for-each loop can change the array's length.",
      options: ["True", "False"],
      yours: "",
      correct: "False",
      isCorrect: false,
      points: 0,
      explanation: "An array's length is fixed when it's created.",
    },
  ],
};

const W9_CODELINE: CodeLineReview = {
  id: "w9-r1",
  participated: true,
  kind: "codeline",
  title: "Average of an array",
  statement: "Add up every value in the array nums, then print the average as a decimal.",
  timerSec: 300,
  lines: [
    ["SET total TO 0", 0, "int total = 0;", "The running total starts at zero."],
    ["FOR EACH value IN nums", 0, "for (int value : nums) {", "An enhanced for loop visits every element without an index."],
    ["ADD value TO total", 1, "total += value;", "Each element is added to the running total."],
    ["END FOR", 0, "}", "Closes the loop body."],
    ["SET avg TO total / LENGTH OF nums", 0, "double avg = (double) total / nums.length;", "Casting to double first stops integer division from dropping the decimals."],
    ["PRINT avg", 0, "System.out.println(avg);", "Printed once, after the loop has finished."],
  ].map(([pseudo, indent, java, explanation], i) => ({
    n: i + 1,
    pseudo: pseudo as string,
    indent: indent as number,
    java: java as string,
    explanation: explanation as string,
  })),
  yourLine: 5,
  attempts: [
    { at: 55, step: 3, ok: false, points: -10, by: "Mai Nguyen" },
    { at: 80, step: 5, ok: true, points: 100, speed: 28, by: "Mai Nguyen" },
  ],
};

const mc = (
  n: number,
  prompt: string,
  options: string[],
  answer: number,
  chose: number,
  speed: number,
  by: string,
  explanation: string,
  code?: string,
): QuizItem => ({
  n,
  kind: "mc",
  prompt,
  code,
  options,
  yours: options[chose]!,
  correct: options[answer]!,
  isCorrect: chose === answer,
  points: chose === answer ? 100 + speed : 0,
  explanation,
  by,
});

const W9_QUIZ: QuizReview = {
  id: "w9-r2",
  participated: true,
  kind: "quiz",
  title: "Arrays quiz",
  items: [
    mc(1, "What is the index of the first element?", ["0", "1", "-1", "It depends on the array"], 0, 0, 44, "Arjun Patel", "Java arrays are zero-indexed: the first element is nums[0]."),
    mc(2, "What does this print?", ["2", "3", "15", "4"], 1, 0, 0, "Sofia Rossi", "length counts the elements — there are three — it isn't the last index (2).", "int[] nums = {4, 8, 15};\nSystem.out.println(nums.length);"),
    mc(3, "What happens here?", ["a becomes {0, 0, 7}", "Compile error", "ArrayIndexOutOfBoundsException", "Nothing"], 2, 2, 19, "Vivi", "Valid indexes for a length-3 array are 0–2, so a[3] fails at run time.", "int[] a = new int[3];\na[3] = 7;"),
    mc(4, "What value does a new int array hold?", ["null", "0", "Random values", "-1"], 1, 1, 31, "Mai Nguyen", "Numeric arrays start filled with 0 (objects with null, booleans with false)."),
  ],
};

/** Midnight-anchored "n days ago at hh:00", so day counts don't flicker during the day. */
function daysAgo(n: number, hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

export const REVIEW_SESSIONS: ReviewSession[] = [
  {
    id: "w10-loops-arrays",
    title: "Week 10 — Loops & arrays",
    date: daysAgo(5, 10),
    topic: "Loops",
    className: "COSC1076 · Group A",
    mode: "individual",
    score: [W10_CODELINE, W10_QUIZ, W10_BONUS].reduce((a, r) => a + roundScore(r), 0),
    rank: 7,
    of: 40,
    accuracy: 0.5,
    wrongAttempts: 4,
    avgLineSec: 101,
    attendance: "joined",
    rounds: [W10_CODELINE, W10_QUIZ, W10_BONUS],
  },
  {
    id: "w9-arrays-team",
    title: "Week 9 — Arrays team battle",
    date: daysAgo(27, 14),
    topic: "Arrays",
    className: "COSC1076 · Group A",
    mode: "team",
    team: { name: "Null Pointers", members: ["Vivi", "Mai Nguyen", "Arjun Patel", "Sofia Rossi"] },
    score: [W9_CODELINE, W9_QUIZ].reduce((a, r) => a + roundScore(r), 0),
    rank: 3,
    of: 10,
    accuracy: 0.6,
    wrongAttempts: 2,
    avgLineSec: 80,
    attendance: "joined",
    rounds: [W9_CODELINE, W9_QUIZ],
  },
  {
    id: "w5-conditions",
    title: "Week 5 — Conditions",
    date: daysAgo(40, 10),
    topic: "Conditions",
    className: "COSC1076 · Group A",
    mode: "individual",
    score: 455,
    rank: 12,
    of: 38,
    accuracy: 0.6,
    wrongAttempts: 6,
    avgLineSec: 74,
    attendance: "joined",
    rounds: [],
  },
  {
    // Vivi missed this one: no review, no practice, and it doesn't count anywhere
    id: "w8-nested-loops",
    title: "Week 8 — Nested loops",
    date: daysAgo(12, 10),
    topic: "Loops",
    className: "COSC1076 · Group A",
    mode: "individual",
    score: 0,
    rank: 0,
    of: 37,
    accuracy: 0,
    wrongAttempts: 0,
    avgLineSec: 0,
    attendance: "absent",
    rounds: [],
  },
];

/** One of the demo student's sessions. */
export function getReviewSession(id: string) {
  return REVIEW_SESSIONS.find((s) => s.id === id);
}

/** Sessions you attended, newest first. Absent sessions never appear in My Sessions, Progress or Rank. */
export function reviewSessions() {
  return REVIEW_SESSIONS.filter((s) => s.attendance === "joined").sort((a, b) => b.date.localeCompare(a.date));
}

export type ReviewWindow = {
  /** last day the review can be opened */
  until: Date;
  /** whole days left, 0 on the last day; negative once expired */
  daysLeft: number;
  expired: boolean;
  urgent: boolean;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Open for REVIEW_DAYS calendar days counted from the session date. */
export function reviewWindow(s: Pick<ReviewSession, "date">, now = new Date()): ReviewWindow {
  const start = startOfDay(new Date(s.date));
  const until = new Date(start + REVIEW_DAYS * DAY);
  const daysLeft = Math.round((until.getTime() - startOfDay(now)) / DAY);
  const expired = daysLeft < 0;
  return { until, daysLeft, expired, urgent: !expired && daysLeft <= REVIEW_URGENT_DAYS };
}

/** "16 Dec 2026" */
export const fmtDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "Available until 16 Dec 2026 · 12 days left" / "· last day" / "Review expired" */
export function windowLabel(w: ReviewWindow) {
  if (w.expired) return "Review expired";
  const left = w.daysLeft === 0 ? "last day" : `${w.daysLeft} day${w.daysLeft === 1 ? "" : "s"} left`;
  return `Available until ${fmtDay(w.until)} · ${left}`;
}
