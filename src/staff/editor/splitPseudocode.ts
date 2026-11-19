import type { CodeLineStep } from "../data";

/**
 * Pure helpers for turning pasted pseudocode into CodeLine steps.
 * No React, no app imports — so it runs under `node --test` as-is.
 *
 * Field mapping to the spec: pseudocode → `pseudo`, snippet → `java`,
 * order → position in the array (always renumbered from 1 when shown).
 */

export const TAB_WIDTH = 4;
export const MAX_INDENT = 6;

/** "1.", "1)", "(1)", "Step 1:", "-", "*", "•" — the marker must be followed by a space (or end the line). */
const MARKER = /^(?:\(\d+\)|\d+[.)]|step\s+\d+\s*[:.)]|[-*•])(?=\s|$)\s*/i;
/** Markdown code fences (``` or ```text) are noise, not steps. */
const FENCE = /^(`{3,}|~{3,})[\w-]*$/;

/** Width of the leading whitespace, tabs counting as TAB_WIDTH spaces. */
export function indentWidth(line: string) {
  let w = 0;
  for (const ch of line) {
    if (ch === " ") w += 1;
    else if (ch === "\t") w += TAB_WIDTH;
    else break;
  }
  return w;
}

export function stripMarker(text: string) {
  return text.replace(MARKER, "");
}

export type SplitLine = { text: string; indent: number };

/**
 * Text → one entry per non-empty line, with markers stripped and an indent level.
 *
 * Indent: the whole paste is dedented first (so a block copied from inside a
 * document doesn't start at level 2), then level = width / unit, where unit is
 * 4 — or 2/3 when the paste is clearly indented by 2 or 3 spaces.
 */
export function splitLines(text: string): SplitLine[] {
  const raw = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "" && !FENCE.test(l.trim()));

  const widths = raw.map(indentWidth);
  const base = widths.length ? Math.min(...widths) : 0;
  const rel = widths.map((w) => w - base);
  const smallest = Math.min(TAB_WIDTH, ...rel.filter((w) => w > 0));
  const unit = smallest >= 2 ? smallest : TAB_WIDTH;

  const out: SplitLine[] = [];
  raw.forEach((line, i) => {
    const body = stripMarker(line.trim()).trim();
    if (!body) return; // e.g. a lone "3." or "-"
    out.push({ text: body, indent: Math.min(MAX_INDENT, Math.floor(rel[i]! / unit)) });
  });
  return out;
}

let seq = 0;
const defaultId = () => `step-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Pasted pseudocode → steps with empty snippet and explanation. */
export function splitPseudocode(text: string, makeId: () => string = defaultId): CodeLineStep[] {
  return splitLines(text).map((l) => ({ id: makeId(), pseudo: l.text, java: "", explanation: "", indent: l.indent }));
}

/* ---------------- preview edits (before applying) ---------------- */

/** Join line i with line i+1 ("IF x" + "THEN" → "IF x THEN"); keeps line i's indent. */
export function mergeWithNext(lines: SplitLine[], i: number): SplitLine[] {
  if (i < 0 || i >= lines.length - 1) return lines;
  const merged = { ...lines[i]!, text: `${lines[i]!.text} ${lines[i + 1]!.text}` };
  return [...lines.slice(0, i), merged, ...lines.slice(i + 2)];
}

export function removeLine(lines: SplitLine[], i: number): SplitLine[] {
  return lines.filter((_, k) => k !== i);
}

/* ---------------- applying to the step table ---------------- */

/** A row nobody has typed into (the editor seeds two of these for a new set). */
export const isBlankStep = (s: CodeLineStep) => !s.pseudo.trim() && !s.java.trim() && !s.explanation.trim();

/** True when applying would overwrite or extend real work, so we should ask Replace vs Append. */
export const hasContent = (steps: CodeLineStep[]) => steps.some((s) => !isBlankStep(s));

export type ApplyMode = "replace" | "append";

/** New step table. Untouched blank rows are dropped either way. */
export function applySplit(
  existing: CodeLineStep[],
  lines: SplitLine[],
  mode: ApplyMode,
  makeId: () => string = defaultId,
): CodeLineStep[] {
  const incoming = lines.map((l) => ({ id: makeId(), pseudo: l.text, java: "", explanation: "", indent: l.indent }));
  return mode === "replace" ? incoming : [...existing.filter((s) => !isBlankStep(s)), ...incoming];
}

/* ---------------- editing rows in the step table ---------------- */

/**
 * Split one row at a caret position. Text before the caret stays (with its snippet and explanation);
 * text after it becomes a new row right below, same indent, empty snippet.
 * Caret at the very start inserts an empty row above instead (like pressing Enter at the start of a line).
 * Returns the new table and the id of the row that should get focus.
 */
export function splitStepAt(
  steps: CodeLineStep[],
  id: string,
  pos: number,
  makeId: () => string = defaultId,
): { steps: CodeLineStep[]; focusId: string; focusAt: "start" | "end" } {
  const i = steps.findIndex((s) => s.id === id);
  if (i < 0) return { steps, focusId: id, focusAt: "end" };
  const cur = steps[i]!;
  const blank = (pseudo: string): CodeLineStep => ({ id: makeId(), pseudo, java: "", explanation: "", indent: cur.indent ?? 0 });

  if (pos <= 0 && cur.pseudo.trim()) {
    const above = blank("");
    return { steps: [...steps.slice(0, i), above, ...steps.slice(i)], focusId: id, focusAt: "start" };
  }
  const below = blank(cur.pseudo.slice(pos).trim());
  const kept = { ...cur, pseudo: cur.pseudo.slice(0, pos).trimEnd() };
  return { steps: [...steps.slice(0, i), kept, below, ...steps.slice(i + 1)], focusId: below.id, focusAt: "start" };
}

/** Indent / outdent one row, clamped to 0..MAX_INDENT. */
export function shiftIndent(steps: CodeLineStep[], id: string, delta: number): CodeLineStep[] {
  return steps.map((s) =>
    s.id === id ? { ...s, indent: Math.max(0, Math.min(MAX_INDENT, (s.indent ?? 0) + delta)) } : s,
  );
}

/** Rows that have pseudocode but no Java yet — what "Needs Java snippet" highlights. */
export const needsSnippet = (s: CodeLineStep) => !!s.pseudo.trim() && !s.java.trim();

/* ---------------- Java paste ---------------- */

/**
 * Remove // and /* *\/ comments, leaving string and char literals alone
 * ("http://x" and '/' are not comments). Line breaks inside block comments are kept,
 * so the rest of the code stays on its own lines.
 */
export function stripJavaComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const next = src[i + 1];
    if (c === '"' || c === "'") {
      // copy the literal through its closing quote, honouring escapes
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, ""); // keep only the newlines
      i = stop;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Pasted Java → one snippet per line: no blank lines, no comments, and (by default) no lone "{" or "}". */
export function splitJava(text: string, { skipBraces = true } = {}): string[] {
  return stripJavaComments(text.replace(/\r\n?/g, "\n"))
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !FENCE.test(l) && !(skipBraces && /^[{}]$/.test(l)));
}

/** Where one Java line goes: a step index, a new step at the end, or nowhere. */
export type JavaTarget = number | "new" | "skip";

/** Default assignment: line i → step i while there are steps, the rest → `rest`. */
export function pairByOrder(lineCount: number, stepCount: number, rest: "new" | "skip" = "skip"): JavaTarget[] {
  return Array.from({ length: lineCount }, (_, i) => (i < stepCount ? i : rest));
}

/**
 * Put Java lines into the step table. Several lines sent to the same step are joined with
 * newlines (in paste order) and replace that step's snippet; "new" lines each become a new
 * step at the end with empty pseudocode.
 */
export function assignJava(
  steps: CodeLineStep[],
  lines: string[],
  targets: JavaTarget[],
  makeId: () => string = defaultId,
): CodeLineStep[] {
  const byStep = new Map<number, string[]>();
  const added: CodeLineStep[] = [];
  lines.forEach((line, k) => {
    const t = targets[k] ?? "skip";
    if (t === "skip") return;
    if (t === "new") added.push({ id: makeId(), pseudo: "", java: line, explanation: "", indent: 0 });
    else if (t >= 0 && t < steps.length) byStep.set(t, [...(byStep.get(t) ?? []), line]);
  });
  return [...steps.map((s, i) => (byStep.has(i) ? { ...s, java: byStep.get(i)!.join("\n") } : s)), ...added];
}

/** Steps whose existing (non-empty, different) snippet would be replaced. */
export function overwrittenSnippets(steps: CodeLineStep[], lines: string[], targets: JavaTarget[]): number[] {
  const next = assignJava(steps, lines, targets, () => "");
  return steps.flatMap((s, i) => (s.java.trim() && next[i]!.java !== s.java ? [i] : []));
}
