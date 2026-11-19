/** Mock data from UI_SPEC §0. */

export const SESSION = {
  title: "Week 9 — Loops",
  classCode: "CL7K2P",
  expectedStudents: 40,
};

/** Extra codes that trigger each join error (any other unknown code → "Code not found"). */
export const MOCK_CODES = {
  notStarted: "WAIT00",
  ended: "DONE00",
} as const;

export type JoinError = "notFound" | "notStarted" | "ended";

export const JOIN_ERROR_TEXT: Record<JoinError, string> = {
  notFound: "Code not found",
  notStarted: "Session hasn't started yet",
  ended: "Session already ended",
};

export const CURRENT_STUDENT = {
  name: "Vivi",
  studentId: "66130500047",
  email: "66130500047@ad.sit.kmutt.ac.th",
};


export type Round = {
  n: number;
  kind: "codeline" | "quiz";
  name: string;
  timer: string;
  /** Total round length on the shared clock. */
  durationSec: number;
  scoring: string;
  /** Set from the staff Session Builder (absent for the built-in demo rounds). */
  setId?: string;
  retries?: boolean;
};

export const ROUNDS: Round[] = [
  {
    n: 1,
    kind: "codeline",
    name: "CodeLine — Sum of even numbers",
    timer: "5:00",
    durationSec: 300,
    scoring: "+100 correct · up to +50 speed · −10 wrong",
  },
  {
    n: 2,
    kind: "quiz",
    name: "Quiz — Loop tracing",
    timer: "0:30 × 5 questions",
    durationSec: 150,
    scoring: "+100 correct · up to +50 speed · class combo bonus",
  },
];

/** Classmates who "join" the lobby one by one. */
export const CLASSMATES = [
  "Mai Nguyen", "Arjun Patel", "Sofia Rossi", "Kenji Sato", "Lina Haddad", "Tom Becker",
  "Chloe Martin", "Omar Farouk", "Ava Kim", "Leo Silva", "Priya Shah", "Noah Wilson",
  "Hana Ito", "Lucas Costa", "Zara Ali", "Ethan Brown", "Mia Chen", "Ravi Kumar",
  "Ella Novak", "Sam Okafor", "Isla Murphy", "Yusuf Demir", "Nora Berg", "Dev Mehta",
  "Grace Liu", "Ben Cohen", "Amara Diallo", "Finn Walsh", "Lea Dubois", "Kai Tanaka",
  "Rosa Garcia", "Max Fischer", "Aisha Bello", "Jin Park", "Eva Horvat", "Theo Laurent",
  "Maya Singh", "Oscar Lind", "Ivy Zhang",
];

/** Names offered by the mock "Invite member" button. */
export const INVITEES = [
  { name: "Mai Nguyen", studentId: "66130500113" },
  { name: "Arjun Patel", studentId: "66130500841" },
  { name: "Sofia Rossi", studentId: "66130500520" },
  { name: "Kenji Sato", studentId: "66130500376" },
];
