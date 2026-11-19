import { CLASSES, type QuestionSet } from "./data";

/**
 * What the staff click-through (dev panel) types in for you. Kept apart from the
 * mock bank so the walkthrough creates something new instead of reusing a sample.
 */
export const DEMO_SET: Pick<QuestionSet, "title" | "topic" | "difficulty" | "className" | "mode" | "statement" | "steps"> = {
  title: "Week 10 – While loops",
  topic: "Loops",
  difficulty: "Medium",
  className: CLASSES[0]!,
  mode: "codeline",
  statement: "Read N, then keep halving it until it reaches 1. Print how many halvings it took.",
  steps: [
    ["READ n", "int n = sc.nextInt();", 0, "Read the starting number."],
    ["SET steps TO 0", "int steps = 0;", 0, "Nothing has been halved yet."],
    ["WHILE n > 1", "while (n > 1) {", 0, "Keep going until n reaches 1 — we don't know how many times in advance."],
    ["HALVE n", "n = n / 2;", 1, "Integer division drops the remainder."],
    ["ADD 1 TO steps", "steps++;", 1, "Count each halving."],
    ["END WHILE", "}", 0, "Closes the loop body."],
    ["PRINT steps", "System.out.println(steps);", 0, "Printed once, after the loop."],
  ].map(([pseudo, java, indent, explanation], i) => ({
    id: `demo-${i}-${Math.random().toString(36).slice(2, 6)}`,
    pseudo: pseudo as string,
    java: java as string,
    indent: indent as number,
    explanation: explanation as string,
  })),
};

export const DEMO_SESSION = { title: "Week 10 — Loops & arrays", quizSetId: "arrays-basics", fallbackCodelineId: "week9-loops" };
