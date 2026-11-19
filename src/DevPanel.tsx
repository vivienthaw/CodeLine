import { useEffect, useState, type ReactNode } from "react";
import { CURRENT_STUDENT, JOIN_ERROR_TEXT, MOCK_CODES, SESSION, type JoinError } from "./mock/data";
import { emitDev, type DevAction } from "./devBus";
import { getLive, live, resetLive } from "./mock/live";
import { getState, resetStore, setDev, setState, useStore, type RoundResult } from "./mock/store";
import { EXAMPLE_RESULT } from "./pages/Results";
import { navigate, usePath } from "./router";
import { DEMO_REPORT_SESSION, DEMO_REPORT_STUDENT, DEMO_SET_ID } from "./staff/StaffRoutes";
import { duplicateSet, resetStaff, setStaff, useStaff, type StaffTour } from "./staff/store";
import { getSession, landingPath, signInAs, signOut, useAuth } from "./lib/auth";

const ROUTES = [
  ["/", "Sign-in"],
  ["/join", "Join"],
  ["/lobby", "Lobby"],
  ["/play/codeline", "CodeLine"],
  ["/play/quiz", "Quiz"],
  ["/results", "Results"],
  ["/projector", "Projector"],
  ["/lecturer", "Lecturer console"],
  ["/components", "Components"],
] as const;

const STAFF_ROUTES = [
  ["/staff/questions", "Question Bank"],
  ["/staff/questions/new", "New set"],
  [`/staff/questions/${DEMO_SET_ID}/edit`, "Edit set"],
  ["/staff/sessions", "Sessions"],
  ["/staff/sessions/new", "New session"],
  ["/staff/reports", "Reports"],
  [`/staff/reports/students/${DEMO_REPORT_STUDENT}`, "Student report"],
  [`/staff/reports/sessions/${DEMO_REPORT_SESSION}`, "Session report"],
] as const;

const REVIEW_ROUTES = [
  ["/me", "Student home"],
  ["/me/sessions", "My sessions"],
  ["/me/sessions/w10-loops-arrays", "Review (individual)"],
  ["/me/sessions/w9-arrays-team", "Review (team)"],
  ["/me/sessions/w10-loops-arrays/practice/w10-r1-squad-b", "CodeLine practice"],
  ["/me/sessions/w10-loops-arrays/practice/w10-r2", "Quiz practice"],
  ["/me/sessions/w10-loops-arrays/practice/w10-r1-squad-a", "Other squad (denied)"],
  ["/me/sessions/w8-nested-loops", "Absent session"],
  ["/me/progress", "Progress"],
  ["/me/rank", "Rank"],
] as const;

const NEEDS_STUDENT = new Set(["/join", "/lobby", "/play/codeline", "/play/quiz", "/results"]);
const needsStudent = (to: string) => NEEDS_STUDENT.has(to) || to === "/me" || to.startsWith("/me/");

/* ---------- guided click-through (UI_SPEC §10 step 7) ---------- */

type TourAction = { label: string; run: () => void };
type TourStep = { label: string; actions: TourAction[] };

const fire = (a: DevAction) => () => emitDev(a);

function joinNow() {
  const s = getLive();
  const following = s.status === "open";
  if (getSession()?.role !== "student") signInAs("student");
  const student = getState().student ?? CURRENT_STUDENT;
  setState({ student, joinedCode: following ? s.code : SESSION.classCode });
  if (following) live.addStudent({ id: student.studentId, name: student.name });
  navigate("/lobby");
}

const TOUR: TourStep[] = [
  {
    label: "Sign in",
    actions: [
      {
        label: "Sign in as Vivi",
        run: () => {
          signInAs("student");
          navigate("/join");
        },
      },
    ],
  },
  { label: "Join class CL7K2P", actions: [{ label: "Join session", run: joinNow }] },
  {
    label: "Lobby",
    actions: [{ label: "▶ Start round (3-2-1)", run: () => setDev({ startRound: Date.now() }) }],
  },
  {
    label: "CodeLine: wrong → correct → waiting",
    actions: [
      { label: "1. Wrong drop", run: fire("codeline:dropWrong") },
      { label: "2. Correct drop", run: fire("codeline:placeMine") },
      { label: "3. Classmates finish board", run: fire("codeline:fillBoard") },
    ],
  },
  {
    label: "Results (CodeLine)",
    actions: [{ label: "Advance to Quiz →", run: () => navigate("/play/quiz") }],
  },
  {
    label: "Quiz (5 questions)",
    actions: [
      { label: "Answer correctly + reveal", run: fire("quiz:answerCorrect") },
      { label: "Skip to next question", run: fire("quiz:next") },
    ],
  },
  {
    label: "Results (Quiz)",
    actions: [
      {
        label: "↺ Restart the demo",
        run: () => {
          signOut();
          navigate("/");
        },
      },
    ],
  },
];

function tourIndex(path: string, lastRound: "codeline" | "quiz" | undefined) {
  switch (path) {
    case "/":
      return 0;
    case "/join":
      return 1;
    case "/lobby":
      return 2;
    case "/play/codeline":
      return 3;
    case "/play/quiz":
      return 5;
    case "/results":
      return lastRound === "quiz" ? 6 : 4;
    default:
      return -1;
  }
}

/* ---------- staff click-through (staff spec: "the flow to make clickable") ---------- */

const STAFF_TOUR_SET = "week9-loops";

function staffTour(path: string): TourStep[] {
  return [
    {
      label: "Question Bank → New",
      actions: [{ label: "New question set →", run: () => navigate("/staff/questions/new") }],
    },
    {
      label: "CodeLine editor → Save",
      actions: [
        { label: "1. Fill a sample CodeLine set", run: fire("staff:fillSet") },
        { label: "2. Save", run: fire("staff:save") },
      ],
    },
    {
      label: "Back in the bank → Duplicate a set",
      actions: [{ label: "Duplicate “Week 9 – Loops”", run: () => duplicateSet(STAFF_TOUR_SET) }],
    },
    {
      label: "Sessions → New",
      actions:
        path === "/staff/sessions"
          ? [{ label: "New session →", run: () => navigate("/staff/sessions/new") }]
          : [{ label: "Go to Sessions →", run: () => navigate("/staff/sessions") }],
    },
    {
      label: "Add 2 rounds (CodeLine + Quiz) → Create",
      actions: [
        { label: "1. Fill details + add 2 rounds", run: fire("staff:fillSession") },
        { label: "2. Create session", run: fire("staff:create") },
      ],
    },
    {
      label: "Class code → Open lobby",
      actions: [{ label: "Open lobby →", run: fire("staff:openLobby") }],
    },
    {
      label: "Lobby (students join)",
      actions: [
        {
          label: "▶ Start round 1 as a student",
          run: () => {
            // /play is students only: switch to the demo student, keeping the lobby they joined
            const code = getState().joinedCode;
            signInAs("student");
            setState({ joinedCode: code });
            setDev({ startRound: Date.now() });
          },
        },
        { label: "↺ Restart staff click-through", run: startStaffTour },
      ],
    },
  ];
}

function staffTourIndex(path: string, t: StaffTour) {
  if (path === "/lobby") return t.lobbyOpened ? 6 : -1;
  if (path === "/staff/sessions/new") return t.sessionId ? 5 : 4;
  if (path === "/staff/sessions") return 3;
  if (path.startsWith("/staff/questions/")) return 1;
  if (path === "/staff/questions" || path === "/staff")
    return t.duplicatedId ? 3 : t.savedId ? 2 : 0;
  return -1;
}

function startStaffTour() {
  signInAs("lecturer");
  resetStaff(); // 6 mock sets, no sessions, empty tour
  navigate("/staff/questions");
}

const OPEN_KEY = "codeline.devpanel.open";
/** Demo builds (VITE_DEMO=1) open the panel by default so viewers find the click-through. */
const OPEN_BY_DEFAULT = import.meta.env.VITE_DEMO === "1";

function readOpen() {
  try {
    const saved = localStorage.getItem(OPEN_KEY);
    return saved === null ? OPEN_BY_DEFAULT : saved === "1";
  } catch {
    return OPEN_BY_DEFAULT;
  }
}

/** Floating demo panel (bottom-left). Toggle with the ` key. */
export default function DevPanel() {
  const path = usePath();
  const [open, setOpenState] = useState(readOpen);
  const setOpen = (fn: boolean | ((o: boolean) => boolean)) =>
    setOpenState((o) => {
      const next = typeof fn === "function" ? fn(o) : fn;
      try {
        localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  const lastRound = useStore((s) => s.lastResult?.round);
  const session = useAuth();
  const step = tourIndex(path, lastRound);
  const onStaff = path.startsWith("/staff");
  const staffTourState = useStaff((s) => s.tour);
  const staffStep = staffTourIndex(path, staffTourState);
  const showStaffTour = onStaff || (path === "/lobby" && !!staffTourState.lobbyOpened);
  // bottom-left everywhere: on staff pages that's over the sidebar, clear of the account menu (top-right) and save bars
  const corner = "bottom-4 left-4";
  const offCampus = useStore((s) => s.dev.offCampus);
  const forceJoinError = useStore((s) => s.dev.forceJoinError);
  const hasStudent = useStore((s) => !!s.student);
  const practice = useStore((s) => s.dev.practice);
  const result = useStore((s) => s.lastResult) ?? EXAMPLE_RESULT;
  const patchResult = (patch: Partial<RoundResult>) =>
    setState({ lastResult: { ...result, ...patch } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    // routes are role-guarded (lib/auth): sign in with the role the page needs
    // show the screen as the right demo person (no access rules in the mockup)
    if ((to.startsWith("/staff") || to === "/lecturer") && session?.role !== "staff")
      signInAs("lecturer");
    else if (needsStudent(to) && session?.role !== "student") signInAs("student");
    else if (needsStudent(to) && !hasStudent) setState({ student: CURRENT_STUDENT });
    // /results shows answers only after a round — give the demo a finished round to show
    if (to === "/results" && !getState().lastResult) setState({ lastResult: EXAMPLE_RESULT });
    navigate(to);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Dev panel (press `)"
        className={`fixed ${corner} z-[80] grid size-11 cursor-pointer place-items-center rounded-full bg-primary font-mono text-lg font-bold text-white opacity-60 shadow-lift hover:opacity-100`}
      >
        `
      </button>
    );
  }

  return (
    <div
      className={`fixed ${corner} z-[80] max-h-[calc(100vh-2rem)] w-72 overflow-y-auto rounded-card bg-primary p-4 font-sans text-sm text-white shadow-lift ring-1 ring-white/10`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-bold">Dev panel</span>
        <button
          onClick={() => setOpen(false)}
          className="cursor-pointer rounded px-2 text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>

      {showStaffTour && (
        <Group title="Staff click-through">
          <TourList steps={staffTour(path)} step={staffStep} />
          {staffStep === -1 && (
            <div className="mt-2">
              <DevButton onClick={startStaffTour}>Start the staff click-through</DevButton>
            </div>
          )}
          {staffStep >= 0 && staffStep < 6 && (
            <button
              onClick={startStaffTour}
              className="mt-2 cursor-pointer text-[11px] text-white/45 hover:text-white"
            >
              ↺ Restart from the Question Bank
            </button>
          )}
        </Group>
      )}

      {/* in the lobby the staff click-through already offers "Start round", so the student one waits until round 1 */}
      {!onStaff && !showStaffTour && (
        <Group title="Click-through">
          <TourList steps={TOUR} step={step} />
          {step === -1 && (
            <div className="mt-2">
              <DevButton
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
              >
                Start the click-through from Sign-in
              </DevButton>
            </div>
          )}
        </Group>
      )}

      <Group title="Account">
        <p className="mb-1.5 text-[11px] text-white/60" data-dev-session>
          {session ? (
            <>
              Signed in: <b className="text-white">{session.name}</b> ·{" "}
              {session.role === "student" ? "Student" : session.staffTitle}
            </>
          ) : (
            "Not signed in"
          )}
        </p>
        <div className="grid grid-cols-1 gap-1">
          {(
            [
              ["student", "Student (Vivi)"],
              ["lecturer", "Lecturer"],
              ["ta", "TA"],
            ] as const
          ).map(([who, label]) => (
            <DevButton
              key={who}
              active={
                !!session &&
                (who === "student"
                  ? session.role === "student"
                  : session.role === "staff" && (who === "ta") === (session.staffTitle === "TA"))
              }
              onClick={() => navigate(landingPath(signInAs(who), offCampus))}
            >
              {label}
            </DevButton>
          ))}
          {session && (
            <DevButton
              onClick={() => {
                signOut();
                navigate("/");
              }}
            >
              Sign out
            </DevButton>
          )}
        </div>
      </Group>

      <Group title="Routes">
        <div className="grid grid-cols-2 gap-1">
          {ROUTES.map(([to, label]) => (
            <DevButton key={to} active={path === to} onClick={() => go(to)}>
              {label}
            </DevButton>
          ))}
        </div>
      </Group>

      <Group title="Student review">
        <div className="mb-1 grid grid-cols-2 gap-1" role="group" aria-label="Network">
          <DevButton active={!offCampus} onClick={() => setDev({ offCampus: false })}>
            On campus
          </DevButton>
          <DevButton active={offCampus} onClick={() => setDev({ offCampus: true })}>
            Off campus
          </DevButton>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {REVIEW_ROUTES.map(([to, label]) => (
            <DevButton key={to} active={path === to} onClick={() => go(to)}>
              {label}
            </DevButton>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-white/50">
          Off campus: sign-in lands on /me and /join is blocked. On campus: /me also offers "Join
          live session".
        </p>
      </Group>

      <Group title="Staff">
        <div className="grid grid-cols-2 gap-1">
          {STAFF_ROUTES.map(([to, label]) => (
            <DevButton
              key={to}
              active={path === to}
              onClick={() => {
                if (session?.role !== "staff") signInAs("lecturer");
                navigate(to);
              }}
            >
              {label}
            </DevButton>
          ))}
        </div>
        {path === "/staff/questions" && (
          <div className="mt-1 grid grid-cols-2 gap-1">
            <DevButton onClick={() => setStaff({ sets: [] })}>Empty bank</DevButton>
            <DevButton onClick={resetStaff}>Restore 6 mock sets</DevButton>
          </div>
        )}
      </Group>

      {path === "/join" && (
        <Group title="Join errors">
          <div className="grid grid-cols-2 gap-1">
            <DevButton
              active={forceJoinError === null}
              onClick={() => setDev({ forceJoinError: null })}
            >
              None
            </DevButton>
            {(Object.keys(JOIN_ERROR_TEXT) as JoinError[]).map((k) => (
              <DevButton
                key={k}
                active={forceJoinError === k}
                onClick={() => setDev({ forceJoinError: k })}
              >
                {JOIN_ERROR_TEXT[k]}
              </DevButton>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/60">
            Codes: <code className="font-mono">{SESSION.classCode}</code> ok ·{" "}
            <code className="font-mono">{MOCK_CODES.notStarted}</code> not started ·{" "}
            <code className="font-mono">{MOCK_CODES.ended}</code> ended
          </p>
        </Group>
      )}

      {path === "/play/codeline" && (
        <Group title="CodeLine">
          <div className="grid grid-cols-2 gap-1">
            <DevButton active={practice} onClick={() => setDev({ practice: !practice })}>
              Practice (4 chips)
            </DevButton>
            <DevButton onClick={() => emitDev("codeline:forceWrong")}>Next drop wrong</DevButton>
            <DevButton onClick={() => emitDev("codeline:placeMine")}>Place my line</DevButton>
            <DevButton onClick={() => emitDev("codeline:lowHp")}>Low HP</DevButton>
            <DevButton onClick={() => emitDev("codeline:fillBoard")}>Fill board (win)</DevButton>
            <DevButton onClick={() => emitDev("codeline:timesUp")}>Time's up</DevButton>
          </div>
          <div className="mt-1">
            <DevButton onClick={() => emitDev("codeline:reset")}>Restart round</DevButton>
          </div>
        </Group>
      )}

      {path === "/play/quiz" && (
        <Group title="Quiz variants">
          <div className="grid grid-cols-2 gap-1">
            <DevButton onClick={() => emitDev("quiz:mc")}>Multiple choice</DevButton>
            <DevButton onClick={() => emitDev("quiz:tf")}>True / False</DevButton>
            <DevButton onClick={() => emitDev("quiz:match")}>Matching</DevButton>
            <DevButton onClick={() => emitDev("quiz:fill")}>Fill in blank</DevButton>
            <DevButton onClick={() => emitDev("quiz:reveal")}>Reveal now</DevButton>
            <DevButton onClick={() => emitDev("quiz:next")}>Next question →</DevButton>
          </div>
        </Group>
      )}

      {path === "/projector" && (
        <Group title="Projector states">
          <div className="grid grid-cols-2 gap-1">
            <DevButton onClick={() => emitDev("projector:progress")}>In progress</DevButton>
            <DevButton onClick={() => emitDev("projector:lowHp")}>Low HP</DevButton>
            <DevButton onClick={() => emitDev("projector:defeated")}>Defeated</DevButton>
            <DevButton onClick={() => emitDev("projector:timesUp")}>Time's up</DevButton>
          </div>
        </Group>
      )}

      {path === "/results" && (
        <Group title="Results">
          <div className="grid grid-cols-2 gap-1">
            <DevButton
              active={result.outcome === "defeated"}
              onClick={() => patchResult({ outcome: "defeated" })}
            >
              Professor defeated
            </DevButton>
            <DevButton
              active={result.outcome === "escaped"}
              onClick={() => patchResult({ outcome: "escaped" })}
            >
              Professor escaped
            </DevButton>
            <DevButton
              onClick={() =>
                patchResult({
                  speedBonus: 35,
                  penalties: 0,
                  wrongDrops: 0,
                  attempts: 1,
                  total: 135,
                })
              }
            >
              Score: top 10
            </DevButton>
            <DevButton onClick={() => patchResult({ ...EXAMPLE_RESULT, outcome: result.outcome })}>
              Score: spec example
            </DevButton>
          </div>
          <div className="mt-1">
            <DevButton onClick={() => go("/play/quiz")}>Advance to Quiz →</DevButton>
          </div>
        </Group>
      )}

      {path === "/lobby" && (
        <Group title="Lobby">
          <DevButton onClick={() => setDev({ startRound: Date.now() })}>▶ Start round</DevButton>
        </Group>
      )}

      <Group title="Session">
        <DevButton
          onClick={() => {
            signOut();
            navigate("/");
          }}
        >
          Reset this tab
        </DevButton>
        <div className="mt-1">
          <DevButton onClick={resetLive}>Reset lecturer session (all tabs)</DevButton>
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 border-t border-white/10 pt-3 first-of-type:mt-0">
      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
        {title}
      </div>
      {children}
    </div>
  );
}

function DevButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full cursor-pointer rounded-[6px] px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
        active ? "bg-accent text-white" : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function TourList({ steps, step }: { steps: TourStep[]; step: number }) {
  return (
    <ol className="flex flex-col gap-1">
      {steps.map((t, i) => {
        const done = step > i;
        const current = step === i;
        return (
          <li key={t.label}>
            <div
              className={`flex items-center gap-2 text-xs ${current ? "font-bold" : done ? "text-white/60" : "text-white/40"}`}
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full text-[9px] ${
                  done ? "bg-success" : current ? "bg-accent" : "bg-white/15"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {t.label}
            </div>
            {current && (
              <div className="mb-1 ml-6 mt-1 flex flex-col gap-1">
                {t.actions.map((a) => (
                  <DevButton key={a.label} active onClick={a.run}>
                    {a.label}
                  </DevButton>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
