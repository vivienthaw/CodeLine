import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { CURRENT_STUDENT } from "../../mock/data";
import { getState as getStudentState, resetStore, setState as setStudentState } from "../../mock/store";
import { setStaff } from "../../staff/store";
import { getSession, setSession, subscribeSession, type Session } from "./session.ts";

/**
 * MOCKUP sign-in. There are no sign-in rules, passwords or access checks: you pick one of
 * the demo accounts below and the mockup shows that person's screens.
 */

export { getSession, type Session } from "./session.ts";

export type DemoAccount = "student" | "lecturer" | "ta";

export const DEMO_ACCOUNTS: Record<DemoAccount, Session> = {
  student: { name: CURRENT_STUDENT.name, email: CURRENT_STUDENT.email, studentId: CURRENT_STUDENT.studentId, role: "student" },
  lecturer: { name: "Dr. Alex Morgan", email: "alex.morgan@ad.sit.kmutt.ac.th", role: "staff", staffTitle: "Lecturer" },
  ta: { name: "Sam Rivera", email: "sam.rivera@ad.sit.kmutt.ac.th", role: "staff", staffTitle: "TA" },
};

/** Copy the account into the per-area stores the screens read. */
function sync(s: Session | null) {
  if (s?.role === "student") {
    const cur = getStudentState().student;
    if (!cur || cur.email !== s.email) setStudentState({ student: { name: s.name, email: s.email, studentId: s.studentId! } });
  }
  if (s?.role === "staff") setStaff({ user: { name: s.name, role: s.staffTitle ?? "Lecturer" } });
}

/** Switch to a demo account (no checks). */
export function signInAs(who: DemoAccount): Session {
  const next = DEMO_ACCOUNTS[who];
  if (next.email !== getSession()?.email) {
    if (next.role === "student") resetStore();
    setSession(next);
    sync(next);
  }
  return next;
}

export function signOut() {
  resetStore();
  setSession(null);
}

/** Where each demo account starts. */
export function landingPath(s: Session, offCampus: boolean) {
  if (s.role === "staff") return "/staff/questions";
  return offCampus ? "/me" : "/join";
}

/* ---------------- react ---------------- */

const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const s = useSyncExternalStore(subscribeSession, getSession);
  return <AuthContext.Provider value={s}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
