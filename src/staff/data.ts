import { PROBLEM } from "../mock/problem";

/* ---------------- model ---------------- */

export type SetMode = "codeline" | "mc" | "tf" | "match" | "fill";
export type Difficulty = "Easy" | "Medium" | "Hard";

export type CodeLineStep = {
  id: string;
  pseudo: string;
  java: string;
  explanation: string;
  /** Nesting level of the pseudocode line (0 = top level), so nested IF/WHILE blocks stay readable. */
  indent?: number;
};

export type McQuestion = { id: string; kind: "mc"; prompt: string; code: string; options: [string, string, string, string]; answer: number };
export type TfQuestion = { id: string; kind: "tf"; statement: string; code: string; answer: boolean };
export type MatchQuestion = { id: string; kind: "match"; prompt: string; pairs: { id: string; left: string; right: string }[] };
export type FillQuestion = { id: string; kind: "fill"; prompt: string; code: string; accept: string[] };
export type SetQuestion = McQuestion | TfQuestion | MatchQuestion | FillQuestion;

export type QuestionSet = {
  id: string;
  title: string;
  topic: string;
  language: "Java";
  difficulty: Difficulty;
  className: string;
  mode: SetMode;
  status: "draft" | "ready";
  /** CodeLine mode */
  statement: string;
  steps: CodeLineStep[];
  /** Other modes — every question has kind === mode */
  questions: SetQuestion[];
  updatedAt: number;
  updatedBy: string;
  usedIn: number;
};

export const MODES: { id: SetMode; label: string; short: string; blurb: string }[] = [
  { id: "codeline", label: "CodeLine", short: "CodeLine", blurb: "Students match Java snippets to pseudocode steps — one snippet each." },
  { id: "mc", label: "Multiple choice", short: "Multiple choice", blurb: "Question + optional code, four options A–D." },
  { id: "tf", label: "True / False", short: "True/False", blurb: "A statement about some code — true or false?" },
  { id: "match", label: "Matching", short: "Matching", blurb: "Pair code with its meaning; students draw the links." },
  { id: "fill", label: "Fill in the blank", short: "Fill-blank", blurb: "Code with a ___ gap and a list of accepted answers." },
];
export const modeInfo = (m: SetMode) => MODES.find((x) => x.id === m)!;

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
export const LANGUAGES = ["Java"] as const;
export const CLASSES = ["COSC1076 · Group A", "COSC1076 · Group B", "COSC2531 · Lab 2"];
export const TOPICS = ["Loops", "Arrays", "Conditionals", "Strings", "Operators", "Methods"];

/** The questions that belong to the set's current mode (others are kept from a mode switch but not used). */
export function activeQuestions(s: QuestionSet): SetQuestion[] {
  return s.mode === "codeline" ? [] : s.questions.filter((q) => q.kind === s.mode);
}

/** A fresh, empty question of the given kind. */
export function blankQuestion(kind: Exclude<SetMode, "codeline">): SetQuestion {
  const id = uid("q");
  switch (kind) {
    case "mc":
      return { id, kind, prompt: "", code: "", options: ["", "", "", ""], answer: 0 };
    case "tf":
      return { id, kind, statement: "", code: "", answer: true };
    case "match":
      return {
        id,
        kind,
        prompt: "Match each piece of code to what it means.",
        pairs: [
          { id: uid("p"), left: "", right: "" },
          { id: uid("p"), left: "", right: "" },
        ],
      };
    case "fill":
      return { id, kind, prompt: "", code: "", accept: [] };
  }
}

/** "8 steps" / "5 questions" */
export function itemCount(s: QuestionSet) {
  const n = s.mode === "codeline" ? s.steps.length : activeQuestions(s).length;
  const noun = s.mode === "codeline" ? "step" : "question";
  return { n, label: `${n} ${noun}${n === 1 ? "" : "s"}` };
}

export const uid = (prefix = "id") => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "set"
  );
}

/* ---------------- mock bank (6 sets) ---------------- */

const DAY = 86_400_000;
const now = Date.now();

const week9: QuestionSet = {
  id: "week9-loops",
  title: "Week 9 – Loops",
  topic: "Loops",
  language: "Java",
  difficulty: "Medium",
  className: CLASSES[0]!,
  mode: "codeline",
  status: "ready",
  statement: PROBLEM.statement,
  steps: PROBLEM.lines.map((l) => ({
    id: `w9-${l.line}`,
    pseudo: l.pseudo.trim(),
    java: l.java,
    explanation: l.explanation,
    indent: Math.floor((l.pseudo.length - l.pseudo.trimStart().length) / 4),
  })),
  questions: [],
  updatedAt: now - 2 * 3_600_000,
  updatedBy: "Dr. Alex Morgan",
  usedIn: 3,
};

const nested: QuestionSet = {
  id: "week8-nested-loops",
  title: "Week 8 – Nested loops",
  topic: "Loops",
  language: "Java",
  difficulty: "Hard",
  className: CLASSES[1]!,
  mode: "codeline",
  status: "ready",
  statement: "Print a right-angled triangle of stars with N rows: row 1 has one star, row N has N stars.",
  steps: [
    ["READ N", "int n = sc.nextInt();", "Read how many rows to print."],
    ["FOR row FROM 1 TO N", "for (int row = 1; row <= n; row++) {", "The outer loop runs once per row."],
    ["    FOR star FROM 1 TO row", "for (int star = 1; star <= row; star++) {", "The inner loop's limit depends on the current row — that's what makes the triangle."],
    ['        PRINT "*" (same line)', 'System.out.print("*");', "print (not println) keeps the stars on one line."],
    ["    END FOR", "}", "Closes the inner loop."],
    ["    MOVE TO NEXT LINE", "System.out.println();", "An empty println ends the row."],
    ["END FOR", "}", "Closes the outer loop."],
  ].map(([pseudo, java, explanation], i) => ({
    id: `w8-${i}`,
    pseudo: pseudo!.trim(),
    java: java!,
    explanation: explanation!,
    indent: Math.floor((pseudo!.length - pseudo!.trimStart().length) / 4),
  })),
  questions: [],
  updatedAt: now - 6 * DAY,
  updatedBy: "Sam Rivera",
  usedIn: 1,
};

const arrays: QuestionSet = {
  id: "arrays-basics",
  title: "Arrays basics",
  topic: "Arrays",
  language: "Java",
  difficulty: "Easy",
  className: CLASSES[0]!,
  mode: "mc",
  status: "ready",
  statement: "",
  steps: [],
  questions: [
    { id: "ab1", kind: "mc", prompt: "What is the index of the first element?", code: "int[] a = {4, 8, 15};", options: ["0", "1", "-1", "4"], answer: 0 },
    { id: "ab2", kind: "mc", prompt: "What does this print?", code: "int[] a = {4, 8, 15};\nSystem.out.println(a.length);", options: ["2", "3", "15", "4"], answer: 1 },
    { id: "ab3", kind: "mc", prompt: "What happens here?", code: "int[] a = new int[3];\na[3] = 7;", options: ["a becomes {0,0,0,7}", "Compile error", "ArrayIndexOutOfBoundsException", "Nothing"], answer: 2 },
    { id: "ab4", kind: "mc", prompt: "What value does a new int array hold?", code: "int[] a = new int[5];", options: ["null", "0", "-1", "Random values"], answer: 1 },
    { id: "ab5", kind: "mc", prompt: "Which loop visits every element?", code: "", options: ["for (int i = 1; i <= a.length; i++)", "for (int i = 0; i < a.length; i++)", "for (int i = 0; i <= a.length; i++)", "for (int i = 1; i < a.length; i++)"], answer: 1 },
  ],
  updatedAt: now - 1 * DAY,
  updatedBy: "Dr. Alex Morgan",
  usedIn: 2,
};

const conditionals: QuestionSet = {
  id: "conditionals-tf",
  title: "Conditionals: true or false?",
  topic: "Conditionals",
  language: "Java",
  difficulty: "Easy",
  className: CLASSES[2]!,
  mode: "tf",
  status: "ready",
  statement: "",
  steps: [],
  questions: [
    { id: "c1", kind: "tf", statement: "This prints \"big\" when x is 10.", code: 'if (x > 10) System.out.println("big");', answer: false },
    { id: "c2", kind: "tf", statement: "&& only evaluates the right side if the left side is true.", code: "", answer: true },
    { id: "c3", kind: "tf", statement: "An else always belongs to the nearest unmatched if.", code: "", answer: true },
    { id: "c4", kind: "tf", statement: "This compiles.", code: "if (x = 5) { }", answer: false },
  ],
  updatedAt: now - 3 * DAY,
  updatedBy: "Sam Rivera",
  usedIn: 0,
};

const strings: QuestionSet = {
  id: "string-methods",
  title: "String methods matching",
  topic: "Strings",
  language: "Java",
  difficulty: "Medium",
  className: CLASSES[1]!,
  mode: "match",
  status: "draft",
  statement: "",
  steps: [],
  questions: [
    {
      id: "s1",
      kind: "match",
      prompt: "Match each method to what it returns.",
      pairs: [
        { id: "s1a", left: 's.length()', right: "number of characters" },
        { id: "s1b", left: "s.charAt(0)", right: "the first character" },
        { id: "s1c", left: "s.toUpperCase()", right: "a new, upper-case string" },
        { id: "s1d", left: 's.equals("hi")', right: "true if the text is exactly hi" },
      ],
    },
    {
      id: "s2",
      kind: "match",
      prompt: "Match each call to its result for s = \"banana\".",
      pairs: [
        { id: "s2a", left: 's.indexOf("n")', right: "2" },
        { id: "s2b", left: "s.substring(1, 3)", right: '"an"' },
        { id: "s2c", left: 's.replace("a", "o")', right: '"bonono"' },
      ],
    },
  ],
  updatedAt: now - 9 * DAY,
  updatedBy: "Dr. Alex Morgan",
  usedIn: 0,
};

const operators: QuestionSet = {
  id: "missing-operator",
  title: "Fill the missing operator",
  topic: "Operators",
  language: "Java",
  difficulty: "Medium",
  className: CLASSES[2]!,
  mode: "fill",
  status: "ready",
  statement: "",
  steps: [],
  questions: [
    { id: "o1", kind: "fill", prompt: "Make the condition true for even numbers.", code: "if (n ___ 2 == 0) {", accept: ["%"] },
    { id: "o2", kind: "fill", prompt: "Add 1 to count.", code: "count___;", accept: ["++", "+=1"] },
    { id: "o3", kind: "fill", prompt: "Both conditions must hold.", code: "if (age >= 18 ___ hasTicket) {", accept: ["&&"] },
    { id: "o4", kind: "fill", prompt: "Check that x is not equal to 0.", code: "if (x ___ 0) {", accept: ["!="] },
  ],
  updatedAt: now - 14 * DAY,
  updatedBy: "Sam Rivera",
  usedIn: 4,
};

export const MOCK_SETS: QuestionSet[] = [week9, arrays, conditionals, nested, strings, operators];
