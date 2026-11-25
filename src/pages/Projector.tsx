import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BossCard, Professor, formatTime, type BossState } from "../components";
import { useDevAction } from "../devBus";
import { CLASSMATES, ROUNDS } from "../mock/data";
import { useLive, useLiveRounds, useRoundClock } from "../mock/live";
import { HEAL_CAP, PROBLEM, SCORING, bossHp, countFilled, initialBoard, type Board } from "../mock/problem";
import { Link } from "../router";
import { Countdown } from "./Lobby";

/**
 * Classroom screen, laid out at 1920×1080 and scaled to fit whatever display it's on.
 * Follows the lecturer's live CodeLine round when there is one, otherwise runs a self-playing demo.
 * Display names only — never IDs or emails.
 */

const W = 1920;
const H = 1080;
const TOTAL = PROBLEM.lines.length;
const ROUND_MS = ROUNDS[0]!.durationSec * 1000;

type Forced = null | "lowHp" | "defeated" | "timesUp";

export default function Projector() {
  const [demoKey, setDemoKey] = useState(0);
  const [forced, setForced] = useState<Forced>(null);
  useDevAction((a) => {
    if (a === "projector:progress") {
      setForced(null);
      setDemoKey((k) => k + 1);
    }
    if (a === "projector:lowHp") setForced("lowHp");
    if (a === "projector:defeated") setForced("defeated");
    if (a === "projector:timesUp") setForced("timesUp");
  });
  return (
    <Stage>
      <Board key={demoKey} forced={forced} />
    </Stage>
  );
}

/** Fixed 1920×1080 canvas, uniformly scaled and letterboxed. */
function Stage({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ scale: 1, x: 0, y: 0 });
  useLayoutEffect(() => {
    const fit = () => {
      const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
      setBox({ scale, x: (window.innerWidth - W * scale) / 2, y: (window.innerHeight - H * scale) / 2 });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0F223D]">
      {/* quiet way back for the lecturer; brightens on hover/focus so it doesn't distract on the big screen */}
      <Link
        to="/lecturer"
        className="absolute left-3 top-3 z-20 rounded-chip bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/50 transition-colors hover:bg-white/20 hover:text-white focus-visible:text-white"
      >
        ← Lecturer console
      </Link>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: W, height: H, transform: `translate(${box.x}px, ${box.y}px) scale(${box.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function Board({ forced }: { forced: Forced }) {
  /* ---- source: live lecturer round or local demo ---- */
  const status = useLive((s) => s.status);
  const code = useLive((s) => s.code);
  const joined = useLive((s) => s.students.length);
  const liveBoard = useLive((s) => s.board);
  const liveHeal = useLive((s) => s.healPool);
  const liveStats = useLive((s) => s.stats);
  const { round, remainingMs: liveRemaining, countdownLeft } = useRoundClock();

  const liveSession = status === "open";
  const { current: liveRoundInfo } = useLiveRounds();
  const liveRound =
    liveSession &&
    liveRoundInfo?.kind === "codeline" &&
    (round.phase === "running" || round.phase === "paused" || round.phase === "ended");
  const waitingForLecturer = liveSession && !liveRound;

  const demo = useDemo(!liveSession);

  const board = liveRound ? liveBoard : demo.board;
  const stats = liveRound ? liveStats : demo.stats;
  const filled = countFilled(board);
  const full = filled === TOTAL;
  const remainingMs = liveRound ? liveRemaining : demo.remainingMs;

  const defeated = forced === "defeated" || (full && !waitingForLecturer);
  const timesUp =
    !defeated &&
    (forced === "timesUp" || (liveRound ? round.phase === "ended" : !liveSession && remainingMs <= 0));
  const hp = defeated ? 0 : forced === "lowHp" ? 15 : bossHp(board, liveRound ? liveHeal : demo.heal);
  const lowHp = !defeated && !timesUp && hp < 20;

  /* ---- boss reacts to board changes ---- */
  const [boss, setBoss] = useState<BossState>("idle");
  const [trigger, setTrigger] = useState(0);
  const prev = useRef({ filled, wrong: stats.wrong });
  useEffect(() => {
    if (filled > prev.current.filled) {
      setBoss("hit");
      setTrigger((n) => n + 1);
    } else if (stats.wrong > prev.current.wrong) {
      setBoss("heal");
      setTrigger((n) => n + 1);
    }
    prev.current = { filled, wrong: stats.wrong };
  }, [filled, stats.wrong]);
  useEffect(() => {
    if (boss !== "hit" && boss !== "heal") return;
    const t = setTimeout(() => setBoss("idle"), 900);
    return () => clearTimeout(t);
  }, [boss, trigger]);
  const bossState: BossState = defeated ? "defeated" : boss;

  return (
    <div className="relative flex h-full w-full flex-col bg-bg font-sans text-primary">
      {/* ---------- top 35%: boss ---------- */}
      <section className="flex h-[35%] items-center justify-center px-16 pt-4">
        <BossCard
          hp={hp}
          size="lg"
          state={bossState}
          trigger={trigger}
          damage={SCORING.damagePerLine}
          healAmount={SCORING.healOnWrong}
          className="max-w-[1200px]!"
        />
      </section>

      {/* ---------- middle 50%: the desk ---------- */}
      <section className="h-[50%] px-16 py-3">
        <div
          className="relative h-full rounded-[24px] p-7 shadow-lift"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 9px), linear-gradient(180deg, #23436F, #1B365D)",
          }}
        >
          <div className="grid h-full grid-rows-8 gap-2">
            {PROBLEM.lines.map((l) => (
              <DeskRow key={l.line} line={l} cell={board[l.line]!} />
            ))}
          </div>

          {waitingForLecturer && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[24px] bg-primary/92 text-white">
              <div className="text-[34px] font-semibold text-white/70">Join with class code</div>
              <div className="font-mono text-[140px] font-bold leading-none tracking-[0.2em] text-accent">{code}</div>
              <div className="text-[34px] font-semibold">
                {joined} joined · Waiting for the lecturer to start
                <span className="cl-dots" aria-hidden>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- bottom 15%: stats strip ---------- */}
      <section className="flex h-[15%] items-center gap-10 px-16">
        <div
          className={`rounded-[20px] px-8 py-2 font-mono text-[88px] font-bold leading-none tabular-nums ${
            remainingMs < 30_000 && !defeated && !waitingForLecturer
              ? "cl-anim-pulse bg-danger text-white"
              : round.phase === "paused" && liveRound
                ? "bg-muted/30 text-primary/60"
                : "bg-primary text-white"
          }`}
          role="timer"
        >
          {waitingForLecturer ? formatTime(ROUND_MS / 1000) : formatTime(Math.ceil(remainingMs / 1000))}
        </div>
        <div className="text-[40px] font-bold tabular-nums">
          {filled} / {TOTAL} <span className="text-[30px] font-semibold text-primary/60">lines placed</span>
        </div>
        <div className="text-[40px] font-bold tabular-nums text-success">✓ {stats.correct}</div>
        <div className="text-[40px] font-bold tabular-nums text-danger">✕ {stats.wrong}</div>
        <div className="ml-auto -rotate-2 font-marker text-[60px] leading-none text-accent">
          The Class <span className="text-primary">VS</span> Professor
        </div>
      </section>

      {/* ---------- states ---------- */}
      {lowHp && <div className="cl-anim-edge-pulse pointer-events-none absolute inset-0" aria-hidden />}
      {liveRound && round.phase === "paused" && !defeated && !timesUp && (
        <div className="absolute inset-x-0 top-[35%] flex justify-center">
          <div className="rounded-full bg-primary px-10 py-3 text-[40px] font-extrabold text-white shadow-lift">Paused</div>
        </div>
      )}
      {defeated && <ClassWins />}
      {timesUp && <Escaped />}
      {liveSession && round.phase === "countdown" && (
        <Countdown n={Math.max(1, Math.ceil(countdownLeft / 1000))} label={`Round ${liveRoundInfo?.n ?? round.index + 1} starts in`} />
      )}
    </div>
  );
}

function DeskRow({ line, cell }: { line: (typeof PROBLEM.lines)[number]; cell: Board[number] }) {
  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,40fr)_minmax(0,60fr)] items-stretch gap-6">
      <div className="flex min-w-0 items-center gap-5 font-mono text-[30px] text-white">
        <span className="w-8 shrink-0 text-right text-white/40">{line.line}</span>
        <span className="truncate whitespace-pre">{line.pseudo}</span>
      </div>
      {cell.kind === "filled" ? (
        <div key="filled" className="cl-anim-snap flex min-w-0 items-center gap-4 rounded-[12px] bg-success px-5 text-white">
          <code className="truncate font-mono text-[28px] font-semibold">{line.java}</code>
          <span className="ml-auto shrink-0 truncate text-[28px] font-semibold text-white/85">{cell.by}</span>
        </div>
      ) : cell.kind === "autofilled" ? (
        <div className="flex min-w-0 items-center gap-4 rounded-[12px] bg-muted/80 px-5 text-white">
          <code className="truncate font-mono text-[28px] italic">{line.java}</code>
          <span className="ml-auto shrink-0 text-[28px] font-semibold text-white/80">Auto-filled</span>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-[12px] border-[3px] border-dashed border-white/35 text-[28px] font-semibold text-white/40">
          waiting for code…
        </div>
      )}
    </div>
  );
}

/* ---------------- end states ---------------- */
const CONFETTI = Array.from({ length: 90 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 13) % 20) / 10,
  dur: 2.4 + ((i * 7) % 10) / 6,
  color: ["#F28C28", "#2EAD6B", "#F5C542", "#E5484D", "#FFFFFF"][i % 5]!,
  rot: (i * 47) % 360,
}));

function ClassWins() {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-primary/85" role="alert">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="cl-anim-confetti absolute top-[-20px] block h-6 w-3 rounded-sm"
          style={
            {
              left: `${c.left}%`,
              background: c.color,
              "--dx": `${((i % 7) - 3) * 40}px`,
              "--dy": "1150px",
              "--rot": `${c.rot + 540}deg`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
              animationIterationCount: "infinite",
            } as CSSProperties
          }
        />
      ))}
      <Professor mood="defeated" className="h-56 -rotate-90" stroke="#FFFFFF" />
      <div className="cl-anim-pop mt-4 font-marker text-[200px] leading-none text-accent drop-shadow-lg">CLASS WINS!</div>
      <div className="mt-4 text-[44px] font-bold text-white">The professor has been defeated 🎉</div>
    </div>
  );
}

function Escaped() {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-primary/90 text-white" role="alert">
      <Professor mood="heal" className="h-72" />
      <div className="cl-anim-pop mt-2 font-marker text-[140px] leading-none text-accent">The professor escaped!</div>
      <div className="mt-6 text-[44px] font-semibold text-white/75">Time's up — he'll be back next round.</div>
    </div>
  );
}

/* ---------------- self-playing demo (no lecturer session) ---------------- */
function useDemo(enabled: boolean) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [heal, setHeal] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const startAt = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = Math.max(0, ROUND_MS - (now - startAt.current));
  const full = countFilled(board) === TOTAL;

  useEffect(() => {
    if (!enabled || full || remainingMs <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [enabled, full, remainingMs <= 0]);

  useEffect(() => {
    if (!enabled || full || remainingMs <= 0) return;
    const t = setTimeout(
      () => {
        if (Math.random() < 0.3) {
          setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
          setHeal((h) => Math.min(HEAL_CAP, h + SCORING.healOnWrong));
          return;
        }
        const empties = PROBLEM.lines.map((l) => l.line).filter((l) => board[l]?.kind === "empty");
        const line = empties[Math.floor(Math.random() * empties.length)];
        if (line === undefined) return;
        const by = CLASSMATES[Math.floor(Math.random() * CLASSMATES.length)]!;
        setBoard((b) => ({ ...b, [line]: { kind: "filled", by } }));
        setStats((s) => ({ ...s, correct: s.correct + 1 }));
        setHeal(0);
      },
      2500 + Math.random() * 2000,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, full, board, stats.wrong]);

  return { board, heal, stats, remainingMs };
}
