import type { Round } from "../mock/data";
import { itemCount, modeInfo, uid, type QuestionSet } from "./data";

/** One round of a staff-built session. */
export type SessionRound = {
  id: string;
  setId: string;
  timerSec: number;
  /** CodeLine scoring */
  base: number;
  speed: number;
  penalty: number;
  /** Other modes: may students change their answer before the question closes? */
  retries: boolean;
};

export type StaffSession = {
  id: string;
  code: string;
  title: string;
  className: string;
  /** ISO local date-time, e.g. 2026-11-17T10:00 */
  startsAt: string;
  playMode: "individual" | "team";
  teamSize: number;
  expected: number;
  rounds: SessionRound[];
  createdAt: number;
  createdBy: string;
};

export const DEFAULT_SCORING = { base: 100, speed: 50, penalty: 10 };
export const QUIZ_SECONDS_PER_QUESTION = 30;
export const MIN_TIMER = 10;
export const MAX_TIMER = 60 * 60;

/** A sensible default timer: CodeLine 5:00, quizzes 0:30 per question. */
export function defaultTimer(set: QuestionSet) {
  return set.mode === "codeline" ? 300 : Math.max(MIN_TIMER, itemCount(set).n * QUIZ_SECONDS_PER_QUESTION);
}

export function newRound(set: QuestionSet): SessionRound {
  return { id: uid("round"), setId: set.id, timerSec: defaultTimer(set), ...DEFAULT_SCORING, retries: false };
}

export const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** "5:00", "5", "90", "1:30" → seconds; null when it isn't a time. */
export function parseTime(text: string): number | null {
  const t = text.trim();
  const m = t.match(/^(\d{1,3}):([0-5]\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d{1,4}$/.test(t)) {
    const n = Number(t);
    return n <= 60 ? n * 60 : n; // "5" → 5 min, "90" → 90 s
  }
  return null;
}

export function scoringLine(set: QuestionSet, r: SessionRound) {
  if (set.mode === "codeline") return `+${r.base} correct · up to +${r.speed} speed · −${r.penalty} wrong`;
  return `+100 correct · up to +50 speed · ${r.retries ? "retries allowed" : "one attempt"}`;
}

/** Highest score one student can get in this round. */
export function maxPoints(set: QuestionSet, r: SessionRound) {
  return set.mode === "codeline" ? r.base + r.speed : itemCount(set).n * 150;
}

/** How many snippets a CodeLine round has to hand out: one per student, or one per team. */
export function participants(s: Pick<StaffSession, "playMode" | "expected" | "teamSize">) {
  return s.playMode === "team" ? Math.ceil(s.expected / Math.max(1, s.teamSize)) : s.expected;
}

/** Shape the live session (lobby, lecturer console, projector) understands. */
export function toLiveRound(set: QuestionSet, r: SessionRound, n: number): Round {
  return {
    n,
    kind: set.mode === "codeline" ? "codeline" : "quiz",
    name: `${modeInfo(set.mode).label} — ${set.title}`,
    timer: set.mode === "codeline" ? fmtTime(r.timerSec) : `${fmtTime(r.timerSec)} · ${itemCount(set).label}`,
    durationSec: r.timerSec,
    scoring: scoringLine(set, r),
    setId: set.id,
    retries: set.mode === "codeline" ? undefined : r.retries,
  };
}

/** 6 chars, no look-alikes (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateCode(taken: Set<string>) {
  for (;;) {
    const code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
    if (!taken.has(code)) return code;
  }
}
