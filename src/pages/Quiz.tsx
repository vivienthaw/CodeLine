import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BossCard, Button, Icon, TopBar, type BossState } from "../components";
import { useDevAction, type DevAction } from "../devBus";
import { CURRENT_STUDENT, SESSION } from "../mock/data";
import { useLive, useLiveRounds, useRoundClock } from "../mock/live";
import {
  QUESTION_MS,
  QUIZ,
  QUIZ_SCORING,
  REVEAL_MS,
  describeAnswer,
  isCorrect,
  rightAnswer,
  type FillQuestion,
  type MatchQuestion,
  type QuizKind,
  type QuizQuestion,
} from "../mock/quiz";
import { setState, useStore, type RoundResult } from "../mock/store";
import { navigate } from "../router";

type Phase = "answering" | "locked" | "reveal";
type ResultRow = NonNullable<RoundResult["quiz"]>[number];

const LETTERS = "ABCD";

export default function Quiz() {
  const student = useStore((s) => s.student) ?? CURRENT_STUDENT;

  /* ---- live session (if following the lecturer) ---- */
  const joinedCode = useStore((s) => s.joinedCode);
  const liveStatus = useLive((s) => s.status);
  const liveCode = useLive((s) => s.code);
  const liveStudents = useLive((s) => s.students.length);
  const { round } = useRoundClock();
  const { current: liveRoundInfo } = useLiveRounds();
  const following = liveStatus === "open" && joinedCode === liveCode && liveRoundInfo?.kind === "quiz";
  const classSize = following ? Math.max(2, liveStudents) : SESSION.expectedStudents - 2;

  /* ---- question flow ---- */
  const [qi, setQi] = useState(0);
  const q = QUIZ[qi]!;
  const [phase, setPhase] = useState<Phase>("answering");
  const [qStart, setQStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [value, setValue] = useState<unknown>(null); // locked answer
  const [answeredAt, setAnsweredAt] = useState<number | null>(null);
  const [others, setOthers] = useState(8);

  /* ---- class / boss ---- */
  const [hp, setHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [comboBroken, setComboBroken] = useState(false);
  const [boss, setBoss] = useState<BossState>("idle");
  const [bossTrigger, setBossTrigger] = useState(0);
  const [lastDamage, setLastDamage] = useState("0%");
  const [classPct, setClassPct] = useState(0);

  /* ---- score ---- */
  const [score, setScore] = useState(0);
  const [totals, setTotals] = useState({ base: 0, speed: 0, combo: 0, answered: 0, answerMs: 0 });
  const [rows, setRows] = useState<ResultRow[]>([]);

  const remainingMs = Math.max(0, QUESTION_MS - (now - qStart));
  const seconds = phase === "reveal" ? 0 : Math.ceil(remainingMs / 1000);
  const youCorrect = phase === "reveal" && isCorrect(q, value);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const startQuestion = useCallback((i: number) => {
    setQi(i);
    setPhase("answering");
    setQStart(Date.now());
    setNow(Date.now());
    setValue(null);
    setAnsweredAt(null);
    setOthers(5 + Math.floor(Math.random() * 8));
    setComboBroken(false);
    setBoss((b) => (b === "defeated" ? b : "idle"));
  }, []);

  // mock: classmates answer over time
  useEffect(() => {
    if (phase === "reveal") return;
    const t = setInterval(() => setOthers((n) => Math.min(classSize - 1, n + Math.floor(Math.random() * 3))), 450);
    return () => clearInterval(t);
  }, [phase, classSize]);

  const lock = (v: unknown) => {
    if (phase !== "answering") return;
    setValue(v);
    setAnsweredAt(Date.now());
    setPhase("locked");
  };

  // latest values for reveal/finish without stale closures
  const latest = useRef({ q, value, answeredAt, qStart, combo, hp, score, totals, rows, phase });
  latest.current = { q, value, answeredAt, qStart, combo, hp, score, totals, rows, phase };

  const reveal = useCallback(() => {
    const L = latest.current;
    if (L.phase === "reveal") return;
    const correct = isCorrect(L.q, L.value);
    const pct = Math.min(0.98, Math.max(0.05, L.q.classCorrect + (correct ? 0.02 : -0.02)));
    const majority = pct >= 0.5;
    const nextCombo = majority ? L.combo + 1 : 0;
    const dmg = pct * QUIZ_SCORING.damagePerQuestion + nextCombo * QUIZ_SCORING.comboDamage;
    const nextHp = Math.max(0, L.hp - dmg);

    setClassPct(pct);
    setCombo(nextCombo);
    setComboBroken(!majority && L.combo > 0);
    setHp(nextHp);
    setLastDamage(`${Math.round(dmg)}%`);
    setBoss(nextHp <= 0 ? "defeated" : "hit");
    setBossTrigger((n) => n + 1);

    const answerMs = L.answeredAt ? L.answeredAt - L.qStart : null;
    if (correct) {
      const speed = Math.max(0, Math.round(QUIZ_SCORING.maxSpeedBonus * (1 - (answerMs ?? QUESTION_MS) / QUESTION_MS)));
      const comboPts = L.combo * QUIZ_SCORING.comboBonus;
      setScore((s) => s + QUIZ_SCORING.correct + speed + comboPts);
      setTotals((t) => ({ ...t, base: t.base + QUIZ_SCORING.correct, speed: t.speed + speed, combo: t.combo + comboPts }));
    }
    if (L.value !== null) setTotals((t) => ({ ...t, answered: t.answered + 1, answerMs: t.answerMs + (answerMs ?? 0) }));
    setRows((r) => [
      ...r,
      {
        id: L.q.id,
        prompt: L.q.prompt,
        correct,
        yourAnswer: describeAnswer(L.q, L.value),
        rightAnswer: rightAnswer(L.q),
        explanation: L.q.explanation,
      },
    ]);
    setPhase("reveal");
  }, []);

  const finish = useCallback(() => {
    const L = latest.current;
    const result: RoundResult = {
      round: "quiz",
      outcome: L.hp <= 0 ? "defeated" : "escaped",
      base: L.totals.base,
      speedBonus: L.totals.speed,
      comboBonus: L.totals.combo,
      penalties: 0,
      wrongDrops: 0,
      attempts: L.totals.answered,
      timeTakenMs: L.totals.answered ? L.totals.answerMs : null,
      total: L.score,
      myLines: [],
      quiz: L.rows,
    };
    setState({ lastResult: result });
    navigate("/results");
  }, []);

  // timer runs out → reveal; everyone answered → reveal early
  useEffect(() => {
    if (phase === "reveal") return;
    if (remainingMs <= 0) reveal();
    else if (phase === "locked" && others >= classSize - 1) {
      const t = setTimeout(reveal, 600);
      return () => clearTimeout(t);
    }
  }, [phase, remainingMs, others, classSize, reveal]);

  // after the reveal → next question, or results after Q5 / once the boss is down
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => {
      if (qi >= QUIZ.length - 1 || latest.current.hp <= 0) finish();
      else startQuestion(qi + 1);
    }, REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, qi, finish, startQuestion]);

  // lecturer ended the round early
  useEffect(() => {
    if (following && round.phase === "ended") finish();
  }, [following, round.phase, finish]);

  useEffect(() => {
    if (boss !== "hit") return;
    const t = setTimeout(() => setBoss("idle"), 900);
    return () => clearTimeout(t);
  }, [boss, bossTrigger]);

  /* ---- dev ---- */
  useDevAction((a: DevAction) => {
    const kinds: Partial<Record<DevAction, QuizKind>> = {
      "quiz:mc": "mc",
      "quiz:tf": "tf",
      "quiz:match": "match",
      "quiz:fill": "fill",
    };
    const kind = kinds[a];
    if (kind) startQuestion(QUIZ.findIndex((x) => x.kind === kind));
    if (a === "quiz:reveal") reveal();
    if (a === "quiz:answerCorrect" && phase === "answering") {
      lock(q.kind === "fill" ? q.accept[0] : q.answer);
      setTimeout(reveal, 400); // after the lock has rendered
    }
    if (a === "quiz:next") {
      if (qi >= QUIZ.length - 1) finish();
      else startQuestion(qi + 1);
    }
  });

  const answeredShown = Math.min(classSize, others + (phase !== "answering" ? 1 : 0));

  return (
    <div className="min-h-screen bg-bg font-sans text-primary">
      <TopBar
        roundLabel={`Round 2 · Quiz · Question ${qi + 1} / ${QUIZ.length}`}
        seconds={seconds}
        score={score}
        placed={qi + (phase === "reveal" ? 1 : 0)}
        total={QUIZ.length}
        progressLabel="questions"
        name={student.name}
      />

      <main className="mx-auto flex max-w-[900px] flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
          <BossCard hp={hp} size="sm" state={boss} trigger={bossTrigger} damage={lastDamage} className="max-sm:w-full" />
          <ComboMeter combo={combo} broken={comboBroken} />
        </div>

        <section className="rounded-card bg-surface p-4 shadow-soft sm:p-6" key={q.id}>
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-primary/50">
            {{ mc: "Multiple choice", tf: "True / False", match: "Matching", fill: "Fill in the blank" }[q.kind]}
          </div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{q.prompt}</h1>
          {q.code && q.kind !== "fill" && <CodeBlock code={q.code} className="mt-4" />}
        </section>

        <div key={`answers-${q.id}`}>
          {q.kind === "mc" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {q.options.map((opt, i) => (
                <AnswerButton
                  key={i}
                  badge={LETTERS[i]!}
                  phase={phase}
                  selected={value === i}
                  isAnswer={q.answer === i}
                  onClick={() => lock(i)}
                >
                  <span className="font-mono">{opt}</span>
                </AnswerButton>
              ))}
            </div>
          )}

          {q.kind === "tf" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[true, false].map((v) => (
                <AnswerButton
                  key={String(v)}
                  big
                  badge={v ? "T" : "F"}
                  phase={phase}
                  selected={value === v}
                  isAnswer={q.answer === v}
                  onClick={() => lock(v)}
                >
                  {v ? "True" : "False"}
                </AnswerButton>
              ))}
            </div>
          )}

          {q.kind === "match" && <Matching q={q} phase={phase} locked={value as (number | null)[] | null} onSubmit={lock} />}

          {q.kind === "fill" && <FillBlank q={q} phase={phase} locked={value as string | null} onSubmit={lock} />}
        </div>

        {/* status bar */}
        {phase === "locked" && (
          <div className="flex items-center gap-4 rounded-card bg-surface px-5 py-4 shadow-soft" aria-live="polite">
            <Icon name="spinner" size={20} className="text-accent" />
            <span className="font-semibold">
              Waiting for others… <span className="tabular-nums">{answeredShown} / {classSize}</span> answered
            </span>
            <div className="ml-auto h-2 w-48 overflow-hidden rounded-full bg-primary/10">
              <div className="cl-hp-fill h-full bg-accent" style={{ width: `${(answeredShown / classSize) * 100}%` }} />
            </div>
          </div>
        )}
        {phase === "answering" && (
          <p className="text-center text-sm text-primary/60">
            {q.kind === "match"
              ? "Click a code item, then the meaning it matches."
              : q.kind === "fill"
                ? "Type the missing code, then Submit."
                : "Pick an answer — it locks straight away."}
          </p>
        )}
        {phase === "reveal" && (
          <div
            className={`rounded-card border-2 bg-surface p-5 shadow-soft ${youCorrect ? "border-success" : "border-danger"}`}
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid size-9 place-items-center rounded-full text-white ${youCorrect ? "bg-success" : "bg-danger"}`}
              >
                <Icon name={youCorrect ? "check" : "x"} size={18} strokeWidth={3} />
              </span>
              <span className="text-lg font-extrabold">
                {youCorrect ? "Correct!" : value === null ? "Time's up — no answer" : "Not quite"}
              </span>
              <span className="ml-auto text-sm font-semibold text-primary/70">
                {Math.round(classPct * 100)}% of the class got it · boss −{lastDamage}
              </span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-danger/20">
              <div className="cl-hp-fill h-full bg-success" style={{ width: `${classPct * 100}%` }} />
            </div>
            <p className="mt-3 text-[15px] text-primary/80">{q.explanation}</p>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function ComboMeter({ combo, broken }: { combo: number; broken: boolean }) {
  const active = combo > 0;
  return (
    <div className="flex flex-1 items-center gap-4 rounded-card bg-surface px-5 shadow-soft">
      <span
        className={`grid size-14 place-items-center rounded-full transition-colors ${
          active ? "bg-accent/15 text-accent" : "bg-muted/15 text-muted"
        } ${active ? "cl-anim-pop" : ""}`}
        key={combo}
      >
        <Icon name="flame" size={30} className={active ? "fill-accent/40" : ""} />
      </span>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold sm:text-2xl">Class combo ×{combo}</span>
          {broken && <span className="cl-anim-shake text-sm font-bold text-danger">Combo broken!</span>}
        </div>
        <div className="mt-2 flex gap-1.5">
          {QUIZ.map((_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${i < combo ? "bg-accent" : "bg-primary/10"}`} />
          ))}
        </div>
        <div className="mt-1.5 text-xs text-primary/60">Resets if most of the class gets a question wrong</div>
      </div>
    </div>
  );
}

function CodeBlock({ code, className = "", blank }: { code: string; className?: string; blank?: ReactNode }) {
  const lines = code.split("\n");
  return (
    <pre className={`overflow-x-auto rounded-card bg-[#0F1E33] py-4 font-mono text-[15px] leading-7 text-[#E3E9F2] ${className}`}>
      {lines.map((ln, i) => {
        const parts = blank ? ln.split("___") : [ln];
        return (
          <div key={i} className="flex">
            <span className="w-12 shrink-0 select-none pr-4 text-right text-[#5F7391]">{i + 1}</span>
            <code className="whitespace-pre">
              {parts.length > 1 ? (
                <>
                  {parts[0]}
                  {blank}
                  {parts[1]}
                </>
              ) : (
                ln
              )}
            </code>
          </div>
        );
      })}
    </pre>
  );
}

function AnswerButton({
  badge,
  phase,
  selected,
  isAnswer,
  big = false,
  onClick,
  children,
}: {
  badge: string;
  phase: Phase;
  selected: boolean;
  isAnswer: boolean;
  big?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const revealed = phase === "reveal";
  const tone = revealed
    ? isAnswer
      ? "border-success bg-success/10"
      : selected
        ? "border-danger bg-danger/10"
        : "border-primary/10 opacity-50"
    : selected
      ? "border-accent bg-accent/5"
      : phase === "locked"
        ? "border-primary/10 opacity-60"
        : "border-primary/15 hover:border-primary hover:shadow-soft";
  return (
    <button
      disabled={phase !== "answering"}
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-card border-[3px] bg-surface px-4 text-left font-semibold transition-colors disabled:cursor-default sm:gap-4 sm:px-5 ${
        big ? "min-h-24 justify-center text-2xl sm:min-h-32 sm:text-3xl" : "min-h-16 text-lg sm:min-h-24 sm:text-xl"
      } ${tone}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-chip text-lg font-bold text-white ${
          revealed && isAnswer ? "bg-success" : revealed && selected ? "bg-danger" : selected ? "bg-accent" : "bg-primary"
        }`}
      >
        {badge}
      </span>
      <span className={big ? "" : "flex-1"}>{children}</span>
      {revealed && isAnswer && <Icon name="check" size={26} strokeWidth={3} className="text-success" />}
      {revealed && selected && !isAnswer && <Icon name="x" size={26} strokeWidth={3} className="text-danger" />}
    </button>
  );
}

/* ---------------- matching ---------------- */
function Matching({
  q,
  phase,
  locked,
  onSubmit,
}: {
  q: MatchQuestion;
  phase: Phase;
  locked: (number | null)[] | null;
  onSubmit: (v: (number | null)[]) => void;
}) {
  const [pairs, setPairs] = useState<(number | null)[]>(() => q.left.map(() => null));
  const [pending, setPending] = useState<number | null>(null);
  const shown = locked ?? pairs;
  const open = phase === "answering";

  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rightRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lines, setLines] = useState<{ l: number; x1: number; y1: number; x2: number; y2: number }[]>([]);

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current?.getBoundingClientRect();
      if (!wrap) return;
      const next = shown.flatMap((r, l) => {
        const a = leftRefs.current[l]?.getBoundingClientRect();
        const b = r === null ? null : rightRefs.current[r]?.getBoundingClientRect();
        if (!a || !b) return [];
        return [{ l, x1: a.right - wrap.left, y1: a.top + a.height / 2 - wrap.top, x2: b.left - wrap.left, y2: b.top + b.height / 2 - wrap.top }];
      });
      setLines(next);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [shown]);

  const pickRight = (r: number) => {
    if (!open || pending === null) return;
    setPairs((p) => p.map((x, l) => (l === pending ? r : x === r ? null : x)));
    setPending(null);
  };

  const complete = pairs.every((x) => x !== null);
  const lineColor = (l: number) =>
    phase === "reveal" ? (shown[l] === q.answer[l] ? "var(--color-success)" : "var(--color-danger)") : "var(--color-accent)";

  return (
    <div className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
      <div ref={wrapRef} className="relative grid grid-cols-[1fr_1fr] gap-x-10 sm:gap-x-28">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {lines.map((ln) => {
            const mx = (ln.x1 + ln.x2) / 2;
            return (
              <path
                key={ln.l}
                d={`M${ln.x1} ${ln.y1} C${mx} ${ln.y1} ${mx} ${ln.y2} ${ln.x2} ${ln.y2}`}
                fill="none"
                stroke={lineColor(ln.l)}
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary/50">Code</div>
          {q.left.map((t, l) => {
            const paired = shown[l] !== null;
            const right = phase === "reveal" && shown[l] === q.answer[l];
            return (
              <button
                key={l}
                ref={(el) => {
                  leftRefs.current[l] = el;
                }}
                disabled={!open}
                onClick={() => setPending((p) => (p === l ? null : l))}
                aria-pressed={pending === l}
                className={`min-h-14 cursor-pointer rounded-chip border-[3px] px-4 text-left font-mono text-[17px] transition-colors disabled:cursor-default ${
                  phase === "reveal"
                    ? right
                      ? "border-success bg-success/10"
                      : "border-danger bg-danger/10"
                    : pending === l
                      ? "border-accent bg-accent/10"
                      : paired
                        ? "border-primary bg-surface"
                        : "border-primary/15 bg-surface hover:border-primary"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary/50">Meaning</div>
          {q.right.map((t, r) => {
            const used = shown.includes(r);
            return (
              <button
                key={r}
                ref={(el) => {
                  rightRefs.current[r] = el;
                }}
                disabled={!open}
                onClick={() => pickRight(r)}
                className={`min-h-14 cursor-pointer rounded-chip border-[3px] px-4 text-left text-[17px] font-semibold transition-colors disabled:cursor-default ${
                  used ? "border-primary bg-surface" : "border-primary/15 bg-surface"
                } ${open && pending !== null ? "hover:border-accent hover:bg-accent/5" : ""}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
      {open && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-primary/60">
            {pairs.filter((x) => x !== null).length} / {q.left.length} matched
          </span>
          <Button disabled={!complete} onClick={() => onSubmit(pairs)}>
            Lock answer
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- fill in the blank ---------------- */
function FillBlank({
  q,
  phase,
  locked,
  onSubmit,
}: {
  q: FillQuestion;
  phase: Phase;
  locked: string | null;
  onSubmit: (v: string) => void;
}) {
  const [text, setText] = useState("");
  const open = phase === "answering";
  const shown = locked ?? text;
  const revealTone =
    phase === "reveal" ? (isCorrect(q, locked) ? "border-success bg-success/20" : "border-danger bg-danger/20") : "border-accent";

  return (
    <div className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
      <CodeBlock
        code={q.code}
        blank={
          <input
            value={shown}
            disabled={!open}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            aria-label="Missing code"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) onSubmit(text.trim());
            }}
            style={{ width: `${Math.max(3, shown.length + 1)}ch` }}
            className={`mx-1 rounded-[6px] border-2 bg-white/10 px-1 text-center font-mono text-[15px] text-white outline-none focus:bg-white/15 disabled:opacity-90 ${revealTone}`}
          />
        }
      />
      {phase === "reveal" && !isCorrect(q, locked) && (
        <p className="mt-3 text-sm font-semibold">
          Answer: <code className="rounded bg-success/15 px-2 py-0.5 font-mono">{q.accept[0]}</code>
        </p>
      )}
      {open && (
        <div className="mt-5 flex justify-end">
          <Button disabled={!text.trim()} onClick={() => onSubmit(text.trim())}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}

