import { getReviewSession, reviewWindow, type ReviewRound, type ReviewSession } from "./review";

/**
 * Practice access (mock layer). A student may practise ONLY what they did in class:
 *  - sessions they joined (absent → nothing),
 *  - rounds they took part in,
 *  - with squads, only their squad's board (never another squad's problem),
 *  - in team sessions, the problems their team did,
 *  - only inside the review window.
 * There is no question-bank browsing and no access to other classes' questions.
 *
 * Practice is never scored: counts live here, apart from Progress and Rank.
 */

export type DenyReason = "unknown" | "other-class" | "absent" | "expired" | "not-in-round" | "other-squad";

export type PracticeAccess =
  | { ok: true; session: ReviewSession; round: ReviewRound }
  | { ok: false; reason: DenyReason; session?: ReviewSession };

/**
 * Questions that exist in the course but are never the student's: another squad's board
 * in the same session, and another class's session. Kept so access checks have something
 * real to refuse (and the denied page can be demoed).
 */
const OTHER_CONTENT: Record<string, { sessionId: string; reason: DenyReason }> = {
  "w10-r1-squad-a": { sessionId: "w10-loops-arrays", reason: "other-squad" },
  "lab2-w10-r1": { sessionId: "cosc2531-lab2-w10", reason: "other-class" },
};

/** Mock enrolment: every demo student shares Vivi's record, so the student id only gates "signed in". */
const MY_CLASS = "COSC1076 · Group A";

export function canPractice(studentId: string | undefined, sessionId: string, questionId: string): PracticeAccess {
  if (!studentId) return { ok: false, reason: "unknown" };
  const other = OTHER_CONTENT[questionId];
  const session = getReviewSession(sessionId);
  if (other && other.reason === "other-class") return { ok: false, reason: "other-class" };
  if (!session) return { ok: false, reason: "unknown" };
  if (session.className !== MY_CLASS) return { ok: false, reason: "other-class", session };
  if (session.attendance !== "joined") return { ok: false, reason: "absent", session };
  if (reviewWindow(session).expired) return { ok: false, reason: "expired", session };
  if (other?.sessionId === sessionId) return { ok: false, reason: other.reason, session };
  const round = session.rounds.find((r) => r.id === questionId);
  if (!round) return { ok: false, reason: "unknown", session };
  if (!round.participated) return { ok: false, reason: "not-in-round", session };
  return { ok: true, session, round };
}

/** Rounds of a session the student may practise (what the review shows practice buttons for). */
export function practisableRounds(studentId: string | undefined, s: ReviewSession) {
  return s.rounds.filter((r) => canPractice(studentId, s.id, r.id).ok);
}

export const DENY_TEXT: Record<DenyReason, string> = {
  unknown: "This question isn't part of any session you attended.",
  "other-class": "This question belongs to another class.",
  absent: "You weren't in this session, so there's nothing to review or practise.",
  expired: "This session's review has expired, so practice is closed too.",
  "not-in-round": "You didn't take part in this round.",
  "other-squad": "This problem was another squad's board — you can practise your own squad's problem.",
};

/* ---------------- practice counts (mockup: fixed demo numbers, never saved) ---------------- */

/** "Practised N times" shown on session cards. Practice is never scored, and in the mockup nothing is recorded. */
const DEMO_COUNTS: Record<string, number> = { "w10-loops-arrays": 3 };

export function practiceCount(_studentId: string | undefined, sessionId: string) {
  return DEMO_COUNTS[sessionId] ?? 0;
}

/** Finishing a practice run doesn't save anything in the mockup. */
export function recordPractice(_studentId: string | undefined, _sessionId: string) {}

export function usePracticeCount(studentId: string | undefined, sessionId: string) {
  return practiceCount(studentId, sessionId);
}
