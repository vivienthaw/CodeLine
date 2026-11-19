/** Round 2 quiz (UI_SPEC §6): 5 questions × 0:30, one of each variant + an extra multiple choice. */

export type QuizKind = "mc" | "tf" | "match" | "fill";

type Base = {
  id: string;
  prompt: string;
  code?: string;
  explanation: string;
  /** Mock share of the class that answers correctly (drives boss damage + combo). */
  classCorrect: number;
};

export type McQuestion = Base & { kind: "mc"; options: string[]; answer: number };
export type TfQuestion = Base & { kind: "tf"; answer: boolean };
export type MatchQuestion = Base & {
  kind: "match";
  left: string[];
  /** Shown in this (shuffled) order. */
  right: string[];
  /** answer[leftIndex] = rightIndex */
  answer: number[];
};
export type FillQuestion = Base & {
  kind: "fill";
  /** Code containing exactly one "___" marking the blank. */
  code: string;
  accept: string[];
};

export type QuizQuestion = McQuestion | TfQuestion | MatchQuestion | FillQuestion;

export const QUESTION_MS = 30_000;
export const REVEAL_MS = 5_000;

export const QUIZ: QuizQuestion[] = [
  {
    id: "q1",
    kind: "mc",
    prompt: "What does this loop print?",
    code: "int sum = 0;\nfor (int i = 1; i <= 4; i++) {\n    sum += i;\n}\nSystem.out.println(sum);",
    options: ["4", "10", "6", "15"],
    answer: 1,
    explanation: "The loop adds 1 + 2 + 3 + 4, so sum ends at 10.",
    classCorrect: 0.82,
  },
  {
    id: "q2",
    kind: "mc",
    prompt: "What does this loop print?",
    code: 'for (int i = 10; i > 0; i -= 3) {\n    System.out.print(i + " ");\n}',
    options: ["10 7 4 1", "10 7 4", "9 6 3", "10 7 4 1 -2"],
    answer: 0,
    explanation: "i goes 10, 7, 4, 1 — the next value, −2, fails i > 0 so the loop stops.",
    classCorrect: 0.64,
  },
  {
    id: "q3",
    kind: "tf",
    prompt: "True or false: this loop body runs exactly 5 times.",
    code: "for (int i = 0; i <= 5; i++) {\n    System.out.println(i);\n}",
    answer: false,
    explanation: "With i <= 5 it runs for i = 0, 1, 2, 3, 4, 5 — that's 6 times. Use i < 5 for five.",
    classCorrect: 0.58,
  },
  {
    id: "q4",
    kind: "match",
    prompt: "Match each piece of code to what it means.",
    left: ["i++", "i % 2 == 0", "sum += i", "i <= n"],
    right: ["keep looping up to n", "add i to the total", "add 1 to i", "i is even"],
    answer: [2, 3, 1, 0],
    explanation: "++ adds one, % 2 == 0 tests for even, += adds to a total, and <= n is the loop's stop condition.",
    classCorrect: 0.45,
  },
  {
    id: "q5",
    kind: "fill",
    prompt: "Fill in the blank so the loop counts the multiples of 3 from 1 to n.",
    code: "int count = 0;\nfor (int i = 1; i <= n; i++) {\n    if (i ___ 3 == 0) count++;\n}",
    accept: ["%"],
    explanation: "i % 3 is the remainder after dividing by 3 — it's 0 exactly for multiples of 3.",
    classCorrect: 0.71,
  },
];

export const QUIZ_SCORING = {
  correct: 100,
  maxSpeedBonus: 50,
  /** Per combo level, added to a correct answer. */
  comboBonus: 10,
  /** Boss HP % removed per question = classCorrect × this + combo × comboDamage. */
  damagePerQuestion: 27,
  comboDamage: 2,
};

export function describeAnswer(q: QuizQuestion, value: unknown): string {
  if (value === null || value === undefined) return "No answer";
  switch (q.kind) {
    case "mc":
      return `${"ABCD"[value as number]}. ${q.options[value as number]}`;
    case "tf":
      return value ? "True" : "False";
    case "match":
      return (value as (number | null)[]).map((r, l) => `${q.left[l]} → ${r === null ? "?" : q.right[r]}`).join(" · ");
    case "fill":
      return String(value) || "No answer";
  }
}

export function rightAnswer(q: QuizQuestion) {
  switch (q.kind) {
    case "mc":
      return describeAnswer(q, q.answer);
    case "tf":
      return describeAnswer(q, q.answer);
    case "match":
      return describeAnswer(q, q.answer);
    case "fill":
      return q.accept[0]!;
  }
}

export function isCorrect(q: QuizQuestion, value: unknown): boolean {
  if (value === null || value === undefined) return false;
  switch (q.kind) {
    case "mc":
    case "tf":
      return value === q.answer;
    case "match":
      return (value as (number | null)[]).every((r, l) => r === q.answer[l]);
    case "fill":
      return q.accept.includes(String(value).replace(/\s+/g, ""));
  }
}
