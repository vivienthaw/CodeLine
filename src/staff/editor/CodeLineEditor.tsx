import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button, Icon } from "../../components";
import { uid, type CodeLineStep } from "../data";
import { MIN_STEPS, type Issues } from "../validate";
import { PasteSection } from "./PastePseudocode";
import { indentWidth, needsSnippet, shiftIndent, splitStepAt, MAX_INDENT } from "./splitPseudocode";

type Field = "pseudo" | "java" | "explanation";
type FocusReq = { id: string; what: "handle" | "pseudo" | "java"; at?: "start" | "end" };

const fieldBase =
  "w-full rounded-chip border-2 bg-surface px-3 py-2 text-[13px] text-primary outline-none transition-colors placeholder:text-muted focus:border-accent";

const GRID = "grid-cols-[28px_minmax(0,1fr)_minmax(0,1.2fr)_40px_40px_40px]";
const iconBtn =
  "grid size-10 cursor-pointer place-items-center rounded-chip text-primary/45 hover:bg-primary/6 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-primary/45";

export function newStep(indent = 0): CodeLineStep {
  return { id: uid("step"), pseudo: "", java: "", explanation: "", indent };
}

export function CodeLineEditor({
  statement,
  steps,
  issues,
  showAllErrors,
  onStatement,
  onSteps,
}: {
  statement: string;
  steps: CodeLineStep[];
  issues: Issues;
  showAllErrors: boolean;
  onStatement: (v: string) => void;
  onSteps: (steps: CodeLineStep[]) => void;
}) {
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [armedId, setArmedId] = useState<string | null>(null); // handle pressed → row draggable
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null); // insert position 0..n
  const [focusReq, setFocusReq] = useState<FocusReq | null>(null);
  const [caret, setCaret] = useState<{ id: string; pos: number } | null>(null); // last caret in a pseudocode field
  const refs = useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>());

  useEffect(() => {
    if (!focusReq) return;
    const el = refs.current.get(`${focusReq.id}:${focusReq.what}`);
    el?.focus();
    if (el && focusReq.at && "setSelectionRange" in el) {
      const p = focusReq.at === "start" ? 0 : el.value.length;
      el.setSelectionRange(p, p);
      setCaret({ id: focusReq.id, pos: p });
    }
    el?.scrollIntoView({ block: "nearest" });
    setFocusReq(null);
  }, [focusReq]);

  const touch = (id: string, f: Field) => setTouched((t) => new Set(t).add(`${id}:${f}`));
  const showErr = (id: string, f: Field) => showAllErrors || touched.has(`${id}:${f}`);

  const update = (id: string, f: Field, v: string) => onSteps(steps.map((s) => (s.id === id ? { ...s, [f]: v } : s)));

  /** Leading spaces typed into the pseudocode become indent levels (4 spaces or a tab = 1). */
  const normalizeIndent = (st: CodeLineStep) => {
    const w = indentWidth(st.pseudo);
    if (!w && st.pseudo === st.pseudo.trimStart()) return;
    const indent = Math.min(MAX_INDENT, (st.indent ?? 0) + Math.ceil(w / 4));
    onSteps(steps.map((s) => (s.id === st.id ? { ...s, pseudo: s.pseudo.trimStart(), indent } : s)));
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to > steps.length) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, item!);
    onSteps(next);
  };

  const add = () => {
    const s = newStep(steps.at(-1)?.indent ?? 0);
    onSteps([...steps, s]);
    setFocusReq({ id: s.id, what: "pseudo" });
  };

  const remove = (id: string) => {
    if (steps.length <= MIN_STEPS) return;
    onSteps(steps.filter((s) => s.id !== id));
  };

  const split = (id: string, pos: number) => {
    const r = splitStepAt(steps, id, pos, () => uid("step"));
    onSteps(r.steps);
    setFocusReq({ id: r.focusId, what: "pseudo", at: r.focusAt });
  };

  const trackCaret = (id: string) => (e: { currentTarget: HTMLInputElement }) =>
    setCaret({ id, pos: e.currentTarget.selectionStart ?? 0 });

  /** The split button works on the row whose pseudocode field last had the caret inside its text. */
  const canSplit = (st: CodeLineStep) =>
    caret?.id === st.id && !!st.pseudo.slice(0, caret.pos).trim() && !!st.pseudo.slice(caret.pos).trim();

  const onPseudoKey = (e: KeyboardEvent<HTMLInputElement>, i: number, st: CodeLineStep) => {
    const el = e.currentTarget;
    const pos = el.selectionStart ?? 0;
    const collapsed = el.selectionStart === el.selectionEnd;
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      split(st.id, pos);
    } else if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      onSteps(shiftIndent(steps, st.id, e.key === "ArrowRight" ? 1 : -1));
    } else if (e.key === "Backspace" && collapsed && pos === 0) {
      // like a code editor: first outdent, then remove an empty row and go back up
      if (st.indent) {
        e.preventDefault();
        onSteps(shiftIndent(steps, st.id, -1));
      } else if (!st.pseudo && !st.java && !st.explanation && i > 0 && steps.length > MIN_STEPS) {
        e.preventDefault();
        remove(st.id);
        setFocusReq({ id: steps[i - 1]!.id, what: "pseudo", at: "end" });
      }
    }
  };

  /* ---- drag & drop (HTML5, started from the handle only) ---- */
  const onDragOver = (e: DragEvent<HTMLElement>, i: number) => {
    if (!dragId) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
  };
  const endDrag = () => {
    setDragId(null);
    setDropAt(null);
    setArmedId(null);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const from = steps.findIndex((s) => s.id === dragId);
    if (from >= 0 && dropAt !== null) move(from, dropAt);
    endDrag();
  };

  const onHandleKey = (e: KeyboardEvent, i: number, id: string) => {
    if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      move(i, i - 1);
      setFocusReq({ id, what: "handle" });
    } else if (e.key === "ArrowDown" && i < steps.length - 1) {
      e.preventDefault();
      move(i, i + 2);
      setFocusReq({ id, what: "handle" });
    }
  };

  const missing = steps.filter(needsSnippet);

  return (
    <div className="flex flex-col gap-5">
      {/* statement */}
      <section className="rounded-card bg-surface p-5 shadow-soft">
        <label htmlFor="cl-statement" className="block text-sm font-bold">
          Problem statement
        </label>
        <p className="mb-2 text-xs text-primary/55">Shown to students above the board. One or two sentences.</p>
        <textarea
          id="cl-statement"
          value={statement}
          onChange={(e) => onStatement(e.target.value)}
          rows={3}
          placeholder="e.g. Read a number N, then add up every even number from 1 to N and print the total."
          className={`${fieldBase} resize-y border-primary/20 text-sm`}
        />
      </section>

      <PasteSection steps={steps} onSteps={onSteps} />

      {/* steps */}
      <section className="rounded-card bg-surface p-5 shadow-soft">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold">Steps</h2>
            <p className="text-xs text-primary/55">
              One row per pseudocode step. Each Java snippet becomes one student's chip.
            </p>
            <p className="mt-0.5 text-xs text-primary/45">
              <Kbd>Enter</Kbd> splits a step at the cursor · <Kbd>Alt</Kbd>+<Kbd>←</Kbd>/<Kbd>→</Kbd> changes indent
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs font-semibold text-primary/55 tabular-nums">{steps.length} steps</span>
            {missing.length > 0 && (
              <button
                onClick={() => setFocusReq({ id: missing[0]!.id, what: "java" })}
                className="cursor-pointer rounded-full bg-accent/12 px-2.5 py-1 text-xs font-semibold text-[#B5600F] hover:bg-accent/20"
              >
                {missing.length} need{missing.length === 1 ? "s" : ""} a Java snippet · go to first
              </button>
            )}
          </div>
        </div>

        <div className={`grid ${GRID} gap-x-2 px-1 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-primary/45`}>
          <span>#</span>
          <span>Pseudocode</span>
          <span>Java snippet</span>
          <span className="sr-only">Split</span>
          <span className="sr-only">Reorder</span>
          <span className="sr-only">Delete</span>
        </div>

        <ol className="flex flex-col" onDragOver={(e) => dragId && e.preventDefault()} onDrop={onDrop}>
          {steps.map((st, i) => {
            const err = issues.steps[st.id] ?? {};
            const pseudoErr = showErr(st.id, "pseudo") ? err.pseudo : undefined;
            const javaErr = showErr(st.id, "java") ? err.java : undefined;
            const needs = !javaErr && needsSnippet(st);
            const dupe = issues.dupes[st.id];
            const isDragging = dragId === st.id;
            const indent = st.indent ?? 0;
            const splittable = canSplit(st);
            return (
              <li
                key={st.id}
                data-step-row
                data-indent={indent}
                draggable={armedId === st.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", st.id);
                  setDragId(st.id);
                }}
                onDragEnd={endDrag}
                onDragOver={(e) => onDragOver(e, i)}
                className={`relative rounded-chip py-2 transition-opacity ${isDragging ? "opacity-40" : ""}`}
              >
                {/* drop indicator */}
                {dragId && dropAt === i && <span className="absolute inset-x-0 -top-0.5 h-1 rounded-full bg-accent" aria-hidden />}
                {dragId && dropAt === steps.length && i === steps.length - 1 && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-accent" aria-hidden />
                )}

                <div className={`grid ${GRID} items-start gap-x-2 gap-y-1.5`}>
                  <span className="pt-2.5 text-right font-mono text-sm font-bold text-muted tabular-nums">{i + 1}</span>

                  <div className="min-w-0">
                    <div className="flex items-stretch">
                      {Array.from({ length: indent }, (_, k) => (
                        <span key={k} aria-hidden className="ml-1 w-3 shrink-0 border-l-2 border-primary/15" />
                      ))}
                      <input
                        ref={(el) => {
                          if (el) refs.current.set(`${st.id}:pseudo`, el);
                        }}
                        value={st.pseudo}
                        onChange={(e) => {
                          update(st.id, "pseudo", e.target.value);
                          setCaret({ id: st.id, pos: e.target.selectionStart ?? 0 });
                        }}
                        onSelect={trackCaret(st.id)}
                        onFocus={trackCaret(st.id)}
                        onMouseUp={trackCaret(st.id)}
                        onKeyUp={trackCaret(st.id)}
                        onKeyDown={(e) => onPseudoKey(e, i, st)}
                        onBlur={() => {
                          touch(st.id, "pseudo");
                          normalizeIndent(st);
                        }}
                        placeholder="e.g. IF i IS EVEN"
                        aria-label={`Step ${i + 1} pseudocode${indent ? `, indent ${indent}` : ""}`}
                        aria-invalid={!!pseudoErr || undefined}
                        title="Enter: split here · Alt+←/→: indent"
                        className={`${fieldBase} min-h-11 min-w-0 font-mono ${pseudoErr ? "border-danger" : "border-primary/20"}`}
                      />
                    </div>
                    {pseudoErr && <FieldMsg tone="error">{pseudoErr}</FieldMsg>}
                  </div>

                  <div>
                    <textarea
                      ref={(el) => {
                        if (el) refs.current.set(`${st.id}:java`, el);
                      }}
                      value={st.java}
                      onChange={(e) => update(st.id, "java", e.target.value)}
                      onBlur={() => touch(st.id, "java")}
                      rows={1}
                      spellCheck={false}
                      placeholder={needs ? "Needs Java snippet" : "e.g. if (i % 2 == 0) {"}
                      aria-label={`Step ${i + 1} Java snippet`}
                      aria-invalid={!!javaErr || undefined}
                      aria-describedby={needs ? `needs-${st.id}` : undefined}
                      className={`${fieldBase} min-h-11 resize-none font-mono [field-sizing:content] ${
                        javaErr
                          ? "border-danger bg-[#F7F9FC]"
                          : needs
                            ? "border-dashed border-accent bg-accent/6 placeholder:font-sans placeholder:font-semibold placeholder:text-[#B5600F]/70"
                            : dupe
                              ? "border-accent bg-[#F7F9FC]"
                              : "border-primary/20 bg-[#F7F9FC]"
                      }`}
                    />
                    {javaErr && <FieldMsg tone="error">{javaErr}</FieldMsg>}
                    {needs && (
                      <span id={`needs-${st.id}`} className="sr-only">
                        Needs Java snippet
                      </span>
                    )}
                    {!javaErr && dupe && (
                      <FieldMsg tone="warn">
                        Same snippet as step {dupe.join(", ")} — students can't tell these chips apart
                      </FieldMsg>
                    )}
                  </div>

                  <button
                    // keep focus (and the caret) in the pseudocode field while clicking
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => caret && split(st.id, caret.pos)}
                    disabled={!splittable}
                    aria-label={`Split step ${i + 1} at the cursor`}
                    title={splittable ? "Split this step at the cursor" : "Click inside the pseudocode where it should split"}
                    className={iconBtn}
                  >
                    <Icon name="scissors" size={17} />
                  </button>

                  <button
                    ref={(el) => {
                      if (el) refs.current.set(`${st.id}:handle`, el);
                    }}
                    onPointerDown={() => setArmedId(st.id)}
                    onPointerUp={() => !dragId && setArmedId(null)}
                    onKeyDown={(e) => onHandleKey(e, i, st.id)}
                    aria-label={`Reorder step ${i + 1} (drag, or use arrow keys)`}
                    title="Drag to reorder · ↑/↓ with keyboard"
                    className={`${iconBtn} cursor-grab active:cursor-grabbing`}
                  >
                    <Icon name="grip" size={18} />
                  </button>

                  <button
                    onClick={() => remove(st.id)}
                    disabled={steps.length <= MIN_STEPS}
                    aria-label={`Delete step ${i + 1}`}
                    title={steps.length <= MIN_STEPS ? `A CodeLine set needs at least ${MIN_STEPS} steps` : "Delete step"}
                    className={`${iconBtn} hover:bg-danger/10 hover:text-danger`}
                  >
                    <Icon name="trash" size={17} />
                  </button>

                  <textarea
                    value={st.explanation}
                    onChange={(e) => update(st.id, "explanation", e.target.value)}
                    rows={1}
                    placeholder="Explanation — shown to students after the round (optional)"
                    aria-label={`Step ${i + 1} explanation`}
                    className={`${fieldBase} col-start-2 col-end-4 resize-none border-primary/12 bg-bg/70 py-1.5 text-xs [field-sizing:content]`}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 flex items-center justify-between border-t border-primary/10 pt-3">
          <Button variant="secondary" icon={<Icon name="plus" />} onClick={add}>
            Add step
          </Button>
          {issues.tooFew && <span className="text-sm font-semibold text-danger">{issues.tooFew}</span>}
        </div>
      </section>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[4px] border border-primary/15 bg-bg px-1 py-px font-mono text-[10px] font-semibold text-primary/70">
      {children}
    </kbd>
  );
}

function FieldMsg({ tone, children }: { tone: "error" | "warn"; children: ReactNode }) {
  return (
    <p className={`mt-1 flex items-start gap-1 text-xs font-semibold ${tone === "error" ? "text-danger" : "text-[#B5600F]"}`} role={tone === "error" ? "alert" : undefined}>
      <span aria-hidden>{tone === "error" ? "●" : "▲"}</span>
      {children}
    </p>
  );
}
