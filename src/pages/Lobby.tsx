import { useEffect, useRef, useState } from "react";
import { Icon, Professor, initials } from "../components";
import { CLASSMATES, ROUNDS, SESSION } from "../mock/data";
import { live, useLive, useLiveRounds } from "../mock/live";
import { useStore } from "../mock/store";
import { navigate } from "../router";
import { Logo } from "./SignIn";

const JOIN_TARGET = 38;
const JOIN_EVERY_MS = 500;
const AVATAR_TINTS = ["bg-primary", "bg-accent", "bg-success", "bg-[#6B5BD2]", "bg-[#2B8CC4]", "bg-[#C2557A]"];

export default function Lobby() {
  const student = useStore((s) => s.student);
  const mode = useStore((s) => s.mode);
  const teamName = useStore((s) => s.teamName);
  const startRound = useStore((s) => s.dev.startRound);
  const joinedCode = useStore((s) => s.joinedCode);
  const liveStatus = useLive((s) => s.status);
  const liveCode = useLive((s) => s.code);
  const liveTitle = useLive((s) => s.title);
  const liveExpected = useLive((s) => s.expected);
  const liveStudents = useLive((s) => s.students);
  const following = liveStatus !== "none" && joinedCode === liveCode;
  const liveRounds = useLiveRounds().rounds;
  const rounds = following ? liveRounds : ROUNDS;
  const liveMode = useLive((s) => s.mode);

  const [localJoined, setJoined] = useState<string[]>(() => (student ? [student.name] : []));
  const joined = following
    ? [student?.name ?? "", ...liveStudents.filter((x) => x.id !== student?.studentId).map((x) => x.name)]
    : localJoined;
  const title = following ? liveTitle : SESSION.title;
  const code = following ? liveCode : SESSION.classCode;
  const expected = following ? liveExpected : SESSION.expectedStudents;
  const [countdown, setCountdown] = useState<number | null>(null);
  const startSeen = useRef(startRound);

  useEffect(() => {
    if (!student) navigate("/", { replace: true });
  }, [student]);

  // mock: a classmate joins every 500ms until 38 (only when no lecturer console is driving the session)
  useEffect(() => {
    if (following || localJoined.length >= JOIN_TARGET) return;
    const t = setTimeout(() => {
      setJoined((j) => [...j, CLASSMATES[j.length - 1] ?? `Student ${j.length + 1}`]);
    }, JOIN_EVERY_MS);
    return () => clearTimeout(t);
  }, [following, localJoined.length]);

  // following a live session with "simulate" on: mock classmates join it too. Uses the same sim-N ids
  // as the lecturer console, so whichever tab adds a classmate first wins and nobody is added twice.
  const liveSimulate = useLive((s) => s.simulate);
  useEffect(() => {
    if (!following || liveStatus !== "open" || !liveSimulate) return;
    const target = Math.min(JOIN_TARGET, liveExpected) - 1; // leave a place for "you"
    if (liveStudents.length >= target) return;
    const taken = new Set(liveStudents.map((x) => x.id));
    const k = CLASSMATES.findIndex((_, i) => !taken.has(`sim-${i}`));
    if (k < 0) return;
    const t = setTimeout(() => live.addStudent({ id: `sim-${k}`, name: CLASSMATES[k]!, simulated: true }), JOIN_EVERY_MS);
    return () => clearTimeout(t);
  }, [following, liveStatus, liveSimulate, liveStudents, liveExpected]);

  // dev panel "Start round" → 3-2-1
  useEffect(() => {
    if (startRound !== startSeen.current) {
      startSeen.current = startRound;
      setCountdown(3);
    }
  }, [startRound]);

  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(() => {
      if (countdown <= 1) navigate("/play/codeline");
      else setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (!student) return null;

  const isTeam = (following ? liveMode : mode) === "team";

  return (
    <div className="flex min-h-screen flex-col bg-bg font-sans text-primary">
      {/* header */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-primary/10 bg-surface px-4 py-3 shadow-soft sm:px-6 md:h-20 md:flex-nowrap md:px-10 md:py-0">
        <div className="hidden sm:block">
          <Logo size="md" />
        </div>
        <div className="hidden h-10 w-px bg-primary/10 sm:block" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary/50">Session</div>
          <h1 className="text-lg font-extrabold leading-tight md:text-xl">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
              isTeam ? "bg-accent/15 text-[#B5600F]" : "bg-primary/10 text-primary"
            }`}
          >
            {isTeam && <Icon name="users" size={15} />}
            {isTeam ? `Team${teamName ? ` · ${teamName}` : ""}` : "Individual"}
          </span>
          <div className="rounded-card border-2 border-primary px-4 py-1.5 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Class code</div>
            <div className="font-mono text-xl font-bold tracking-[0.25em] md:text-2xl">{code}</div>
          </div>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 px-4 py-5 sm:gap-6 sm:px-6 md:px-10 md:py-8 lg:grid-cols-[7fr_3fr]">
        {/* joined students */}
        <section className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
          <div className="mb-5 flex items-center gap-4">
            <ProgressRing value={joined.length} total={expected} />
            <div>
              <div className="text-2xl font-extrabold tabular-nums sm:text-3xl">
                {joined.length} / {expected} <span className="text-xl font-bold text-primary/60">joined</span>
              </div>
              <div className="text-sm text-primary/60">New classmates appear as they join</div>
            </div>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] sm:gap-3">
            {joined.map((name, i) => {
              const me = i === 0;
              return (
                <li
                  key={`${i}-${name}`}
                  className={`cl-anim-pop flex flex-col items-center gap-2 rounded-card border px-2 py-3 ${
                    me ? "border-accent bg-accent/5" : "border-primary/10 bg-surface"
                  }`}
                >
                  <span
                    className={`grid size-12 place-items-center rounded-full text-base font-bold text-white ${
                      AVATAR_TINTS[i % AVATAR_TINTS.length]
                    }`}
                  >
                    {initials(name)}
                  </span>
                  <span className="w-full truncate text-center text-sm font-semibold">
                    {me ? `${name} (you)` : name}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* rounds */}
        <aside className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
          <h2 className="text-lg font-extrabold">Today's rounds</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {rounds.map((r) => (
              <li key={r.n} className="rounded-card border border-primary/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-primary font-bold text-white">
                    {r.n}
                  </span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-accent/15 text-accent">
                    {r.kind === "codeline" ? <CodeIcon /> : <QuizIcon />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold leading-tight">{r.name}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary/60">
                      <Icon name="clock" size={13} /> {r.timer}
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-chip bg-bg px-3 py-2 font-mono text-xs text-primary/80">
                  {r.scoring}
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </main>

      {/* waiting strip */}
      <footer className="flex items-center justify-center gap-4 px-4 pb-6 sm:gap-6 sm:pb-8">
        <Professor className="h-20 shrink-0 sm:h-28" tapping />
        <div className="text-base font-semibold text-primary/80 sm:text-xl">
          Waiting for lecturer to start
          <span className="cl-dots" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </footer>

      {countdown !== null && <Countdown n={countdown} />}
    </div>
  );
}

function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / total);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="-rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-primary/10" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        className="stroke-success transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  );
}

export function Countdown({ n, label = "Round 1 starts in" }: { n: number; label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary/95 text-white"
      role="alert"
      aria-live="assertive"
    >
      <div className="px-4 text-center text-lg font-semibold uppercase tracking-[0.3em] text-white/70 sm:text-2xl">{label}</div>
      <div key={n} className="cl-anim-countdown font-mono text-[140px] font-bold leading-none text-accent sm:text-[220px]">
        {n}
      </div>
    </div>
  );
}

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
  </svg>
);
const QuizIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
  </svg>
);
