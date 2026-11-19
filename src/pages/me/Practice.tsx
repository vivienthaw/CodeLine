import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Button, Icon, Professor, PseudoRow, SnippetChip } from "../../components";
import { canPractice, DENY_TEXT, practisableRounds, recordPractice, type DenyReason } from "../../mock/practice";
import { getReviewSession, type BoardLine, type CodeLineReview, type QuizItem, type QuizReview } from "../../mock/review";
import { useStore } from "../../mock/store";
import { navigate } from "../../router";

/**
 * /me/sessions/:id/practice/:questionId — practise a round you played in class.
 * Access is decided by canPractice() in the mock layer; nothing here is scored,
 * and practice runs never count in Progress or Rank.
 */
export default function Practice({ id, questionId }: { id: string; questionId?: string }) {
  const studentId = useStore((s) => s.student?.studentId);
  const session = getReviewSession(id);
  // old link without a question id → your first CodeLine round you can practise
  const qid = questionId ?? (session ? practisableRounds(studentId, session).find((r) => r.kind === "codeline")?.id : undefined) ?? "";
  const access = canPractice(studentId, id, qid);
  const back = () => navigate(access.ok || access.session ? `/me/sessions/${id}` : "/me/sessions");

  if (!access.ok) return <Denied reason={access.reason} onBack={back} canGoBack={!!access.session && access.reason !== "absent"} />;
  const done = () => recordPractice(studentId, id);
  return access.round.kind === "codeline" ? (
    <CodeLinePractice key={qid} r={access.round} onBack={back} onFinish={done} />
  ) : (
    <QuizPractice key={qid} r={access.round} onBack={back} onFinish={done} />
  );
}

/* ---------------- shared ---------------- */

function Denied({ reason, onBack, canGoBack }: { reason: DenyReason; onBack: () => void; canGoBack: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 px-6 py-16 text-center" role="alert">
      <span className="grid size-14 place-items-center rounded-full bg-primary/8 text-primary/60">
        <Icon name="lock" size={26} />
      </span>
      <h1 className="text-xl font-extrabold">You can only practise questions you did in class</h1>
      <p className="max-w-md text-sm text-primary/65" data-deny-reason={reason}>
        {DENY_TEXT[reason]}
      </p>
      <Button className="mt-2" variant="secondary" onClick={canGoBack ? onBack : () => navigate("/me/sessions")}>
        {canGoBack ? "Back to review" : "My Sessions"}
      </Button>
    </div>
  );
}

function Banner({ progress, onReset }: { progress: ReactNode; onReset: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border-2 border-accent bg-accent/10 px-4 py-3 sm:flex-nowrap sm:px-5" role="status">
      <span className="w-full rounded-full bg-accent px-3 py-1 text-center text-xs font-extrabold text-white sm:w-auto sm:text-sm" data-practice-banner>
        Practice — not scored · does not affect your rank
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold tabular-nums text-primary/75 sm:text-right" data-practice-progress>
        {progress}
      </span>
      <Button variant="secondary" onClick={onReset} icon={<ResetIcon />}>
        Reset
      </Button>
    </div>
  );
}

function Header({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <button onClick={onBack} className="mb-2 cursor-pointer text-sm font-semibold text-primary/60 hover:text-primary">
          ← Back to review
        </button>
        <h1 className="text-xl font-extrabold">{title}</h1>
        {sub && <p className="mt-1 text-primary/70">{sub}</p>}
      </div>
    </div>
  );
}

function FinishCard({
  children,
  onReset,
  onBack,
  showing,
  onToggleExplain,
}: {
  children: ReactNode;
  onReset: () => void;
  onBack: () => void;
  showing: boolean;
  onToggleExplain: () => void;
}) {
  return (
    <div className="cl-anim-pop flex flex-wrap items-center gap-3 rounded-card bg-success/10 p-4 ring-2 ring-success/40 sm:gap-5 sm:p-5 lg:flex-nowrap" role="alert">
      <Professor className="hidden h-20 shrink-0 sm:block" mood="defeated" />
      <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">{children}</div>
      <Button variant="ghost" onClick={onToggleExplain} aria-pressed={showing}>
        {showing ? "Hide explanations" : "Show explanations"}
      </Button>
      <Button variant="secondary" onClick={onReset}>
        Reset
      </Button>
      <Button onClick={onBack}>Back to review</Button>
    </div>
  );
}

/** Deterministic shuffle; never returns the original order when there's more than one item. */
function shuffle<T>(items: T[], seed: number): T[] {
  let a = seed * 9301 + 49297;
  const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.length > 1 && out.every((x, i) => x === items[i]) ? [...out.slice(1), out[0]!] : out;
}

/** Call once when a run finishes (not again until Reset). */
function useFinishOnce(finished: boolean, onFinish: () => void) {
  const recorded = useRef(false);
  useEffect(() => {
    if (finished && !recorded.current) {
      recorded.current = true;
      onFinish();
    }
    if (!finished) recorded.current = false;
  }, [finished, onFinish]);
}

/* ---------------- CodeLine practice ---------------- */

type Chip = { id: number; java: string };
type Drag = { chip: Chip; x: number; y: number; gx: number; gy: number; w: number; sx: number; sy: number; moved: boolean };
const DRAG_THRESHOLD = 6;

function slotAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const slot = el?.closest<HTMLElement>("[data-slot]");
  return slot ? Number(slot.dataset.slot) : null;
}

function CodeLinePractice({ r, onBack, onFinish }: { r: CodeLineReview; onBack: () => void; onFinish: () => void }) {
  const [seed, setSeed] = useState(1);
  const tray = useMemo<Chip[]>(() => shuffle(r.lines.map((l: BoardLine) => ({ id: l.n, java: l.java })), seed), [r.lines, seed]);
  const [placed, setPlaced] = useState<Map<number, Chip>>(new Map());
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [explain, setExplain] = useState(false);
  const dragRef = useRef<Drag | null>(null);

  const used = new Set([...placed.values()].map((c) => c.id));
  const left = tray.filter((c) => !used.has(c.id));
  const done = placed.size === r.lines.length;
  useFinishOnce(done, onFinish);

  const reset = () => {
    setSeed((x) => x + 1);
    setPlaced(new Map());
    setWrongId(null);
    setSelected(null);
    setExplain(false);
  };

  /** Identical snippets (e.g. two "}") fit either of their slots. Wrong = shake + return, no points. */
  const tryPlace = (chip: Chip, n: number) => {
    if (placed.has(n)) return;
    if (r.lines.find((l) => l.n === n)!.java === chip.java) {
      setPlaced((p) => new Map(p).set(n, chip));
      setSelected(null);
    } else setWrongId(chip.id);
  };

  const onPointerDown = (chip: Chip, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || wrongId === chip.id) return;
    const b = e.currentTarget.getBoundingClientRect();
    const d = { chip, x: e.clientX, y: e.clientY, gx: e.clientX - b.left, gy: e.clientY - b.top, w: b.width, sx: e.clientX, sy: e.clientY, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_THRESHOLD;
      dragRef.current = { ...d, x: e.clientX, y: e.clientY, moved };
      setDrag(dragRef.current);
      if (moved) setHover(slotAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setHover(null);
      if (!d) return;
      if (!d.moved) return setSelected((sel) => (sel === d.chip.id ? null : d.chip.id));
      const n = slotAt(e.clientX, e.clientY);
      if (n !== null) tryPlace(d.chip, n);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag]);

  const onChipKey = (chip: Chip, e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected((sel) => (sel === chip.id ? null : chip.id));
    } else if (e.key === "Escape") setSelected(null);
  };
  const selectedChip = left.find((c) => c.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <Banner progress={`Lines correct: ${placed.size} / ${r.lines.length}`} onReset={reset} />
      <Header
        title={r.title}
        sub={`${r.statement}${r.squad ? ` — your squad's board (${r.squad.name}).` : ""}`}
        onBack={onBack}
      />

      {done && (
        <FinishCard onReset={reset} onBack={onBack} showing={explain} onToggleExplain={() => setExplain((x) => !x)}>
          <div className="text-lg font-extrabold">Solved!</div>
          <p className="text-sm text-primary/70">
            Lines correct: {r.lines.length} / {r.lines.length}. Practice isn't scored, so try it again any time.
          </p>
        </FinishCard>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
        <aside className="rounded-card bg-surface p-4 shadow-soft lg:sticky lg:top-24" aria-labelledby="tray-h">
          <h2 id="tray-h" className="font-bold">
            All snippets <span className="font-semibold text-primary/45">· {left.length} left</span>
          </h2>
          <p className="mb-3 text-xs text-primary/55">Drag a snippet onto its step — or tap/press Enter to pick it, then choose a step.</p>
          {left.length ? (
            <ul className="flex flex-col gap-2">
              {left.map((c) => (
                <li key={c.id}>
                  <SnippetChip
                    code={c.java}
                    data-chip={c.id}
                    aria-label={`Snippet: ${c.java}`}
                    state={wrongId === c.id ? "wrong" : drag?.chip.id === c.id && drag.moved ? "dragging" : selected === c.id ? "selected" : "default"}
                    className={drag?.chip.id === c.id && drag.moved ? "opacity-30" : ""}
                    onWrongDone={() => setWrongId(null)}
                    onPointerDown={(e) => onPointerDown(c, e)}
                    onKeyDown={(e) => onChipKey(c, e)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-chip bg-success/10 px-3 py-4 text-center text-sm font-semibold text-[#1E7B4F]">All placed ✓</p>
          )}
        </aside>

        <ol className="flex flex-col gap-2" aria-label="Board">
          {r.lines.map((l) => {
            const chip = placed.get(l.n);
            return (
              <li key={l.n} data-practice-line={l.n}>
                <PseudoRow
                  lineNo={l.n}
                  text={"    ".repeat(l.indent) + l.pseudo}
                  slotWidth="w-full sm:w-[380px]"
                  highlight={!!selectedChip && !chip}
                  slotState={chip ? "filled" : hover === l.n && drag?.moved ? "hover" : "empty"}
                  chip={chip ? <SnippetChip code={chip.java} state="locked" /> : undefined}
                  slotProps={
                    !chip && selectedChip
                      ? {
                          role: "button",
                          tabIndex: 0,
                          "aria-label": `Place ${selectedChip.java} on step ${l.n}`,
                          style: { cursor: "pointer" },
                          onClick: () => tryPlace(selectedChip, l.n),
                          onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              tryPlace(selectedChip, l.n);
                            }
                          },
                        }
                      : undefined
                  }
                />
                {done && explain && (
                  <p className="ml-3 mt-1 text-sm text-primary/70 sm:ml-14" data-explanation>
                    <span className="font-semibold text-primary">Why: </span>
                    {l.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {drag?.moved && (
        <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
          <div className="absolute" style={{ left: drag.x - drag.gx, top: drag.y - drag.gy, width: drag.w }}>
            <SnippetChip code={drag.chip.java} state="dragging" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Quiz practice ---------------- */

type Answer = { given: string; ok: boolean; pairs?: boolean[] };

const norm = (x: string) => x.trim().replace(/\s+/g, " ").toLowerCase();

function QuizPractice({ r, onBack, onFinish }: { r: QuizReview; onBack: () => void; onFinish: () => void }) {
  const [seed, setSeed] = useState(1);
  const order = useMemo(() => shuffle(r.items, seed), [r.items, seed]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(Answer | undefined)[]>([]);
  const [explain, setExplain] = useState(false);
  const finished = answers.filter(Boolean).length === order.length && i >= order.length;
  useFinishOnce(finished, onFinish);

  const q = order[i];
  const a = answers[i];
  const right = answers.filter((x) => x?.ok).length;

  const reset = () => {
    setSeed((x) => x + 1);
    setI(0);
    setAnswers([]);
    setExplain(false);
  };
  const submit = (ans: Answer) => setAnswers((xs) => Object.assign([...xs], { [i]: ans }));

  return (
    <div className="flex flex-col gap-5">
      <Banner
        progress={finished ? `${right} / ${order.length} correct` : `Question ${i + 1} of ${order.length} · ${right} correct`}
        onReset={reset}
      />
      <Header title={r.title} sub="Same questions as in class, in a new order. You'll see the answer and why straight after each one." onBack={onBack} />

      {finished ? (
        <>
          <FinishCard onReset={reset} onBack={onBack} showing={explain} onToggleExplain={() => setExplain((x) => !x)}>
            <div className="text-lg font-extrabold">
              {right} / {order.length} correct
            </div>
            <p className="text-sm text-primary/70">Practice isn't scored and doesn't change your rank. Reset to try a new order.</p>
          </FinishCard>
          {explain && (
            <ol className="flex flex-col gap-3">
              {order.map((item, k) => (
                <li key={item.n} className="rounded-card bg-surface p-4 shadow-soft" data-explanation>
                  <div className="flex items-center gap-2">
                    <span className={answers[k]?.ok ? "text-success" : "text-danger"} aria-hidden>
                      {answers[k]?.ok ? "✓" : "✕"}
                    </span>
                    <span className="font-bold">{item.prompt}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="text-primary/55">Answer: </span>
                    <span className="whitespace-pre-line font-mono text-[13px]">{item.correct}</span>
                  </p>
                  <p className="mt-1 text-sm text-primary/75">
                    <span className="font-semibold text-primary">Why: </span>
                    {item.explanation}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        q && (
          <article className="rounded-card bg-surface p-6 shadow-soft" data-practice-question={q.n}>
            <div className="text-xs font-bold uppercase tracking-wider text-primary/50">
              Question {i + 1} of {order.length}
            </div>
            <h2 className="mt-1 text-lg font-bold">{q.prompt}</h2>
            {q.code && (
              <pre className="mt-3 overflow-x-auto rounded-chip bg-[#0F1E33] px-4 py-3 font-mono text-[13px] leading-relaxed text-white/90">{q.code}</pre>
            )}
            <div className="mt-4">
              <AnswerInput key={`${seed}-${i}`} q={q} answered={a} onSubmit={submit} />
            </div>
            {a && (
              <div
                className={`mt-4 rounded-chip border-2 px-4 py-3 ${a.ok ? "border-success/40 bg-success/8" : "border-danger/35 bg-danger/5"}`}
                role="alert"
                data-feedback={a.ok ? "correct" : "wrong"}
              >
                <div className="font-bold">
                  <span aria-hidden>{a.ok ? "✓ " : "✕ "}</span>
                  {a.ok ? "Correct" : "Not quite"}
                </div>
                {!a.ok && (
                  <div className="mt-1 text-sm">
                    <span className="text-primary/60">Answer: </span>
                    <span className="whitespace-pre-line font-mono text-[13px]">{q.correct}</span>
                  </div>
                )}
                <p className="mt-1 text-sm text-primary/80">
                  <span className="font-semibold text-primary">Why: </span>
                  {q.explanation}
                </p>
                <div className="mt-3 flex justify-end">
                  <Button data-autofocus onClick={() => setI((x) => x + 1)}>
                    {i + 1 < order.length ? "Next question →" : "Finish"}
                  </Button>
                </div>
              </div>
            )}
          </article>
        )
      )}
    </div>
  );
}

function AnswerInput({ q, answered, onSubmit }: { q: QuizItem; answered?: Answer; onSubmit: (a: Answer) => void }) {
  const [text, setText] = useState("");
  const rights = useMemo(() => shuffle((q.pairs ?? []).map((p) => p.right), q.n + 7), [q]);
  const [match, setMatch] = useState<string[]>(() => (q.pairs ?? []).map(() => ""));
  const locked = !!answered;

  if (q.kind === "mc" || q.kind === "tf") {
    const opts = q.options ?? ["True", "False"];
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {opts.map((o, k) => {
          const chosen = answered?.given === o;
          const isRight = o === q.correct;
          return (
            <button
              key={o}
              disabled={locked}
              onClick={() => onSubmit({ given: o, ok: isRight })}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-chip border-2 px-4 py-2 text-left font-mono text-[14px] transition-colors disabled:cursor-default ${
                locked && isRight
                  ? "border-success bg-success/10"
                  : chosen
                    ? "border-danger bg-danger/8"
                    : "border-primary/20 hover:border-primary/50"
              }`}
            >
              {q.kind === "mc" && <span className="font-sans text-sm font-bold text-primary/45">{"ABCD"[k]}</span>}
              <span className="min-w-0 flex-1">{o}</span>
              {locked && isRight && <span aria-label="correct answer">✓</span>}
              {chosen && !isRight && <span aria-label="your answer, wrong">✕</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.kind === "fill") {
    const check = () => text.trim() && onSubmit({ given: text, ok: (q.accept ?? [q.correct]).some((x) => norm(x) === norm(text)) });
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={locked}
          aria-label="Fill the blank"
          placeholder="Type what goes in the blank"
          className="min-h-11 flex-1 rounded-chip border-2 border-primary/20 px-3 font-mono outline-none focus:border-accent disabled:bg-bg"
        />
        <Button type="submit" disabled={locked || !text.trim()}>
          Check
        </Button>
      </form>
    );
  }

  // match
  const pairs = q.pairs ?? [];
  const check = () => {
    const each = pairs.map((p, k) => match[k] === p.right);
    onSubmit({ given: pairs.map((p, k) => `${p.left} → ${match[k]}`).join("\n"), ok: each.every(Boolean), pairs: each });
  };
  return (
    <div className="flex flex-col gap-2">
      {pairs.map((p, k) => {
        const res = answered?.pairs?.[k];
        return (
          <label
            key={p.left}
            className="grid grid-cols-[minmax(0,1fr)_20px] items-center gap-x-2 gap-y-1 sm:grid-cols-[180px_24px_minmax(0,1fr)_24px] sm:gap-2"
          >
            <code className="col-span-2 justify-self-start rounded-[6px] bg-bg px-2 py-1.5 font-mono text-[13px] sm:col-span-1 sm:justify-self-stretch">{p.left}</code>
            <span className="hidden text-center text-primary/40 sm:block">→</span>
            <select
              value={match[k]}
              disabled={locked}
              onChange={(e) => setMatch((m) => Object.assign([...m], { [k]: e.target.value }))}
              aria-label={`Match for ${p.left}`}
              className="min-h-10 min-w-0 rounded-chip border-2 border-primary/20 bg-surface px-2 text-sm outline-none focus:border-accent"
            >
              <option value="">Choose…</option>
              {rights.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <span aria-label={res === undefined ? undefined : res ? "correct" : "wrong"} className={res ? "text-success" : "text-danger"}>
              {res === undefined ? "" : res ? "✓" : "✕"}
            </span>
          </label>
        );
      })}
      <div className="mt-1 flex justify-end">
        <Button onClick={check} disabled={locked || match.some((m) => !m)}>
          Check
        </Button>
      </div>
    </div>
  );
}

const ResetIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
  </svg>
);

