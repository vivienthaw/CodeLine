import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  BossCard,
  Professor,
  PseudoRow,
  SnippetChip,
  ToastProvider,
  TopBar,
  useToast,
  type BossState,
  type SlotState,
} from "../components";
import { useDevAction } from "../devBus";
import { CLASSMATES, CURRENT_STUDENT, ROUNDS } from "../mock/data";
import { live, useLive, useLiveRounds, useRoundClock } from "../mock/live";
import { HEAL_CAP, PROBLEM, SCORING, bossHp, countFilled, initialBoard, type Board } from "../mock/problem";
import { setState, useStore } from "../mock/store";
import { navigate } from "../router";

/* ---------------- types ---------------- */

type Rows = Board;

type MyChip = { id: number; line: number; code: string; placed: boolean; wrong: boolean };

type Drag = {
  chipId: number;
  code: string;
  /** origin chip rect */
  ox: number;
  oy: number;
  ow: number;
  oh: number;
  /** grab offset inside the chip */
  gx: number;
  gy: number;
  /** pointer */
  sx: number;
  sy: number;
  x: number;
  y: number;
  moved: boolean;
  returning: boolean;
};

const TOTAL = PROBLEM.lines.length;
const ROUND_MS = ROUNDS[0]!.durationSec * 1000;
const DRAG_THRESHOLD = 6;
const RETURN_MS = 260;
const EDGE_SCROLL_PX = 72;

const javaFor = (line: number) => PROBLEM.lines.find((l) => l.line === line)!.java;

function initialChips(practice: boolean): MyChip[] {
  const lines = practice ? PROBLEM.practiceLines : [PROBLEM.assignedLine];
  return lines.map((line, id) => ({ id, line, code: javaFor(line), placed: false, wrong: false }));
}

function slotAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const slot = el?.closest<HTMLElement>("[data-slot]");
  return slot ? Number(slot.dataset.slot) : null;
}

/* ---------------- page ---------------- */

export default function CodeLinePage() {
  const practice = useStore((s) => s.dev.practice);
  const [resetN, setResetN] = useState(0);
  useDevAction((a) => {
    if (a === "codeline:reset") setResetN((n) => n + 1);
  });
  return (
    <ToastProvider>
      <CodeLine key={`${practice}-${resetN}`} practice={practice} />
    </ToastProvider>
  );
}

function CodeLine({ practice }: { practice: boolean }) {
  const toast = useToast();
  const student = useStore((s) => s.student) ?? CURRENT_STUDENT;

  /* ---- clock: follow the lecturer's round if we joined it, else a local 5:00 ---- */
  const joinedCode = useStore((s) => s.joinedCode);
  const liveStatus = useLive((s) => s.status);
  const liveCode = useLive((s) => s.code);
  const { round, remainingMs: liveRemaining } = useRoundClock();
  const { current: liveRoundInfo } = useLiveRounds();
  const liveClock =
    liveStatus === "open" &&
    joinedCode === liveCode &&
    liveRoundInfo?.kind === "codeline" &&
    (round.phase === "running" || round.phase === "paused" || round.phase === "ended");
  /** Following a lecturer round → the board, heal and wrong count are shared with every tab + the projector. */
  const shared = liveClock;
  const liveBoard = useLive((s) => s.board);
  const liveHeal = useLive((s) => s.healPool);
  const liveWrong = useLive((s) => s.stats.wrong);

  const startAt = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [forcedTimeUp, setForcedTimeUp] = useState(false);

  /* ---- game state ---- */
  const [localRows, setLocalRows] = useState<Rows>(initialBoard);
  const [localHeal, setLocalHeal] = useState(0);
  const [hpOverride, setHpOverride] = useState<number | null>(null);
  const [chips, setChips] = useState<MyChip[]>(() => initialChips(practice));
  const [boss, setBoss] = useState<BossState>("idle");
  const [bossTrigger, setBossTrigger] = useState(0);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({ base: 0, speed: 0, penalties: 0, wrong: 0, attempts: 0, firstPlacedMs: null as number | null });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [forceWrong, setForceWrong] = useState(false);
  const [ending, setEnding] = useState<null | "defeated" | "timesup">(null);

  const rows = shared ? liveBoard : localRows;
  const filled = countFilled(rows);
  const allFilled = filled === TOTAL;
  const hp = allFilled ? 0 : (hpOverride ?? bossHp(rows, shared ? liveHeal : localHeal));
  const waiting = chips.every((c) => c.placed);

  const roundMs = liveClock && liveRoundInfo ? liveRoundInfo.durationSec * 1000 : ROUND_MS;
  const elapsedMs = () => (liveClock ? roundMs - liveRemaining : Date.now() - startAt.current);
  const remainingMs = forcedTimeUp ? 0 : liveClock ? liveRemaining : Math.max(0, ROUND_MS - (now - startAt.current));
  const seconds = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (liveClock || ending) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [liveClock, ending]);

  // refs so pointer listeners and timeouts always see the latest state
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const latest = useRef({ score, stats, chips, elapsedMs });
  latest.current = { score, stats, chips, elapsedMs };

  /* ---- boss ---- */
  const bossEvent = useCallback((kind: "hit" | "heal") => {
    setBoss((b) => (b === "defeated" ? b : kind));
    setBossTrigger((n) => n + 1);
  }, []);
  useEffect(() => {
    if (boss !== "hit" && boss !== "heal") return;
    const t = setTimeout(() => setBoss((b) => (b === "defeated" ? b : "idle")), 900);
    return () => clearTimeout(t);
  }, [boss, bossTrigger]);

  // animate from data changes so classmates' moves (on the shared board) hit / heal the boss too
  const wrongCount = shared ? liveWrong : stats.wrong;
  const prev = useRef({ filled, wrongCount });
  useEffect(() => {
    if (filled > prev.current.filled) {
      setHpOverride(null);
      bossEvent("hit");
    } else if (wrongCount > prev.current.wrongCount) {
      setHpOverride(null);
      bossEvent("heal");
    }
    prev.current = { filled, wrongCount };
  }, [filled, wrongCount, bossEvent]);

  const fillRow = (line: number, by: string, byId?: string) => {
    if (shared) live.placeLine(line, by, byId);
    else {
      setLocalRows((r) => (r[line]?.kind === "empty" ? { ...r, [line]: { kind: "filled", by, byId } } : r));
      setLocalHeal(0);
    }
  };

  /* ---- placing ---- */
  const placeCorrect = (chipId: number, line: number) => {
    const bonus = Math.max(
      0,
      Math.round(SCORING.maxSpeedBonus * (1 - latest.current.elapsedMs() / SCORING.speedWindowMs)),
    );
    fillRow(line, student.name, student.studentId);
    setChips((cs) => cs.map((c) => (c.id === chipId ? { ...c, placed: true, wrong: false } : c)));
    setScore((s) => s + SCORING.correct + bonus);
    setStats((s) => ({
      ...s,
      base: s.base + SCORING.correct,
      speed: s.speed + bonus,
      attempts: s.attempts + 1,
      firstPlacedMs: s.firstPlacedMs ?? latest.current.elapsedMs(),
    }));
    toast("correct", `+${SCORING.correct} pts · +${bonus} speed bonus`);
  };

  const placeWrong = () => {
    setScore((s) => s - SCORING.wrong);
    setStats((s) => ({ ...s, penalties: s.penalties + SCORING.wrong, wrong: s.wrong + 1, attempts: s.attempts + 1 }));
    if (shared) live.recordWrong();
    else setLocalHeal((h) => Math.min(HEAL_CAP, h + SCORING.healOnWrong));
    toast("wrong", `−${SCORING.wrong} pts · try again`);
  };

  /** Returns true when the drop was correct. */
  const resolve = (chipId: number, line: number): boolean => {
    const chip = latest.current.chips.find((c) => c.id === chipId);
    if (!chip || chip.placed || rowsRef.current[line]?.kind !== "empty") return false;
    setSelectedId(null);
    setHoverLine(null);
    const correct = chip.line === line && !forceWrong;
    if (forceWrong) setForceWrong(false);
    if (correct) placeCorrect(chipId, line);
    else placeWrong();
    return correct;
  };

  const markWrong = (chipId: number) =>
    setChips((cs) => cs.map((c) => (c.id === chipId ? { ...c, wrong: true } : c)));
  const clearWrong = useCallback(
    (chipId: number) => setChips((cs) => cs.map((c) => (c.id === chipId ? { ...c, wrong: false } : c))),
    [],
  );

  /* ---- pointer drag ---- */
  const dragRef = useRef<Drag | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  const updateDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };

  const validSlot = (line: number | null) => (line !== null && rowsRef.current[line]?.kind === "empty" ? line : null);

  const sendHome = (d: Drag, wrong: boolean) => {
    updateDrag({ ...d, returning: true });
    setTimeout(() => {
      updateDrag(null);
      if (wrong) markWrong(d.chipId);
    }, RETURN_MS);
  };

  const onChipPointerDown = (chip: MyChip, e: ReactPointerEvent<HTMLDivElement>) => {
    if (chip.placed || ending || dragRef.current || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    updateDrag({
      chipId: chip.id,
      code: chip.code,
      ox: r.left,
      oy: r.top,
      ow: r.width,
      oh: r.height,
      gx: e.clientX - r.left,
      gy: e.clientY - r.top,
      sx: e.clientX,
      sy: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      returning: false,
    });
  };

  const dragging = !!drag && !drag.returning;
  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.returning) return;
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_THRESHOLD;
      updateDrag({ ...d, x: e.clientX, y: e.clientY, moved });
      if (moved) setHoverLine(validSlot(slotAt(e.clientX, e.clientY)));
    };

    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.returning) return;
      if (!d.moved) {
        // a tap, not a drag → tap mode selection
        updateDrag(null);
        setSelectedId((s) => (s === d.chipId ? null : d.chipId));
        return;
      }
      setHoverLine(null);
      const line = validSlot(slotAt(e.clientX, e.clientY));
      if (line === null) {
        sendHome(d, false); // dropped outside a slot: no penalty
        return;
      }
      if (resolveRef.current(d.chipId, line)) updateDrag(null);
      else sendHome(d, true);
    };

    const cancel = () => {
      const d = dragRef.current;
      setHoverLine(null);
      if (d) sendHome(d, false);
    };

    // auto-scroll the board when dragging near its top/bottom edge
    let raf = 0;
    const tick = () => {
      const d = dragRef.current;
      const board = boardRef.current;
      if (d?.moved && board) {
        const r = board.getBoundingClientRect();
        if (d.x > r.left - 400 && d.x < r.right) {
          const topGap = d.y - r.top;
          const bottomGap = r.bottom - d.y;
          let dy = 0;
          if (topGap < EDGE_SCROLL_PX && topGap > -60) dy = -Math.ceil((EDGE_SCROLL_PX - topGap) / 6);
          else if (bottomGap < EDGE_SCROLL_PX && bottomGap > -60) dy = Math.ceil((EDGE_SCROLL_PX - bottomGap) / 6);
          if (dy) {
            board.scrollTop += dy;
            setHoverLine(validSlot(slotAt(d.x, d.y)));
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragging]);

  /* ---- tap mode / keyboard ---- */
  const onSlotActivate = (line: number) => {
    if (selectedId === null || ending) return;
    const id = selectedId;
    if (!resolve(id, line)) markWrong(id);
  };

  const onChipKey = (chip: MyChip, e: KeyboardEvent<HTMLDivElement>) => {
    if (chip.placed || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    setSelectedId((s) => (s === chip.id ? null : chip.id));
  };

  /* ---- classmates fill the board while you wait ---- */
  useEffect(() => {
    if (shared || !waiting || ending || allFilled) return;
    const t = setTimeout(
      () => {
        const empties = Object.entries(rowsRef.current)
          .filter(([, r]) => r.kind === "empty")
          .map(([l]) => Number(l));
        if (!empties.length) return;
        const line = empties[Math.floor(Math.random() * empties.length)]!;
        const by = CLASSMATES[Math.floor(Math.random() * CLASSMATES.length)]!;
        fillRow(line, by);
      },
      2000 + Math.random() * 2000,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, waiting, ending, allFilled, rows]);

  /* ---- round end ---- */
  const finish = useCallback((outcome: "defeated" | "escaped") => {
    const { score, stats, chips } = latest.current;
    setState({
      lastResult: {
        round: "codeline",
        outcome,
        base: stats.base,
        speedBonus: stats.speed,
        penalties: stats.penalties,
        wrongDrops: stats.wrong,
        attempts: stats.attempts,
        timeTakenMs: stats.firstPlacedMs,
        total: score,
        myLines: chips.filter((c) => c.placed).map((c) => c.line),
      },
    });
    navigate("/results");
  }, []);

  useEffect(() => {
    if (!allFilled || ending) return;
    setBoss("defeated");
    setEnding("defeated");
    updateDrag(null);
  }, [allFilled, ending]);

  useEffect(() => {
    if (ending || allFilled) return;
    if (remainingMs <= 0 || (liveClock && round.phase === "ended")) {
      setEnding("timesup");
      updateDrag(null);
      setSelectedId(null);
    }
  }, [remainingMs, liveClock, round.phase, ending, allFilled]);

  useEffect(() => {
    if (!ending) return;
    const t = setTimeout(() => finish(ending === "defeated" ? "defeated" : "escaped"), ending === "defeated" ? 2000 : 2500);
    return () => clearTimeout(t);
  }, [ending, finish]);

  /* ---- dev panel actions ---- */
  useDevAction((a) => {
    if (ending) return;
    if (a === "codeline:forceWrong") setForceWrong(true);
    if (a === "codeline:lowHp") setHpOverride(15);
    if (a === "codeline:dropWrong") {
      // simulate dropping your chip on the wrong empty step
      const chip = latest.current.chips.find((c) => !c.placed);
      const line = PROBLEM.lines.find((l) => l.line !== chip?.line && rowsRef.current[l.line]?.kind === "empty")?.line;
      if (chip && line !== undefined && !resolve(chip.id, line)) markWrong(chip.id);
    }
    if (a === "codeline:timesUp") setForcedTimeUp(true);
    if (a === "codeline:placeMine") {
      for (const c of latest.current.chips) if (!c.placed) placeCorrect(c.id, c.line);
    }
    if (a === "codeline:fillBoard") {
      for (const c of latest.current.chips) if (!c.placed) placeCorrect(c.id, c.line);
      let i = 0;
      for (const l of PROBLEM.lines) {
        if (rowsRef.current[l.line]!.kind === "empty" && !latest.current.chips.some((c) => c.line === l.line)) {
          fillRow(l.line, CLASSMATES[(i++ * 7) % CLASSMATES.length]!);
        }
      }
    }
  });

  /* ---- render ---- */
  const slotStateFor = (line: number): SlotState => {
    const r = rows[line]!;
    if (r.kind === "filled") return "filled";
    if (r.kind === "autofilled") return "autofilled";
    return hoverLine === line ? "hover" : "empty";
  };

  const placedChips = chips.filter((c) => c.placed);
  const tapArmed = selectedId !== null;

  return (
    // phones/tablets: one scrolling column; desktop (lg): the fixed full-height two-column game
    <div className="flex min-h-screen flex-col bg-bg font-sans text-primary lg:h-screen">
      <TopBar
        roundLabel="Round 1 · CodeLine"
        seconds={seconds}
        score={score}
        placed={filled}
        total={TOTAL}
        name={student.name}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-[28fr_72fr] lg:gap-6 lg:p-6">
        {/* ---------- left ---------- */}
        {/* tablets: professor + your code side by side; desktop: the left column */}
        <aside className="grid min-h-0 gap-4 md:grid-cols-2 lg:flex lg:flex-col">
          <BossCard
            hp={hp}
            size="md"
            state={boss}
            trigger={bossTrigger}
            damage={SCORING.damagePerLine}
            healAmount={SCORING.healOnWrong}
            className="max-w-none! max-lg:gap-2 max-lg:p-3"
            artClassName="h-20 lg:h-36"
          />

          <div className="flex min-h-0 flex-1 flex-col rounded-card bg-surface p-4 shadow-soft sm:p-5">
            {waiting ? (
              <>
                <div className="flex items-center gap-2 text-lg font-extrabold text-success">
                  <span aria-hidden>✓</span> {placedChips.length > 1 ? "Your lines are placed!" : "Your line is placed!"}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {placedChips.map((c) => (
                    <SnippetChip key={c.id} code={c.code} state="locked" />
                  ))}
                </div>
                <p className="mt-4 text-sm text-primary/70">Watch the board — help the class defeat the professor</p>
              </>
            ) : (
              <>
                <h2 className="text-base font-extrabold">{practice ? "Your clipped code (practice)" : "Your clipped code"}</h2>
                <div className="mt-3 flex flex-col gap-2 overflow-y-auto">
                  {chips.map((c) => {
                    const isOrigin = drag?.chipId === c.id;
                    const state = c.placed
                      ? "locked"
                      : c.wrong
                        ? "wrong"
                        : selectedId === c.id
                          ? "selected"
                          : "default";
                    return (
                      <SnippetChip
                        key={c.id}
                        code={c.code}
                        state={state}
                        onPointerDown={(e) => onChipPointerDown(c, e)}
                        onKeyDown={(e) => onChipKey(c, e)}
                        onWrongDone={() => clearWrong(c.id)}
                        style={{ touchAction: "none" }}
                        className={isOrigin && drag?.moved ? "opacity-80" : ""}
                        aria-label={`Code snippet: ${c.code}. Press Enter to select, then choose a step.`}
                      />
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-primary/70">
                  {tapArmed ? "Now tap the matching pseudocode step" : (
                    <>
                      <span className="lg:hidden">Tap your code, then tap the matching step below</span>
                      <span className="hidden lg:inline">Drag your code to the matching pseudocode step</span>
                    </>
                  )}
                </p>
              </>
            )}
            {forceWrong && (
              <div className="mt-auto pt-3 text-xs font-semibold text-danger">Dev: next drop will count as wrong</div>
            )}
          </div>
        </aside>

        {/* ---------- right ---------- */}
        <section className="flex min-h-0 flex-col gap-4">
          <ProblemCard />

          <div className="relative flex min-h-0 flex-1 flex-col rounded-card bg-surface shadow-soft">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="text-base font-extrabold">Pseudocode board</h2>
              <span className="hidden text-xs font-semibold text-primary/50 sm:inline">Java goes on the right →</span>
            </div>
            <ScrollArea scrollRef={boardRef}>
              <div className="flex flex-col gap-2 px-3 pb-4 sm:px-5 sm:pb-5">
                {PROBLEM.lines.map((l) => {
                  const r = rows[l.line]!;
                  const st = slotStateFor(l.line);
                  const armed = tapArmed && r.kind === "empty";
                  return (
                    <PseudoRow
                      key={l.line}
                      lineNo={l.line}
                      text={l.pseudo}
                      slotState={st}
                      highlight={armed}
                      chip={
                        r.kind === "filled" ? (
                          <SnippetChip code={l.java} state="locked" />
                        ) : r.kind === "autofilled" ? (
                          <SnippetChip code={l.java} state="autofilled" />
                        ) : null
                      }
                      caption={
                        r.kind === "filled" ? (
                          r.byId === student.studentId ? (
                            <span className="font-semibold text-accent">You</span>
                          ) : (
                            r.by
                          )
                        ) : r.kind === "autofilled" ? (
                          "Auto-filled (absent)"
                        ) : undefined
                      }
                      slotProps={
                        armed
                          ? {
                              role: "button",
                              tabIndex: 0,
                              "aria-label": `Place code on step ${l.line}`,
                              style: { cursor: "pointer" },
                              onClick: () => onSlotActivate(l.line),
                              onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onSlotActivate(l.line);
                                }
                              },
                              onMouseEnter: () => setHoverLine(l.line),
                              onMouseLeave: () => setHoverLine((h) => (h === l.line ? null : h)),
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </section>
      </main>

      {drag && drag.moved && <DragLayer drag={drag} />}

      {ending === "defeated" && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center">
          <div className="cl-anim-pop rounded-card bg-success px-6 py-3 text-xl font-extrabold text-white shadow-lift sm:px-8 sm:py-4 sm:text-3xl">
            Professor defeated! 🎉
          </div>
        </div>
      )}
      {ending === "timesup" && <TimesUp />}
    </div>
  );
}

/* ---------------- pieces ---------------- */

function ProblemCard() {
  return (
    <div className="rounded-card bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold sm:text-xl">{PROBLEM.title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-primary/75">{PROBLEM.statement}</p>
        </div>
        <span className="group relative shrink-0">
          <button
            aria-disabled
            className="min-h-11 cursor-not-allowed px-1 text-sm font-semibold text-muted underline underline-offset-2"
            onClick={(e) => e.preventDefault()}
          >
            Show hint
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-chip bg-primary px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-soft transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          >
            Hints unlock later
          </span>
        </span>
      </div>
    </div>
  );
}

/** Scroll container with a hidden native scrollbar and a custom thumb indicator on the right. */
function ScrollArea({ scrollRef, children }: { scrollRef: RefObject<HTMLDivElement | null>; children: ReactNode }) {
  const [thumb, setThumb] = useState({ top: 0, height: 0, visible: false });
  const trackRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const visible = scrollHeight > clientHeight + 1;
    const height = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
    const top = visible ? (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height) : 0;
    setThumb({ top, height, visible });
  }, [scrollRef]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure, scrollRef]);

  const jumpTo = (clientY: number) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const r = track.getBoundingClientRect();
    const ratio = (clientY - r.top) / r.height;
    el.scrollTo({ top: ratio * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={measure}
        className="h-full overflow-y-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {thumb.visible && (
        <div
          ref={trackRef}
          onClick={(e) => jumpTo(e.clientY)}
          className="absolute bottom-3 right-2 top-1 w-2 cursor-pointer rounded-full bg-primary/8"
          aria-hidden
        >
          <div
            className="absolute inset-x-0 rounded-full bg-accent"
            style={{ top: thumb.top, height: thumb.height }}
          />
        </div>
      )}
    </div>
  );
}

/** Floating chip + orange hand-drawn arrow from the chip's origin to the cursor. */
function DragLayer({ drag }: { drag: Drag }) {
  const left = drag.returning ? drag.ox : drag.x - drag.gx;
  const top = drag.returning ? drag.oy : drag.y - drag.gy;

  // arrow: origin chip's right edge → floating chip's left edge
  const sx = drag.ox + drag.ow;
  const sy = drag.oy + drag.oh / 2;
  const ex = left;
  const ey = top + drag.oh / 2;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy);
  const showArrow = !drag.returning && len > 40;

  let arrow: ReactNode = null;
  if (showArrow) {
    const bend = Math.min(120, len * 0.3);
    const cx = (sx + ex) / 2 + (-dy / len) * bend;
    const cy = (sy + ey) / 2 + (dx / len) * bend;
    const angle = Math.atan2(ey - cy, ex - cx);
    const head = 16;
    const h1 = `${ex - head * Math.cos(angle - 0.5)},${ey - head * Math.sin(angle - 0.5)}`;
    const h2 = `${ex - head * Math.cos(angle + 0.5)},${ey - head * Math.sin(angle + 0.5)}`;
    arrow = (
      <g fill="none" stroke="var(--color-accent)" strokeLinecap="round" strokeLinejoin="round">
        {/* second, slightly offset stroke gives the hand-drawn look */}
        <path d={`M${sx + 2} ${sy - 2} Q${cx + 7} ${cy - 5} ${ex - 1} ${ey + 2}`} strokeWidth={2} opacity={0.35} />
        <path d={`M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`} strokeWidth={4} />
        <path d={`M${h1} L${ex},${ey} L${h2}`} strokeWidth={4} />
      </g>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
      <svg className="absolute inset-0 h-full w-full">{arrow}</svg>
      <div
        className={`absolute ${drag.returning ? "transition-[left,top] ease-out" : ""}`}
        style={{ left, top, width: drag.ow, transitionDuration: `${RETURN_MS}ms` }}
      >
        <SnippetChip code={drag.code} state="dragging" />
      </div>
    </div>
  );
}

function TimesUp() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary/95 text-white" role="alert">
      <Professor className="h-48" mood="heal" />
      <div className="cl-anim-pop text-8xl font-extrabold text-accent">Time's up!</div>
      <p className="text-xl text-white/70">The professor escaped… let's see how the class did.</p>
    </div>
  );
}
