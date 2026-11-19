import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Button, Icon, Input, formatTime } from "../components";
import { CLASSMATES, ROUNDS, SESSION } from "../mock/data";
import { live, resetLive, useLive, useRoundClock, type LiveSession, type RoundPhase } from "../mock/live";
import { PROBLEM, bossHp, countFilled } from "../mock/problem";
import { Logo } from "./SignIn";

const SIM_TARGET = 38;
const SIM_EVERY_MS = 500;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
}

export default function Lecturer() {
  const status = useLive((s) => s.status);
  return (
    <div className="min-h-screen min-w-[1180px] bg-bg font-sans text-primary">
      <ConsoleHeader />
      {status === "none" ? <Setup /> : <Console />}
    </div>
  );
}

/* ---------------- header ---------------- */
function ConsoleHeader() {
  const status = useLive((s) => s.status);
  const title = useLive((s) => s.title);
  const code = useLive((s) => s.code);

  return (
    <header className="flex h-20 items-center gap-6 border-b border-primary/10 bg-surface px-10 shadow-soft">
      <Logo size="md" />
      <div className="h-10 w-px bg-primary/10" />
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/50">Lecturer console</div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold">{status === "none" ? "New session" : title}</h1>
          {status !== "none" && <StatusBadge status={status} />}
        </div>
      </div>
      {status !== "none" && (
        <>
          <div className="rounded-card border-2 border-primary px-4 py-1.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Class code</div>
            <div className="font-mono text-2xl font-bold tracking-[0.25em]">{code}</div>
          </div>
          <a
            href={`${import.meta.env.BASE_URL.replace(/\/+$/, "")}/projector`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-chip border-2 border-primary px-4 font-semibold hover:bg-primary/5"
          >
            Open projector ↗
          </a>
        </>
      )}
    </header>
  );
}

function StatusBadge({ status }: { status: LiveSession["status"] }) {
  const map = {
    scheduled: ["Not started", "bg-muted/20 text-primary/70"],
    open: ["Live", "bg-success/15 text-success"],
    ended: ["Ended", "bg-danger/10 text-danger"],
    none: ["", ""],
  } as const;
  const [label, cls] = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {status === "open" && <span className="size-2 animate-pulse rounded-full bg-success" />}
      {label}
    </span>
  );
}

/* ---------------- setup ---------------- */
function Setup() {
  const [title, setTitle] = useState(SESSION.title);
  const [mode, setMode] = useState<LiveSession["mode"]>("individual");
  const [expected, setExpected] = useState(SESSION.expectedStudents);
  const [code, setCode] = useState(SESSION.classCode);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-card bg-surface p-8 shadow-soft">
        <h2 className="text-2xl font-extrabold">Create a session</h2>
        <p className="mt-1 text-sm text-primary/60">
          Students can enter the code once you create it, but they'll see "Session hasn't started yet" until you open the lobby.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-5">
          <Input label="Session title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-2" />
          <div>
            <div className="mb-1.5 text-sm font-semibold">Mode</div>
            <Toggle
              options={[
                ["individual", "Individual"],
                ["team", "Team"],
              ]}
              value={mode}
              onChange={setMode}
            />
          </div>
          <Input
            label="Expected students"
            type="number"
            min={1}
            max={300}
            value={expected}
            onChange={(e) => setExpected(Math.max(1, Number(e.target.value) || 1))}
          />
          <div className="col-span-2">
            <div className="mb-1.5 text-sm font-semibold">Class code</div>
            <div className="flex items-center gap-3">
              <span className="rounded-card border-2 border-primary px-4 py-2 font-mono text-2xl font-bold tracking-[0.25em]">
                {code}
              </span>
              <Button variant="ghost" onClick={() => setCode(randomCode())}>
                Regenerate
              </Button>
              {code !== SESSION.classCode && (
                <Button variant="ghost" onClick={() => setCode(SESSION.classCode)}>
                  Use {SESSION.classCode}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-2 text-sm font-semibold">Rounds</div>
          <RoundList current={-1} phase="idle" />
        </div>

        <Button
          fullWidth
          className="mt-8"
          disabled={!title.trim()}
          onClick={() => live.create({ title: title.trim(), mode, expected, code })}
        >
          Create session
        </Button>
      </div>
    </main>
  );
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-chip bg-bg p-1" role="radiogroup">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`min-h-10 cursor-pointer rounded-[6px] text-sm font-semibold ${
            value === v ? "bg-surface shadow-soft" : "text-primary/60 hover:text-primary"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- console ---------------- */
function Console() {
  const status = useLive((s) => s.status);
  return (
    <main className="grid grid-cols-[2fr_1fr] gap-6 px-10 py-8">
      <div className="flex flex-col gap-6">
        {status === "scheduled" && <ScheduledCard />}
        {status === "open" && <RoundControl />}
        {status === "ended" && <EndedCard />}
        <Card title="Rounds">
          <RoundsOverview />
        </Card>
      </div>
      <StudentsPanel />
    </main>
  );
}

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card bg-surface p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function ScheduledCard() {
  const code = useLive((s) => s.code);
  return (
    <Card title="Session created">
      <p className="text-primary/70">
        Show the code <span className="font-mono font-bold text-primary">{code}</span> to the class. Until you open the lobby,
        students entering it see <em>"Session hasn't started yet"</em>.
      </p>
      <div className="mt-5 flex gap-2">
        <Button onClick={live.openLobby}>Open lobby</Button>
        <Button variant="ghost" onClick={resetLive}>
          Discard session
        </Button>
      </div>
    </Card>
  );
}

function EndedCard() {
  return (
    <Card title="Session ended">
      <p className="text-primary/70">Students entering the code now see "Session already ended".</p>
      <Button className="mt-5" onClick={resetLive}>
        Create a new session
      </Button>
    </Card>
  );
}

const PHASE_LABEL: Record<RoundPhase, string> = {
  idle: "Ready",
  countdown: "Starting…",
  running: "Running",
  paused: "Paused",
  ended: "Finished",
};

function RoundControl() {
  const { round, remainingMs, countdownLeft } = useRoundClock();
  const rounds = useLive((s) => s.rounds);
  const r = rounds[round.index]!;
  const isLast = round.index >= rounds.length - 1;
  const board = useLive((s) => s.board);
  const stats = useLive((s) => s.stats);
  const simulate = useLive((s) => s.simulate);
  const students = useLive((s) => s.students);
  const isCodeLine = r.kind === "codeline";
  const filled = countFilled(board);
  const boardFull = filled === PROBLEM.lines.length;
  const healPool = useLive((s) => s.healPool);
  const hp = bossHp(board, healPool);

  // simulated classmates play the shared board while the round runs.
  // The assigned line is left for real student tabs (if any joined).
  useEffect(() => {
    if (!isCodeLine || round.phase !== "running" || !simulate || boardFull) return;
    const t = setTimeout(
      () => {
        const anyReal = students.some((s) => !s.simulated);
        const empties = PROBLEM.lines
          .map((l) => l.line)
          .filter((l) => board[l]?.kind === "empty" && !(anyReal && l === PROBLEM.assignedLine));
        if (!empties.length) return;
        const sims = students.filter((s) => s.simulated);
        const who = sims.length ? sims[Math.floor(Math.random() * sims.length)]!.name : CLASSMATES[0]!;
        if (Math.random() < 0.25) live.recordWrong();
        else live.placeLine(empties[Math.floor(Math.random() * empties.length)]!, who);
      },
      2500 + Math.random() * 2500,
    );
    return () => clearTimeout(t);
  }, [isCodeLine, round.phase, simulate, boardFull, board, students]);

  // the class wins → close the round shortly after (students see the defeat animation first)
  useEffect(() => {
    if (!isCodeLine || !boardFull || (round.phase !== "running" && round.phase !== "paused")) return;
    const t = setTimeout(live.endRound, 2500);
    return () => clearTimeout(t);
  }, [isCodeLine, boardFull, round.phase]);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // this tab drives the shared clock's phase changes
  useEffect(() => {
    if (round.phase === "countdown" && countdownLeft <= 0) live.beginRunning();
    if (round.phase === "running" && remainingMs <= 0) live.endRound();
  }, [round.phase, countdownLeft, remainingMs]);

  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = round.phase === "running" && seconds < 30;

  return (
    <Card
      title={`Round ${r.n} · ${r.kind === "codeline" ? "CodeLine" : "Quiz"}`}
      right={<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold">{PHASE_LABEL[round.phase]}</span>}
    >
      <div className="flex items-center gap-8">
        <div
          className={`grid h-36 w-72 place-items-center rounded-card font-mono text-7xl font-bold tabular-nums transition-colors ${
            round.phase === "countdown"
              ? "bg-accent text-white"
              : urgent
                ? "cl-anim-pulse bg-danger text-white"
                : round.phase === "paused"
                  ? "bg-muted/20 text-primary/60"
                  : "bg-primary text-white"
          }`}
          role="timer"
        >
          {round.phase === "countdown" ? Math.max(1, Math.ceil(countdownLeft / 1000)) : formatTime(seconds)}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold">{r.name}</div>
          <div className="mt-1 font-mono text-xs text-primary/60">{r.scoring}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {round.phase === "idle" && (
              <Button onClick={live.startRound} icon={<PlayIcon />}>
                Start round {r.n}
              </Button>
            )}
            {round.phase === "running" && (
              <Button variant="secondary" onClick={live.pause}>
                Pause
              </Button>
            )}
            {round.phase === "paused" && <Button onClick={live.resume}>Resume</Button>}
            {(round.phase === "running" || round.phase === "paused" || round.phase === "idle") && (
              <Button variant="ghost" onClick={() => live.addTime(30_000)}>
                +30s
              </Button>
            )}
            {(round.phase === "running" || round.phase === "paused") && (
              <Button variant="ghost" className="text-danger!" onClick={live.endRound}>
                End round now
              </Button>
            )}
            {round.phase === "ended" && !isLast && (
              <Button onClick={live.nextRound}>Next: Round {rounds[round.index + 1]!.n} →</Button>
            )}
            {round.phase === "ended" && isLast && <span className="self-center text-sm font-semibold">All rounds done.</span>}
          </div>
        </div>
      </div>

      {isCodeLine && round.phase !== "idle" && round.phase !== "countdown" && (
        <div className="mt-6 grid grid-cols-4 gap-3">
          <LiveStat label="Lines placed" value={`${filled} / ${PROBLEM.lines.length}`} />
          <LiveStat label="Correct" value={`✓ ${stats.correct}`} tone="success" />
          <LiveStat label="Wrong" value={`✕ ${stats.wrong}`} tone="danger" />
          <LiveStat label="Professor HP" value={boardFull ? "Defeated" : `${Math.round(hp)}%`} tone={boardFull ? "success" : undefined} />
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-primary/10 pt-4">
        <p className="text-sm text-primary/60">
          {round.phase === "idle"
            ? "Students in the lobby will see a 3-2-1 countdown when you start."
            : round.phase === "ended"
              ? "Students are on the results screen."
              : boardFull
                ? "Board complete — the class defeated the professor!"
                : "Students are playing. The projector shows the board live."}
        </p>
        {confirmEnd ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">End the whole session?</span>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Cancel
            </Button>
            <Button className="bg-danger! border-danger!" onClick={live.endSession}>
              End session
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmEnd(true)}>
            End session
          </Button>
        )}
      </div>
    </Card>
  );
}

function LiveStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-chip bg-bg px-3 py-2">
      <div className="text-xs font-semibold text-primary/60">{label}</div>
      <div
        className={`font-mono text-xl font-bold tabular-nums ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RoundsOverview() {
  const index = useLive((s) => s.round.index);
  const phase = useLive((s) => s.round.phase);
  const status = useLive((s) => s.status);
  return <RoundList current={status === "open" ? index : -1} phase={phase} />;
}

function RoundList({ current, phase }: { current: number; phase: RoundPhase }) {
  const live_ = useLive((s) => s.rounds);
  const status = useLive((s) => s.status);
  const rounds = status === "none" ? ROUNDS : live_;
  return (
    <ol className="flex flex-col gap-2">
      {rounds.map((r, i) => {
        const done = i < current || (i === current && phase === "ended");
        const active = i === current && !done;
        return (
          <li
            key={r.n}
            className={`flex items-center gap-3 rounded-card border p-3 ${
              active ? "border-accent bg-accent/5" : "border-primary/10"
            }`}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-chip font-bold text-white ${
                done ? "bg-success" : "bg-primary"
              }`}
            >
              {done ? <Icon name="check" size={16} strokeWidth={3} /> : r.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold leading-tight">{r.name}</div>
              <div className="font-mono text-xs text-primary/60">{r.scoring}</div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-primary/60">
              <Icon name="clock" size={14} /> {r.timer}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- students ---------------- */
function StudentsPanel() {
  const students = useLive((s) => s.students);
  const expected = useLive((s) => s.expected);
  const status = useLive((s) => s.status);
  const simulate = useLive((s) => s.simulate);
  // next classmate to "join" — a counter, so removed students don't get re-added
  const nextSim = useRef(
    Math.max(-1, ...students.filter((s) => s.simulated).map((s) => Number(s.id.slice(4)) || 0)) + 1,
  );

  // mock classmates join while the lobby is open
  useEffect(() => {
    if (!simulate || status !== "open") return;
    if (students.length >= SIM_TARGET || nextSim.current >= CLASSMATES.length) return;
    const t = setTimeout(() => {
      const i = nextSim.current++;
      live.addStudent({ id: `sim-${i}`, name: CLASSMATES[i]!, simulated: true });
    }, SIM_EVERY_MS);
    return () => clearTimeout(t);
  }, [simulate, status, students]);

  const pct = Math.min(100, (students.length / expected) * 100);
  const real = students.filter((s) => !s.simulated);

  return (
    <Card
      title="Students"
      right={
        <span className="font-mono text-sm font-bold tabular-nums">
          {students.length} / {expected}
        </span>
      }
    >
      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
        <div className="cl-hp-fill h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>

      <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={simulate} onChange={(e) => live.setSimulate(e.target.checked)} className="size-4 accent-accent" />
        Simulate classmates (join + play)
      </label>
      {real.length === 0 && status !== "ended" && (
        <p className="text-xs text-primary/60">
          Tip: open the student app in another tab, sign in, and enter the code — you'll appear here.
        </p>
      )}

      <ul className="mt-3 max-h-[560px] divide-y divide-primary/10 overflow-y-auto">
        {students.length === 0 && <li className="py-6 text-center text-sm text-primary/50">No one has joined yet.</li>}
        {[...students].reverse().map((s) => (
          <li key={s.id} className="cl-anim-pop group flex items-center gap-3 py-2">
            <Avatar name={s.name} size={30} />
            <span className="flex-1 truncate text-sm font-semibold">{s.name}</span>
            {!s.simulated && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-[#B5600F]">real tab</span>
            )}
            <button
              onClick={() => live.removeStudent(s.id)}
              className="min-h-8 cursor-pointer rounded px-2 text-xs font-semibold text-danger opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove ${s.name}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-primary/10 pt-4 text-xs text-primary/50">
        Display names only.{" "}
        <a href={`${import.meta.env.BASE_URL.replace(/\/+$/, "")}/`} target="_blank" rel="noreferrer" className="underline">
          Open student app in a new tab ↗
        </a>
      </div>
    </Card>
  );
}

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7Z" />
  </svg>
);
