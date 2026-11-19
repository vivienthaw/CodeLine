import { useEffect, useState, useSyncExternalStore } from "react";
import { ROUNDS, SESSION, type Round } from "./data";
import { HEAL_CAP, SCORING, initialBoard, type Board } from "./problem";

/**
 * "Live session" for the click-through mockup — kept in memory only (nothing is saved;
 * a reload starts fresh). The lecturer console and student screens read it in the same tab.
 */

export type SessionStatus = "none" | "scheduled" | "open" | "ended";
export type RoundPhase = "idle" | "countdown" | "running" | "paused" | "ended";

export type LiveStudent = { id: string; name: string; joinedAt: number; simulated?: boolean };

export type LiveSession = {
  status: SessionStatus;
  title: string;
  code: string;
  mode: "individual" | "team";
  expected: number;
  /** The session's rounds (built-in demo rounds unless staff built the session). */
  rounds: Round[];
  students: LiveStudent[];
  /** Lecturer toggle: mock classmates join and play. */
  simulate: boolean;
  /** Shared CodeLine board for the current round. */
  board: Board;
  stats: { correct: number; wrong: number };
  /** HP healed by wrong answers since the last correct one. */
  healPool: number;
  round: {
    index: number; // into rounds
    phase: RoundPhase;
    /** countdown: when the 3-2-1 began. */
    countdownAt: number | null;
    /** running: wall-clock end time. */
    endsAt: number | null;
    /** paused / idle: ms left on the clock. */
    remainingMs: number;
  };
};

export const COUNTDOWN_MS = 3000;

export function roundDurationMs(rounds: Round[], index: number) {
  return (rounds[index]?.durationSec ?? 0) * 1000;
}

export function freshSession(): LiveSession {
  return {
    status: "none",
    title: SESSION.title,
    code: SESSION.classCode,
    mode: "individual",
    expected: SESSION.expectedStudents,
    rounds: ROUNDS,
    students: [],
    simulate: true,
    board: initialBoard(),
    stats: { correct: 0, wrong: 0 },
    healPool: 0,
    round: { index: 0, phase: "idle", countdownAt: null, endsAt: null, remainingMs: roundDurationMs(ROUNDS, 0) },
  };
}

let cache = freshSession();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getLive() {
  return cache;
}

export function updateLive(fn: (s: LiveSession) => LiveSession | Partial<LiveSession>) {
  cache = { ...cache, ...fn(cache) };
  emit();
}

export function resetLive() {
  updateLive(() => freshSession());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLive<T>(select: (s: LiveSession) => T): T {
  return useSyncExternalStore(subscribe, () => select(cache));
}

/* ---------- lecturer actions ---------- */

export const live = {
  create(opts: { title: string; mode: LiveSession["mode"]; expected: number; code: string; rounds?: Round[] }) {
    const rounds = opts.rounds?.length ? opts.rounds : ROUNDS;
    updateLive(() => ({
      ...freshSession(),
      ...opts,
      rounds,
      status: "scheduled",
      round: { index: 0, phase: "idle", countdownAt: null, endsAt: null, remainingMs: roundDurationMs(rounds, 0) },
    }));
  },
  openLobby() {
    updateLive(() => ({ status: "open" }));
  },
  endSession() {
    updateLive((s) => ({ status: "ended", round: { ...s.round, phase: "ended", endsAt: null } }));
  },
  startRound() {
    updateLive((s) => ({
      board: initialBoard(),
      stats: { correct: 0, wrong: 0 },
      healPool: 0,
      round: { ...s.round, phase: "countdown", countdownAt: Date.now(), endsAt: null, remainingMs: roundDurationMs(s.rounds, s.round.index) },
    }));
  },
  /** Called by the console once the 3-2-1 has elapsed. */
  beginRunning() {
    updateLive((s) =>
      s.round.phase === "countdown"
        ? { round: { ...s.round, phase: "running", endsAt: Date.now() + s.round.remainingMs } }
        : {},
    );
  },
  pause() {
    updateLive((s) =>
      s.round.phase === "running"
        ? { round: { ...s.round, phase: "paused", remainingMs: Math.max(0, (s.round.endsAt ?? 0) - Date.now()), endsAt: null } }
        : {},
    );
  },
  resume() {
    updateLive((s) =>
      s.round.phase === "paused" ? { round: { ...s.round, phase: "running", endsAt: Date.now() + s.round.remainingMs } } : {},
    );
  },
  addTime(ms: number) {
    updateLive((s) => {
      const r = s.round;
      if (r.phase === "running") return { round: { ...r, endsAt: (r.endsAt ?? Date.now()) + ms } };
      if (r.phase === "paused" || r.phase === "idle") return { round: { ...r, remainingMs: r.remainingMs + ms } };
      return {};
    });
  },
  endRound() {
    updateLive((s) => ({ round: { ...s.round, phase: "ended", endsAt: null, remainingMs: 0 } }));
  },
  nextRound() {
    updateLive((s) => {
      const index = Math.min(s.rounds.length - 1, s.round.index + 1);
      return { round: { index, phase: "idle", countdownAt: null, endsAt: null, remainingMs: roundDurationMs(s.rounds, index) } };
    });
  },
  setSimulate(simulate: boolean) {
    updateLive(() => ({ simulate }));
  },
  /** A correct placement on the shared board. Returns false if the slot was already taken. */
  placeLine(line: number, by: string, byId?: string) {
    let ok = false;
    updateLive((s) => {
      if (s.board[line]?.kind !== "empty") return {};
      ok = true;
      return {
        board: { ...s.board, [line]: { kind: "filled", by, byId } },
        stats: { ...s.stats, correct: s.stats.correct + 1 },
        healPool: 0,
      };
    });
    return ok;
  },
  recordWrong() {
    updateLive((s) => ({
      stats: { ...s.stats, wrong: s.stats.wrong + 1 },
      healPool: Math.min(HEAL_CAP, s.healPool + SCORING.healOnWrong),
    }));
  },
  addStudent(student: Omit<LiveStudent, "joinedAt">) {
    updateLive((s) =>
      s.students.some((x) => x.id === student.id)
        ? {}
        : { students: [...s.students, { ...student, joinedAt: Date.now() }] },
    );
  },
  removeStudent(id: string) {
    updateLive((s) => ({ students: s.students.filter((x) => x.id !== id) }));
  },
};

/* ---------- clock ---------- */

/** Re-renders a few times a second while the round is live; returns remaining ms. */
export function useRoundClock() {
  const round = useLive((s) => s.round);
  const [now, setNow] = useState(() => Date.now());
  const ticking = round.phase === "running" || round.phase === "countdown";

  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [ticking]);

  const remainingMs =
    round.phase === "running" ? Math.max(0, (round.endsAt ?? now) - now) : round.phase === "ended" ? 0 : round.remainingMs;
  const countdownLeft =
    round.phase === "countdown" && round.countdownAt ? Math.max(0, COUNTDOWN_MS - (now - round.countdownAt)) : 0;

  return { round, remainingMs, countdownLeft, now };
}

/** Rounds of the live session, and the one currently selected. */
export function useLiveRounds() {
  const rounds = useLive((s) => s.rounds);
  const index = useLive((s) => s.round.index);
  return { rounds, current: rounds[index] };
}
