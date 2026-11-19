import { useSyncExternalStore } from "react";
import type { JoinError } from "./data";

/** Tiny mock store for the click-through mockup — in memory only; nothing is saved. */

export type Student = { name: string; studentId: string; email: string };
export type TeamMember = { name: string; studentId: string; status: "confirmed" | "pending" };

export type RoundResult = {
  round: "codeline" | "quiz";
  outcome: "defeated" | "escaped";
  base: number;
  speedBonus: number;
  penalties: number;
  wrongDrops: number;
  attempts: number;
  timeTakenMs: number | null;
  total: number;
  /** Lines the student placed. */
  myLines: number[];
  /** Quiz rounds only. */
  comboBonus?: number;
  quiz?: { id: string; prompt: string; correct: boolean; yourAnswer: string; rightAnswer: string; explanation: string }[];
};

export type AppState = {
  student: Student | null;
  mode: "individual" | "team";
  teamName: string;
  team: TeamMember[];
  joinedCode: string | null;
  lastResult: RoundResult | null;
  dev: {
    /** CodeLine: practice variant (4 chips instead of 1). */
    practice: boolean;
    /** Sign-in: pretend the device is off the campus network. */
    offCampus: boolean;
    /** Join: force this error regardless of the code typed. */
    forceJoinError: JoinError | null;
    /** Lobby: bumped by the dev panel to start the round. */
    startRound: number;
  };
};


const initial: AppState = {
  student: null,
  mode: "individual",
  teamName: "",
  team: [],
  joinedCode: null,
  lastResult: null,
  dev: { practice: false, offCampus: false, forceJoinError: null, startRound: 0 },
};

let state = initial;
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function setDev(patch: Partial<AppState["dev"]>) {
  setState((s) => ({ dev: { ...s.dev, ...patch } }));
}

/** Fresh game state. The campus toggle describes the device, not the user, so it survives sign-in/out. */
export function resetStore() {
  setState((s) => ({ ...initial, dev: { ...initial.dev, offCampus: s.dev.offCampus } }));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useStore<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}
