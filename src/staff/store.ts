import { useSyncExternalStore } from "react";
import { MOCK_SETS, slugify, type QuestionSet } from "./data";
import type { StaffSession } from "./sessions";

/** Mock store for the staff side of the click-through mockup — in memory only; nothing is saved. */

export type StaffRole = "Lecturer" | "TA";
export type StaffUser = { name: string; role: StaffRole };

/** Progress through the staff click-through (dev panel). Each field is set by the real action. */
export type StaffTour = { savedId?: string; duplicatedId?: string; sessionId?: string; lobbyOpened?: boolean };

export type StaffState = {
  user: StaffUser;
  sets: QuestionSet[];
  sessions: StaffSession[];
  tour: StaffTour;
  /** Row the Question Bank should highlight once (not persisted). */
  flash: { id: string; at: number } | null;
};


const initial = (): StaffState => ({
  user: { name: "Dr. Alex Morgan", role: "Lecturer" },
  sets: structuredClone(MOCK_SETS),
  sessions: [],
  tour: {},
  flash: null,
});

let state = initial();
const listeners = new Set<() => void>();

export function getStaff() {
  return state;
}

export function setStaff(patch: Partial<StaffState> | ((s: StaffState) => Partial<StaffState>)) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

export function resetStaff() {
  setStaff((s) => ({ ...initial(), user: s.user }));
}

/** Lecturer and TA have the same permissions — the role is just a label. */
export function setStaffRole(role: StaffRole) {
  setStaff((s) => ({ user: { ...s.user, role, name: role === "TA" ? "Sam Rivera" : "Dr. Alex Morgan" } }));
}

/* ---------------- click-through + highlight ---------------- */

export function markTour(patch: StaffTour) {
  setStaff((s) => ({ tour: { ...s.tour, ...patch } }));
}

/** Ask the Question Bank to highlight a row (e.g. the set that was just saved). */
export function flashSet(id: string) {
  setStaff({ flash: { id, at: Date.now() } });
}

/* ---------------- question sets ---------------- */

/* Question sets — mock data for the click-through mockup. */

export function getQuestionSets(): QuestionSet[] {
  return state.sets;
}

export function getSet(id: string) {
  return state.sets.find((s) => s.id === id);
}

/** The correct snippet / answer for every item of a set. */
export function getAnswerKey(id: string) {
  const set = state.sets.find((s) => s.id === id);
  if (!set) return null;
  return set.mode === "codeline"
    ? set.steps.map((st, i) => ({ n: i + 1, answer: st.java, explanation: st.explanation }))
    : set.questions.map((q, i) => ({ n: i + 1, answer: q }));
}

/** Question sets for staff screens (re-renders on change). */
export function useQuestionSets() {
  return useStaff((s) => s.sets);
}

function uniqueId(base: string) {
  const ids = new Set(state.sets.map((s) => s.id));
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  return id;
}

function copyTitle(title: string) {
  const titles = new Set(state.sets.map((s) => s.title));
  const base = `Copy of ${title}`;
  let t = base;
  for (let n = 2; titles.has(t); n++) t = `${base} (${n})`;
  return t;
}

/** Instantly inserts a copy right after the original. Returns the new set. */
export function duplicateSet(id: string): QuestionSet | null {
  const src = getSet(id);
  if (!src) return null;
  const title = copyTitle(src.title);
  const copy: QuestionSet = {
    ...structuredClone(src),
    id: uniqueId(slugify(title)),
    title,
    usedIn: 0,
    updatedAt: Date.now(),
    updatedBy: state.user.name,
  };
  setStaff((s) => {
    const i = s.sets.findIndex((x) => x.id === id);
    const sets = [...s.sets];
    sets.splice(i + 1, 0, copy);
    return { sets, tour: { ...s.tour, duplicatedId: copy.id }, flash: { id: copy.id, at: Date.now() } };
  });
  return copy;
}

export function deleteSet(id: string) {
  setStaff((s) => ({ sets: s.sets.filter((x) => x.id !== id) }));
}

/** Insert or replace a set (used by the editor). */
export function saveSet(set: QuestionSet): QuestionSet {
  const exists = state.sets.some((s) => s.id === set.id);
  const saved = { ...set, id: exists ? set.id : uniqueId(slugify(set.title)), updatedAt: Date.now(), updatedBy: state.user.name };
  setStaff((s) => ({
    sets: exists ? s.sets.map((x) => (x.id === set.id ? saved : x)) : [saved, ...s.sets],
    tour: saved.status === "ready" ? { ...s.tour, savedId: saved.id } : s.tour,
  }));
  return saved;
}

/* ---------------- sessions ---------------- */

/** Stores the session and counts it against each set it uses ("Used in N sessions"). */
export function addSession(session: StaffSession) {
  const used = new Set(session.rounds.map((r) => r.setId));
  setStaff((s) => ({
    sessions: [session, ...s.sessions],
    tour: { ...s.tour, sessionId: session.id },
    sets: s.sets.map((x) => (used.has(x.id) ? { ...x, usedIn: x.usedIn + 1 } : x)),
  }));
}

/* ---------------- react ---------------- */

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useStaff<T>(select: (s: StaffState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}
