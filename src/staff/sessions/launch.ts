import { CURRENT_STUDENT } from "../../mock/data";
import { getLive, live } from "../../mock/live";
import { getState as getStudentState, setState as setStudentState } from "../../mock/store";
import { navigate } from "../../router";
import type { QuestionSet } from "../data";
import { toLiveRound, type StaffSession } from "../sessions";
import { getQuestionSets, markTour } from "../store";

/**
 * Turning a staff session into the live one the lobby, lecturer console and projector run.
 * Used by the Session Builder's "class code" modal and by the Sessions list.
 */

/** Rounds whose set still exists in the bank, in the shape the live session expects. */
function liveRounds(session: StaffSession, sets: QuestionSet[] = getQuestionSets()) {
  const byId = new Map(sets.map((s) => [s.id, s]));
  return session.rounds.flatMap((r) => (byId.has(r.setId) ? [r] : [])).map((r, i) => toLiveRound(byId.get(r.setId)!, r, i + 1));
}

/** Is this the session that's currently live (scheduled or open)? */
export function isLive(session: StaffSession) {
  const s = getLive();
  return s.code === session.code && (s.status === "scheduled" || s.status === "open");
}

/** Make this session the live one (students can't join until the lobby opens). Keeps it if it already is. */
export function schedule(session: StaffSession, sets?: QuestionSet[]) {
  if (isLive(session)) return;
  live.create({
    title: session.title,
    mode: session.playMode,
    expected: session.expected,
    code: session.code,
    rounds: liveRounds(session, sets),
  });
}

/** Open the lobby and preview it as a student who has joined with the class code. */
export function openLobby(session: StaffSession, sets?: QuestionSet[]) {
  schedule(session, sets);
  if (getLive().status !== "open") live.openLobby();
  setStudentState({ student: getStudentState().student ?? CURRENT_STUDENT, joinedCode: session.code });
  markTour({ lobbyOpened: true });
  navigate("/lobby");
}

export function openConsole(session: StaffSession, sets?: QuestionSet[]) {
  schedule(session, sets);
  navigate("/lecturer");
}
