/** The signed-in demo account — in memory only (a reload signs you out). */

export type Session = {
  name: string;
  email: string;
  /** students only */
  studentId?: string;
  role: "student" | "staff";
  /** staff only — just the badge */
  staffTitle?: "Lecturer" | "TA";
};

let session: Session | null = null;
const listeners = new Set<() => void>();

export const getSession = () => session;

export function setSession(s: Session | null) {
  session = s;
  listeners.forEach((l) => l());
}

export function subscribeSession(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
