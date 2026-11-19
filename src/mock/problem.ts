/** CodeLine problem from UI_SPEC §0 / §5: "Sum of even numbers from 1 to N". */

export type ProblemLine = {
  line: number;
  pseudo: string;
  java: string;
  /** Why the code matches the step (used on the results screen). */
  explanation: string;
  /** Initial board state. */
  initial: BoardCell;
};

export const PROBLEM = {
  title: "Sum of even numbers from 1 to N",
  statement:
    "Read a whole number N, then add up every even number from 1 to N and print the total. For N = 10 the program prints 30 (2 + 4 + 6 + 8 + 10).",
  /** The current student's assigned line (main mode). */
  assignedLine: 4,
  /** Lines given to the student in the practice variant. */
  practiceLines: [3, 4, 7, 8],
  lines: [
    {
      line: 1,
      pseudo: "READ N",
      java: "int n = sc.nextInt();",
      explanation: "nextInt() reads the next whole number the user types and stores it in n.",
      initial: { kind: "filled", by: "Mai Nguyen" },
    },
    {
      line: 2,
      pseudo: "SET sum TO 0",
      java: "int sum = 0;",
      explanation: "The running total has to start at zero before we add anything to it.",
      initial: { kind: "filled", by: "Arjun Patel" },
    },
    {
      line: 3,
      pseudo: "FOR i FROM 1 TO N",
      java: "for (int i = 1; i <= n; i++) {",
      explanation: "The loop starts i at 1, keeps going while i ≤ n, and adds 1 to i each time — so it visits 1, 2, …, N.",
      initial: { kind: "empty" },
    },
    {
      line: 4,
      pseudo: "    IF i IS EVEN",
      java: "if (i % 2 == 0) {",
      explanation: "% gives the remainder. A number is even exactly when dividing by 2 leaves remainder 0.",
      initial: { kind: "empty" },
    },
    {
      line: 5,
      pseudo: "        ADD i TO sum",
      java: "sum += i;",
      explanation: "sum += i is shorthand for sum = sum + i: it adds the current even number to the total.",
      initial: { kind: "filled", by: "Sofia Rossi" },
    },
    {
      line: 6,
      pseudo: "    END IF",
      java: "}",
      explanation: "This brace closes the if block, so only the add step is conditional.",
      initial: { kind: "autofilled" },
    },
    {
      line: 7,
      pseudo: "END FOR",
      java: "}",
      explanation: "This brace closes the for loop body; everything above it repeats for each i.",
      initial: { kind: "empty" },
    },
    {
      line: 8,
      pseudo: "PRINT sum",
      java: "System.out.println(sum);",
      explanation: "After the loop finishes, println shows the final total on screen.",
      initial: { kind: "empty" },
    },
  ] satisfies ProblemLine[],
};

export const SCORING = {
  correct: 100,
  maxSpeedBonus: 50,
  /** Speed bonus decays to 0 over this long after the round starts. */
  speedWindowMs: 120_000,
  wrong: 10,
  /** Boss heals this many HP % on a wrong drop. */
  healOnWrong: 3,
  damagePerLine: 500,
};

/* ---------- shared board model (used by CodeLine, lecturer console and projector) ---------- */

export type BoardCell =
  | { kind: "empty" }
  | { kind: "filled"; by: string; byId?: string }
  | { kind: "autofilled" };
export type Board = Record<number, BoardCell>;

/** Max HP % that wrong answers can heal back between two correct placements. */
export const HEAL_CAP = 12;
export const HP_PER_LINE = 100 / PROBLEM.lines.length;

export function initialBoard(): Board {
  const b: Board = {};
  for (const l of PROBLEM.lines) b[l.line] = l.initial;
  return b;
}

export const countFilled = (b: Board) => Object.values(b).filter((c) => c.kind !== "empty").length;

/** HP % = unfilled lines + heal from wrong answers since the last correct one. 0 only when the board is full. */
export function bossHp(b: Board, healPool: number) {
  const empty = PROBLEM.lines.length - countFilled(b);
  if (empty === 0) return 0;
  return Math.min(100, empty * HP_PER_LINE + healPool);
}
