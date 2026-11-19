import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Button, Icon } from "../../components";
import {
  blankQuestion,
  modeInfo,
  uid,
  type FillQuestion,
  type MatchQuestion,
  type McQuestion,
  type SetMode,
  type SetQuestion,
  type TfQuestion,
} from "../data";
import { ModeIcon } from "../ui";
import { BLANK, MIN_PAIRS, type FieldIssues, type Issues } from "../validate";

type QuizMode = Exclude<SetMode, "codeline">;

const field =
  "w-full rounded-chip border-2 bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-muted focus:border-accent";
const tone = (err?: string, warn?: string) => (err ? "border-danger" : warn ? "border-accent" : "border-primary/20");

/* ---------------- shared context for a question card ---------------- */
type Ctx = {
  qid: string;
  n: number;
  err: FieldIssues;
  warn: FieldIssues;
  show: (key: string) => boolean;
  touch: (key: string) => void;
};

/**
 * Step 2 editor for Multiple choice / True-False / Matching / Fill-blank.
 * Edits only the questions whose kind matches the mode; others (from a mode switch) are kept untouched.
 */
export function QuestionsEditor({
  mode,
  questions,
  issues,
  showAllErrors,
  onQuestions,
}: {
  mode: QuizMode;
  questions: SetQuestion[];
  issues: Issues;
  showAllErrors: boolean;
  onQuestions: (all: SetQuestion[]) => void;
}) {
  const mine = questions.filter((q) => q.kind === mode);
  const others = questions.filter((q) => q.kind !== mode);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!focusId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-qid="${focusId}"] textarea, [data-qid="${focusId}"] input`)
      ?.focus();
    setFocusId(null);
  }, [focusId]);

  const setMine = (next: SetQuestion[]) => onQuestions([...next, ...others]);
  const replace = (q: SetQuestion) => setMine(mine.map((x) => (x.id === q.id ? q : x)));
  const add = () => {
    const q = blankQuestion(mode);
    setMine([...mine, q]);
    setFocusId(q.id);
  };
  const remove = (id: string) => setMine(mine.filter((q) => q.id !== id));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= mine.length) return;
    const next = [...mine];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setMine(next);
  };

  const info = modeInfo(mode);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-3 px-1">
        <span className="grid size-9 place-items-center rounded-chip bg-accent/12 text-accent">
          <ModeIcon mode={mode} size={20} />
        </span>
        <div>
          <h2 className="text-sm font-bold">{info.label} questions</h2>
          <p className="text-xs text-primary/55">{info.blurb} Add as many questions as the round needs.</p>
        </div>
      </div>

      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 py-14 text-center">
          <div className="font-bold">No questions yet</div>
          <Button icon={<Icon name="plus" />} onClick={add}>
            Add the first question
          </Button>
          {showAllErrors && issues.tooFew && <p className="text-sm font-semibold text-danger">{issues.tooFew}</p>}
        </div>
      ) : (
        <ol ref={listRef} className="flex flex-col gap-4">
          {mine.map((q, i) => {
            const ctx: Ctx = {
              qid: q.id,
              n: i + 1,
              err: issues.questions[q.id] ?? {},
              warn: issues.warnings[q.id] ?? {},
              show: (k) => showAllErrors || touched.has(`${q.id}:${k}`),
              touch: (k) => setTouched((t) => new Set(t).add(`${q.id}:${k}`)),
            };
            return (
              <li key={q.id} data-qid={q.id} className="rounded-card bg-surface shadow-soft">
                <div className="flex items-center justify-between border-b border-primary/8 px-5 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary/55">Question {i + 1}</span>
                  <div className="flex items-center gap-0.5">
                    <IconBtn label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </IconBtn>
                    <IconBtn label={`Move question ${i + 1} down`} disabled={i === mine.length - 1} onClick={() => move(i, 1)}>
                      ↓
                    </IconBtn>
                    <IconBtn
                      label={`Delete question ${i + 1}`}
                      danger
                      disabled={mine.length <= 1}
                      title={mine.length <= 1 ? "A set needs at least one question" : undefined}
                      onClick={() => remove(q.id)}
                    >
                      <Icon name="trash" size={16} />
                    </IconBtn>
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  {q.kind === "mc" && <McBody q={q} ctx={ctx} onChange={replace} />}
                  {q.kind === "tf" && <TfBody q={q} ctx={ctx} onChange={replace} />}
                  {q.kind === "match" && <MatchBody q={q} ctx={ctx} onChange={replace} />}
                  {q.kind === "fill" && <FillBody q={q} ctx={ctx} onChange={replace} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {mine.length > 0 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" icon={<Icon name="plus" />} onClick={add}>
            Add question
          </Button>
          <span className="text-xs font-semibold text-primary/55 tabular-nums">
            {mine.length} question{mine.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------------- multiple choice ---------------- */
function McBody({ q, ctx, onChange }: { q: McQuestion; ctx: Ctx; onChange: (q: McQuestion) => void }) {
  return (
    <>
      <TextField ctx={ctx} k="prompt" label="Question" value={q.prompt} placeholder="e.g. What does this loop print?" onChange={(prompt) => onChange({ ...q, prompt })} />
      <OptionalCode ctx={ctx} value={q.code} onChange={(code) => onChange({ ...q, code })} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">
          Options <span className="font-normal text-primary/55">— pick the correct one</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const k = `option${i}`;
            const err = ctx.show(k) ? ctx.err[k] : undefined;
            const warn = ctx.warn[k];
            const correct = q.answer === i;
            return (
              <div key={i}>
                <div
                  className={`flex items-center gap-2 rounded-chip border-2 p-1.5 pl-2 transition-colors ${
                    correct ? "border-success bg-success/6" : "border-transparent bg-bg/70"
                  }`}
                >
                  <label className="flex min-h-10 cursor-pointer items-center gap-2" title="Mark as correct">
                    <input
                      type="radio"
                      name={`correct-${ctx.qid}`}
                      checked={correct}
                      onChange={() => onChange({ ...q, answer: i })}
                      className="size-4 accent-success"
                      aria-label={`Option ${"ABCD"[i]} is correct`}
                    />
                    <span className={`grid size-7 place-items-center rounded-[6px] text-xs font-bold text-white ${correct ? "bg-success" : "bg-primary"}`}>
                      {"ABCD"[i]}
                    </span>
                  </label>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const options = [...q.options] as McQuestion["options"];
                      options[i] = e.target.value;
                      onChange({ ...q, options });
                    }}
                    onBlur={() => ctx.touch(k)}
                    placeholder={`Option ${"ABCD"[i]}`}
                    aria-label={`Question ${ctx.n} option ${"ABCD"[i]}`}
                    aria-invalid={!!err || undefined}
                    className={`${field} min-h-10 py-1.5 font-mono ${tone(err, warn)}`}
                  />
                </div>
                <Msg err={err} warn={warn} />
              </div>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}

/* ---------------- true / false ---------------- */
function TfBody({ q, ctx, onChange }: { q: TfQuestion; ctx: Ctx; onChange: (q: TfQuestion) => void }) {
  return (
    <>
      <TextField
        ctx={ctx}
        k="statement"
        label="Statement"
        value={q.statement}
        placeholder="e.g. This loop body runs exactly 5 times."
        onChange={(statement) => onChange({ ...q, statement })}
      />
      <OptionalCode ctx={ctx} value={q.code} onChange={(code) => onChange({ ...q, code })} />
      <div>
        <div className="mb-1.5 text-sm font-semibold">Correct answer</div>
        <div className="inline-grid grid-cols-2 gap-2" role="radiogroup" aria-label={`Question ${ctx.n} correct answer`}>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              role="radio"
              aria-checked={q.answer === v}
              onClick={() => onChange({ ...q, answer: v })}
              className={`flex min-h-11 min-w-32 cursor-pointer items-center justify-center gap-2 rounded-chip border-2 px-5 font-bold transition-colors ${
                q.answer === v
                  ? v
                    ? "border-success bg-success text-white"
                    : "border-danger bg-danger text-white"
                  : "border-primary/15 text-primary/60 hover:border-primary/40"
              }`}
            >
              <Icon name={v ? "check" : "x"} size={16} strokeWidth={3} />
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- matching ---------------- */
function MatchBody({ q, ctx, onChange }: { q: MatchQuestion; ctx: Ctx; onChange: (q: MatchQuestion) => void }) {
  const setPair = (id: string, side: "left" | "right", v: string) =>
    onChange({ ...q, pairs: q.pairs.map((p) => (p.id === id ? { ...p, [side]: v } : p)) });
  const addPair = () => onChange({ ...q, pairs: [...q.pairs, { id: uid("p"), left: "", right: "" }] });
  const removePair = (id: string) => onChange({ ...q, pairs: q.pairs.filter((p) => p.id !== id) });

  return (
    <>
      <TextField ctx={ctx} k="prompt" label="Instruction" value={q.prompt} onChange={(prompt) => onChange({ ...q, prompt })} />
      <div>
        <div className="mb-1.5 grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_40px] gap-2 text-sm font-semibold">
          <span>Code (left)</span>
          <span />
          <span>Meaning (right)</span>
          <span className="sr-only">Remove</span>
        </div>
        <ul className="flex flex-col gap-2">
          {q.pairs.map((p, i) => {
            const lk = `left:${p.id}`;
            const rk = `right:${p.id}`;
            const lErr = ctx.show(lk) ? ctx.err[lk] : undefined;
            const rErr = ctx.show(rk) ? ctx.err[rk] : undefined;
            return (
              <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_40px] items-start gap-2">
                <div>
                  <input
                    value={p.left}
                    onChange={(e) => setPair(p.id, "left", e.target.value)}
                    onBlur={() => ctx.touch(lk)}
                    placeholder="e.g. i++"
                    spellCheck={false}
                    aria-label={`Question ${ctx.n} pair ${i + 1} code`}
                    aria-invalid={!!lErr || undefined}
                    className={`${field} min-h-11 bg-[#F7F9FC] font-mono ${tone(lErr, ctx.warn[lk])}`}
                  />
                  <Msg err={lErr} warn={ctx.warn[lk]} />
                </div>
                <span className="pt-2.5 text-center text-lg text-accent" aria-hidden>
                  ⟷
                </span>
                <div>
                  <input
                    value={p.right}
                    onChange={(e) => setPair(p.id, "right", e.target.value)}
                    onBlur={() => ctx.touch(rk)}
                    placeholder="e.g. add 1 to i"
                    aria-label={`Question ${ctx.n} pair ${i + 1} meaning`}
                    aria-invalid={!!rErr || undefined}
                    className={`${field} min-h-11 ${tone(rErr, ctx.warn[rk])}`}
                  />
                  <Msg err={rErr} warn={ctx.warn[rk]} />
                </div>
                <IconBtn
                  label={`Remove pair ${i + 1}`}
                  danger
                  disabled={q.pairs.length <= MIN_PAIRS}
                  title={q.pairs.length <= MIN_PAIRS ? `Matching needs at least ${MIN_PAIRS} pairs` : undefined}
                  onClick={() => removePair(p.id)}
                >
                  <Icon name="x" size={16} />
                </IconBtn>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center justify-between">
          <Button variant="ghost" icon={<Icon name="plus" />} onClick={addPair}>
            Add pair
          </Button>
          <span className="text-xs text-primary/55">Students see the meanings in shuffled order.</span>
        </div>
        {ctx.show("pairs") && ctx.err.pairs && <Msg err={ctx.err.pairs} />}
      </div>
    </>
  );
}

/* ---------------- fill in the blank ---------------- */
function FillBody({ q, ctx, onChange }: { q: FillQuestion; ctx: Ctx; onChange: (q: FillQuestion) => void }) {
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const codeErr = ctx.show("code") ? ctx.err.code : undefined;
  const acceptErr = ctx.show("accept") ? ctx.err.accept : undefined;

  const insertBlank = () => {
    const el = codeRef.current;
    const start = el?.selectionStart ?? q.code.length;
    const end = el?.selectionEnd ?? q.code.length;
    onChange({ ...q, code: q.code.slice(0, start) + BLANK + q.code.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + BLANK.length, start + BLANK.length);
    });
  };

  const addAnswer = () => {
    const v = draft.trim();
    if (!v || q.accept.includes(v)) return setDraft("");
    onChange({ ...q, accept: [...q.accept, v] });
    setDraft("");
    ctx.touch("accept");
  };

  return (
    <>
      <TextField
        ctx={ctx}
        k="prompt"
        label="Instruction"
        value={q.prompt}
        placeholder="e.g. Make the condition true for even numbers."
        onChange={(prompt) => onChange({ ...q, prompt })}
      />
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <label htmlFor={`code-${ctx.qid}`} className="text-sm font-semibold">
            Code <span className="font-normal text-primary/55">— type {BLANK} where the gap goes</span>
          </label>
          <Button variant="ghost" className="min-h-9 px-3 text-sm" onClick={insertBlank}>
            Insert blank {BLANK}
          </Button>
        </div>
        <CodeArea
          id={`code-${ctx.qid}`}
          ref_={codeRef}
          value={q.code}
          onChange={(code) => onChange({ ...q, code })}
          onBlur={() => ctx.touch("code")}
          invalid={!!codeErr}
          placeholder={"if (n ___ 2 == 0) {"}
          label={`Question ${ctx.n} code`}
        />
        <Msg err={codeErr} />
        {q.code.includes(BLANK) && (
          <div className="mt-2 text-xs text-primary/55">
            Students see:{" "}
            <code className="rounded bg-[#0F1E33] px-2 py-1 font-mono text-[12px] text-[#E3E9F2]">
              {q.code.split("\n")[q.code.split("\n").findIndex((l) => l.includes(BLANK))]!.split(BLANK).map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && <span className="mx-0.5 inline-block w-8 rounded-sm border border-accent bg-white/10 align-middle">&nbsp;</span>}
                </span>
              ))}
            </code>
          </div>
        )}
      </div>
      <div>
        <label htmlFor={`acc-${ctx.qid}`} className="mb-1.5 block text-sm font-semibold">
          Accepted answers <span className="font-normal text-primary/55">— spaces are ignored when marking</span>
        </label>
        <div
          className={`flex flex-wrap items-center gap-1.5 rounded-chip border-2 bg-surface p-1.5 transition-colors focus-within:border-accent ${
            acceptErr ? "border-danger" : "border-primary/20"
          }`}
        >
          {q.accept.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 rounded-[6px] bg-success/12 py-1 pl-2.5 pr-1 font-mono text-sm text-success">
              {a}
              <button
                onClick={() => onChange({ ...q, accept: q.accept.filter((x) => x !== a) })}
                aria-label={`Remove accepted answer ${a}`}
                className="grid size-6 cursor-pointer place-items-center rounded text-success/70 hover:bg-success/15 hover:text-success"
              >
                <Icon name="x" size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
          <input
            id={`acc-${ctx.qid}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addAnswer();
              } else if (e.key === "Backspace" && !draft && q.accept.length) {
                onChange({ ...q, accept: q.accept.slice(0, -1) });
              }
            }}
            onBlur={() => {
              addAnswer();
              ctx.touch("accept");
            }}
            placeholder={q.accept.length ? "Add another…" : "Type an answer, press Enter"}
            spellCheck={false}
            aria-invalid={!!acceptErr || undefined}
            className="min-h-8 min-w-40 flex-1 bg-transparent px-1.5 font-mono text-sm outline-none placeholder:font-sans placeholder:text-muted"
          />
        </div>
        <Msg err={acceptErr} />
      </div>
    </>
  );
}

/* ---------------- small building blocks ---------------- */

function TextField({
  ctx,
  k,
  label,
  value,
  placeholder,
  onChange,
}: {
  ctx: Ctx;
  k: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const err = ctx.show(k) ? ctx.err[k] : undefined;
  const id = `${k}-${ctx.qid}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => ctx.touch(k)}
        placeholder={placeholder}
        aria-invalid={!!err || undefined}
        className={`${field} min-h-11 resize-none [field-sizing:content] ${tone(err)}`}
      />
      <Msg err={err} />
    </div>
  );
}

function OptionalCode({ ctx, value, onChange }: { ctx: Ctx; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(!!value);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex min-h-9 cursor-pointer items-center gap-1.5 self-start text-sm font-semibold text-accent hover:underline">
        <Icon name="plus" size={15} /> Add a code block (optional)
      </button>
    );
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={`code-${ctx.qid}`} className="text-sm font-semibold">
          Code block <span className="font-normal text-primary/55">(optional)</span>
        </label>
        <button
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="min-h-9 cursor-pointer text-xs font-semibold text-primary/55 hover:text-danger"
        >
          Remove code block
        </button>
      </div>
      <CodeArea id={`code-${ctx.qid}`} value={value} onChange={onChange} placeholder={"int[] a = {4, 8, 15};"} label={`Question ${ctx.n} code block`} />
    </div>
  );
}

/** Dark monospace code input. Tab inserts 4 spaces instead of leaving the field. */
function CodeArea({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder,
  label,
  ref_,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  placeholder?: string;
  label: string;
  ref_?: RefObject<HTMLTextAreaElement | null>;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: t } = el;
    onChange(value.slice(0, s) + "    " + value.slice(t));
    requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
  };
  return (
    <textarea
      id={id}
      ref={ref_}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      rows={2}
      spellCheck={false}
      placeholder={placeholder}
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={`min-h-16 w-full resize-none rounded-chip border-2 bg-[#0F1E33] px-4 py-3 font-mono text-[13px] leading-6 text-[#E3E9F2] outline-none transition-colors [field-sizing:content] placeholder:text-[#5F7391] focus:border-accent ${
        invalid ? "border-danger" : "border-transparent"
      }`}
    />
  );
}

function Msg({ err, warn }: { err?: string; warn?: string }) {
  if (!err && !warn) return null;
  return (
    <p className={`mt-1 flex items-start gap-1 text-xs font-semibold ${err ? "text-danger" : "text-[#B5600F]"}`} role={err ? "alert" : undefined}>
      <span aria-hidden>{err ? "●" : "▲"}</span>
      {err ?? warn}
    </p>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  title,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={`grid size-10 cursor-pointer place-items-center rounded-chip font-bold text-primary/50 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-primary/8 hover:text-primary"
      } disabled:hover:bg-transparent disabled:hover:text-primary/50`}
    >
      {children}
    </button>
  );
}
