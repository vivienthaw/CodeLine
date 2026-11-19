import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applySplit,
  assignJava,
  overwrittenSnippets,
  pairByOrder,
  splitJava,
  stripJavaComments,
  hasContent,
  indentWidth,
  mergeWithNext,
  needsSnippet,
  shiftIndent,
  splitStepAt,
  removeLine,
  splitLines,
  splitPseudocode,
  stripMarker,
} from "./splitPseudocode.ts";

const pseudo = (text: string) => splitLines(text).map((l) => l.text);
const indents = (text: string) => splitLines(text).map((l) => l.indent);

test("spec example: 5 steps, IF at indent 1 and ADD at indent 2", () => {
  const text = [
    "   1. SET sum TO 0",
    "   2. FOR i FROM 1 TO n",
    "         IF i MOD 2 = 0 THEN",
    "            ADD i TO sum",
    "   3. PRINT sum",
  ].join("\n");
  const steps = splitPseudocode(text);
  assert.equal(steps.length, 5);
  assert.deepEqual(
    steps.map((s) => [s.pseudo, s.indent]),
    [
      ["SET sum TO 0", 0],
      ["FOR i FROM 1 TO n", 0],
      ["IF i MOD 2 = 0 THEN", 1],
      ["ADD i TO sum", 2],
      ["PRINT sum", 0],
    ],
  );
});

test("each step has an id and empty snippet/explanation", () => {
  let n = 0;
  const steps = splitPseudocode("A\nB", () => `id${n++}`);
  assert.deepEqual(steps, [
    { id: "id0", pseudo: "A", java: "", explanation: "", indent: 0 },
    { id: "id1", pseudo: "B", java: "", explanation: "", indent: 0 },
  ]);
  const auto = splitPseudocode("A\nB\nC");
  assert.equal(new Set(auto.map((s) => s.id)).size, 3, "default ids are unique");
});

test("normalises \\r\\n and \\r line endings", () => {
  assert.deepEqual(pseudo("A\r\nB\rC\nD"), ["A", "B", "C", "D"]);
});

test("skips empty and whitespace-only lines, trims trailing spaces", () => {
  assert.deepEqual(pseudo("\n  A   \n\n \t \nB\t\n\n"), ["A", "B"]);
});

test("strips numbering and bullets", () => {
  const cases: [string, string][] = [
    ["1. SET x", "SET x"],
    ["12) SET x", "SET x"],
    ["(3) SET x", "SET x"],
    ["Step 4: SET x", "SET x"],
    ["step 5 : SET x", "SET x"],
    ["STEP 6. SET x", "SET x"],
    ["- SET x", "SET x"],
    ["* SET x", "SET x"],
    ["• SET x", "SET x"],
  ];
  for (const [input, want] of cases) assert.equal(stripMarker(input), want, input);
});

test("does not strip things that only look like markers", () => {
  assert.equal(stripMarker("1.5 TIMES x"), "1.5 TIMES x");
  assert.equal(stripMarker("-1 IS negative"), "-1 IS negative");
  assert.equal(stripMarker("*ptr"), "*ptr");
  assert.equal(stripMarker("Stepper motor ON"), "Stepper motor ON");
  assert.equal(stripMarker("SET x TO 1."), "SET x TO 1.");
});

test("only strips one marker", () => {
  assert.equal(stripMarker("1. - SET x"), "- SET x");
});

test("a line that is only a marker is skipped", () => {
  assert.deepEqual(pseudo("1. A\n2.\n-\n3. B"), ["A", "B"]);
});

test("tabs count as 4 spaces", () => {
  assert.equal(indentWidth("\t\tX"), 8);
  assert.equal(indentWidth(" \tX"), 5);
  assert.deepEqual(indents("WHILE x\n\tIF y\n\t\tSTOP\nEND"), [0, 1, 2, 0]);
});

test("4-space indentation", () => {
  assert.deepEqual(indents("FOR i\n    IF a\n        X\n    ELSE\n        Y"), [0, 1, 2, 1, 2]);
});

test("2-space indentation is detected", () => {
  assert.deepEqual(indents("FOR i\n  IF a\n    X\n  END IF"), [0, 1, 2, 1]);
});

test("a paste that is indented as a whole starts at level 0", () => {
  assert.deepEqual(indents("        A\n            B\n        C"), [0, 1, 0]);
});

test("indent is capped", () => {
  assert.deepEqual(indents("A\n" + " ".repeat(40) + "B"), [0, 6]);
});

test("markdown code fences are ignored", () => {
  assert.deepEqual(pseudo("```\nA\nB\n```"), ["A", "B"]);
  assert.deepEqual(pseudo("```pseudocode\nA\n```"), ["A"]);
});

test("empty input gives no steps", () => {
  assert.deepEqual(splitPseudocode(""), []);
  assert.deepEqual(splitPseudocode(" \n\t\n"), []);
});

/* ---------------- preview edits + applying ---------------- */

const L = (text: string, indent = 0) => ({ text, indent });

test("mergeWithNext joins two lines and keeps the first indent", () => {
  const lines = [L("IF x > 0", 1), L("THEN", 2), L("PRINT x", 2)];
  assert.deepEqual(mergeWithNext(lines, 0), [L("IF x > 0 THEN", 1), L("PRINT x", 2)]);
  assert.equal(mergeWithNext(lines, 2), lines, "last line has nothing to merge with");
  assert.equal(mergeWithNext(lines, -1), lines);
});

test("removeLine drops one line", () => {
  assert.deepEqual(removeLine([L("A"), L("B"), L("C")], 1), [L("A"), L("C")]);
});

test("hasContent ignores untouched blank rows", () => {
  const blank = { id: "b", pseudo: " ", java: "", explanation: "" };
  assert.equal(hasContent([blank, { ...blank, id: "c" }]), false);
  assert.equal(hasContent([blank, { ...blank, java: "x++;" }]), true);
});

test("applySplit replace / append", () => {
  let n = 0;
  const id = () => `n${n++}`;
  const old = [
    { id: "a", pseudo: "OLD", java: "old();", explanation: "" },
    { id: "b", pseudo: "", java: "", explanation: "" },
  ];
  const lines = [L("NEW 1"), L("NEW 2", 1)];
  assert.deepEqual(
    applySplit(old, lines, "replace", id).map((s) => [s.pseudo, s.java, s.indent]),
    [["NEW 1", "", 0], ["NEW 2", "", 1]],
  );
  assert.deepEqual(
    applySplit(old, lines, "append", id).map((s) => s.pseudo),
    ["OLD", "NEW 1", "NEW 2"],
    "append keeps real rows, drops the blank one",
  );
});

/* ---------------- row editing ---------------- */

const row = (id: string, pseudo: string, extra: Partial<{ java: string; explanation: string; indent: number }> = {}) => ({
  id,
  pseudo,
  java: "",
  explanation: "",
  ...extra,
});

test("splitStepAt splits at the caret; snippet stays on the first half", () => {
  const steps = [row("a", "FOR i FROM 1 TO n IF i MOD 2 = 0 THEN", { java: "for (...) {", indent: 1 }), row("b", "END")];
  const r = splitStepAt(steps, "a", "FOR i FROM 1 TO n ".length, () => "new");
  assert.deepEqual(r.steps, [
    row("a", "FOR i FROM 1 TO n", { java: "for (...) {", indent: 1 }),
    row("new", "IF i MOD 2 = 0 THEN", { indent: 1 }),
    row("b", "END"),
  ]);
  assert.equal(r.focusId, "new");
});

test("splitStepAt at the end adds an empty row below", () => {
  const r = splitStepAt([row("a", "SET x TO 0")], "a", 10, () => "new");
  assert.deepEqual(r.steps.map((s) => s.pseudo), ["SET x TO 0", ""]);
  assert.equal(r.focusId, "new");
});

test("splitStepAt at the start inserts an empty row above and keeps focus", () => {
  const r = splitStepAt([row("a", "SET x TO 0", { indent: 2 })], "a", 0, () => "new");
  assert.deepEqual(r.steps.map((s) => [s.id, s.pseudo, s.indent]), [["new", "", 2], ["a", "SET x TO 0", 2]]);
  assert.equal(r.focusId, "a");
});

test("shiftIndent clamps to 0..6", () => {
  const steps = [row("a", "X"), row("b", "Y", { indent: 6 })];
  assert.equal(shiftIndent(steps, "a", -1)[0]!.indent, 0);
  assert.equal(shiftIndent(steps, "a", 1)[0]!.indent, 1);
  assert.equal(shiftIndent(steps, "b", 1)[1]!.indent, 6);
});

test("needsSnippet: pseudocode filled, Java empty", () => {
  assert.equal(needsSnippet(row("a", "X")), true);
  assert.equal(needsSnippet(row("a", "X", { java: "x();" })), false);
  assert.equal(needsSnippet(row("a", "  ")), false, "a blank row isn't flagged yet");
});

/* ---------------- Java paste ---------------- */

const JAVA = [
  "// sum the even numbers",
  "int sum = 0;",
  "for (int i = 1; i <= n; i++)",
  "{",
  "    if (i % 2 == 0) {   // even?",
  "        sum += i;",
  "    }",
  "}",
  "/* print it",
  "   on one line */",
  "System.out.println(sum);",
].join("\r\n");

test("splitJava skips blank lines, comments and lone braces", () => {
  assert.deepEqual(splitJava(JAVA), [
    "int sum = 0;",
    "for (int i = 1; i <= n; i++)",
    "if (i % 2 == 0) {",
    "sum += i;",
    "System.out.println(sum);",
  ]);
});

test("splitJava can keep lone braces (e.g. for END FOR steps)", () => {
  assert.deepEqual(splitJava("for (;;) {\n  x++;\n}", { skipBraces: false }), ["for (;;) {", "x++;", "}"]);
  assert.deepEqual(splitJava("} else {\n};"), ["} else {", "};"], "only a brace on its own is skipped");
});

test("stripJavaComments leaves string and char literals alone", () => {
  assert.equal(stripJavaComments('String u = "http://x"; // link'), 'String u = "http://x"; ');
  assert.equal(stripJavaComments("char c = '/'; /* slash */ c++;"), "char c = '/';  c++;");
  assert.equal(stripJavaComments('s = "say \\"/*hi*/\\"";'), 's = "say \\"/*hi*/\\"";');
  assert.equal(stripJavaComments("/** doc\n * more\n */\nint x;"), "\n\n\nint x;");
});

test("splitJava drops javadoc and unterminated block comments", () => {
  assert.deepEqual(splitJava("/**\n * Adds.\n */\nint a = 1;\n/* never closed\nint b;"), ["int a = 1;"]);
});

const st = (pseudo: string, java = "") => ({ id: pseudo, pseudo, java, explanation: "" });

test("pairByOrder", () => {
  assert.deepEqual(pairByOrder(3, 3), [0, 1, 2]);
  assert.deepEqual(pairByOrder(4, 2), [0, 1, "skip", "skip"]);
  assert.deepEqual(pairByOrder(3, 1, "new"), [0, "new", "new"]);
  assert.deepEqual(pairByOrder(1, 3), [0]);
});

test("assignJava pairs line-by-line", () => {
  const out = assignJava([st("A"), st("B", "old();")], ["a();", "b();"], [0, 1]);
  assert.deepEqual(out.map((s) => s.java), ["a();", "b();"]);
});

test("assignJava joins lines sent to one step, skips and appends", () => {
  let n = 0;
  const out = assignJava([st("A"), st("B", "keep();")], ["x;", "y;", "z;", "w;"], [0, 0, "skip", "new"], () => `n${n++}`);
  assert.deepEqual(
    out.map((s) => [s.id, s.pseudo, s.java]),
    [["A", "A", "x;\ny;"], ["B", "B", "keep();"], ["n0", "", "w;"]],
  );
});

test("overwrittenSnippets lists steps whose typed snippet would change", () => {
  const steps = [st("A", "same();"), st("B", "old();"), st("C")];
  assert.deepEqual(overwrittenSnippets(steps, ["same();", "new();", "c();"], [0, 1, 2]), [1]);
});
