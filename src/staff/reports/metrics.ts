import { useSyncExternalStore } from "react";
import { CLASS, getReportSessions, getStudents, TOPICS, type RoundKind, type Session, type Student, type StudentSession, type Topic } from "./data";

/* ---------------- filters (shared by every report page, kept per tab) ---------------- */

export type RangePreset = "week" | "month" | "semester";
export type Filters = { classId: string; range: RangePreset; mode: "all" | RoundKind; play: "all" | "individual" | "team" };
export const DEFAULT_FILTERS: Filters = { classId: CLASS.id, range: "semester", mode: "all", play: "all" };
export const RANGE_LABEL: Record<RangePreset, string> = { week: "This week", month: "This month", semester: "Semester" };

let filters: Filters = DEFAULT_FILTERS; // in memory only
const listeners = new Set<() => void>();

export function setFilters(patch: Partial<Filters>) {
  filters = { ...filters, ...patch };
  listeners.forEach((l) => l());
}
export function useFilters() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => filters,
  );
}

const DAY = 86_400_000;
const daysAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY;

export function sessionInFilters(s: Session, f: Filters) {
  if (f.classId !== CLASS.id) return false;
  if (f.range === "week" && daysAgo(s.date) > 7) return false;
  if (f.range === "month" && daysAgo(s.date) > 30) return false;
  if (f.mode !== "all" && !s.kinds.includes(f.mode)) return false;
  if (f.play !== "all" && s.play !== f.play) return false;
  return true;
}
export const filteredSessions = (f: Filters) => getReportSessions().filter((s) => sessionInFilters(s, f));
/** With a Mode filter, only rounds of that mode count towards scores and accuracy. */
const roundCounts = (kind: RoundKind, f: Filters) => f.mode === "all" || kind === f.mode;

/* ---------------- per student, per session ---------------- */

export const resultFor = (s: Session, studentId: string) => s.results.find((r) => r.studentId === studentId)!;

export function sessionScore(r: StudentSession, f: Filters) {
  return r.rounds.filter((x) => roundCounts(x.kind, f)).reduce((a, x) => a + x.score, 0);
}

/** Ranked results for one session (absent students are not ranked). */
export function sessionRanking(s: Session, f: Filters) {
  const rows = s.results
    .filter((r) => r.attendance !== "absent")
    .map((r) => ({ r, score: sessionScore(r, f) }))
    .sort((a, b) => b.score - a.score);
  const rankOf = new Map<string, number>();
  rows.forEach((x, i) => rankOf.set(x.r.studentId, i > 0 && rows[i - 1]!.score === x.score ? rankOf.get(rows[i - 1]!.r.studentId)! : i + 1));
  return { rows, rankOf, ranked: rows.length };
}

export type SessionSummary = {
  s: Session;
  avg: number;
  min: number;
  max: number;
  joined: number;
  autofilled: number;
  absent: number;
  scores: number[];
};
export function summarizeSession(s: Session, f: Filters): SessionSummary {
  const present = s.results.filter((r) => r.attendance !== "absent");
  const scores = present.map((r) => sessionScore(r, f));
  return {
    s,
    avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    min: scores.length ? Math.min(...scores) : 0,
    max: scores.length ? Math.max(...scores) : 0,
    joined: s.results.filter((r) => r.attendance === "joined").length,
    autofilled: s.results.filter((r) => r.attendance === "autofilled").length,
    absent: s.results.filter((r) => r.attendance === "absent").length,
    scores,
  };
}

/* ---------------- per student, across sessions ---------------- */

export type StudentSummary = {
  st: Student;
  sessions: number;
  attended: number;
  absences: number;
  avgScore: number;
  accuracy: number | null;
  correct: number;
  attempted: number;
  wrong: number;
  avgLineSec: number | null;
  trend: (number | null)[];
  lastActive: string | null;
  practised: number;
};

export function summarizeStudent(st: Student, sessions: Session[], f: Filters): StudentSummary {
  let correct = 0;
  let attempted = 0;
  let wrong = 0;
  const lineSecs: number[] = [];
  const scores: number[] = [];
  const trend: (number | null)[] = [];
  let lastActive: string | null = null;
  let absences = 0;
  let practised = 0;
  for (const s of sessions) {
    const r = resultFor(s, st.id);
    practised += r.practised;
    if (r.attendance === "absent") {
      absences += 1;
      trend.push(null);
      continue;
    }
    const sc = sessionScore(r, f);
    scores.push(sc);
    trend.push(sc);
    lastActive = s.date;
    for (const x of r.rounds.filter((x) => roundCounts(x.kind, f))) {
      correct += x.correct;
      attempted += x.attempted;
      wrong += x.wrong;
      if (x.lineSec !== null && x.kind === "codeline") lineSecs.push(x.lineSec);
    }
  }
  return {
    st,
    sessions: sessions.length,
    attended: scores.length,
    absences,
    avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    accuracy: attempted ? correct / attempted : null,
    correct,
    attempted,
    wrong,
    avgLineSec: lineSecs.length ? lineSecs.reduce((a, b) => a + b, 0) / lineSecs.length : null,
    trend,
    lastActive,
    practised,
  };
}

export const classSummaries = (sessions: Session[], f: Filters) => getStudents().map((st) => summarizeStudent(st, sessions, f));

/** Class rank by average score ("Game performance"). */
export function classRank(all: StudentSummary[], id: string) {
  const sorted = [...all].filter((x) => x.attended).sort((a, b) => b.avgScore - a.avgScore);
  return { rank: sorted.findIndex((x) => x.st.id === id) + 1, of: sorted.length };
}

/* ---------------- topics ---------------- */

export function topicAccuracy(sessions: Session[], f: Filters, studentId?: string) {
  return TOPICS.map((topic: Topic) => {
    let correct = 0;
    let attempted = 0;
    const of = sessions.filter((s) => s.topic === topic);
    for (const s of of)
      for (const r of s.results) {
        if (studentId && r.studentId !== studentId) continue;
        if (r.attendance === "absent") continue;
        for (const x of r.rounds.filter((x) => roundCounts(x.kind, f))) {
          correct += x.correct;
          attempted += x.attempted;
        }
      }
    return { topic, sessions: of.length, accuracy: attempted ? correct / attempted : null };
  });
}

/* ---------------- needs attention ---------------- */

export type Flag = "accuracy" | "absences" | "wrong";
export const FLAG_TEXT: Record<Flag, string> = { accuracy: "Accuracy under 50%", absences: "2+ absences", wrong: "Many wrong attempts" };

export function needsAttention(all: StudentSummary[]) {
  const attended = all.filter((x) => x.attended);
  const perSession = attended.map((x) => x.wrong / x.attended).sort((a, b) => a - b);
  // "many" = in the top 10% of wrong attempts per session attended
  const cut = perSession[Math.floor(perSession.length * 0.9)] ?? Infinity;
  return all
    .map((x) => {
      const flags: Flag[] = [];
      if (x.accuracy !== null && x.accuracy < 0.5) flags.push("accuracy");
      if (x.absences >= 2) flags.push("absences");
      if (x.attended && x.wrong / x.attended >= cut && x.wrong > 0) flags.push("wrong");
      return { x, flags };
    })
    .filter((y) => y.flags.length)
    .sort((a, b) => b.flags.length - a.flags.length || (a.x.accuracy ?? 1) - (b.x.accuracy ?? 1));
}

/* ---------------- formatting ---------------- */

export const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
export const mmss = (s: number | null) => (s === null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
export const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const longDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
