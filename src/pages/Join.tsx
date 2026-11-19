import { useEffect, useRef, useState } from "react";
import { Avatar, Button, CodeInput, Icon, Input } from "../components";
import { INVITEES, JOIN_ERROR_TEXT, MOCK_CODES, SESSION, type JoinError } from "../mock/data";
import { getLive, live } from "../mock/live";
import { resetStore, setState, useStore, type TeamMember } from "../mock/store";
import { Link, navigate } from "../router";
import { AuthLayout, Logo } from "./SignIn";
import { AccountMenu } from "../components/AccountMenu";

function checkCode(code: string): JoinError | null {
  const session = getLive();
  if (session.status !== "none" && code === session.code) {
    if (session.status === "scheduled") return "notStarted";
    if (session.status === "ended") return "ended";
    return null;
  }
  // no lecturer session running → fall back to the static mock session
  if (session.status === "none" && code === SESSION.classCode) return null;
  if (code === MOCK_CODES.notStarted) return "notStarted";
  if (code === MOCK_CODES.ended) return "ended";
  return "notFound";
}

export default function Join() {
  const student = useStore((s) => s.student);
  const forceError = useStore((s) => s.dev.forceJoinError);
  const mode = useStore((s) => s.mode);
  const teamName = useStore((s) => s.teamName);
  const team = useStore((s) => s.team);
  const offCampus = useStore((s) => s.dev.offCampus);

  const [code, setCode] = useState("");
  const [error, setError] = useState<JoinError | null>(null);
  const [loading, setLoading] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!student) navigate("/", { replace: true });
  }, [student]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // seed the team with yourself when switching to team mode
  useEffect(() => {
    if (mode === "team" && student && team.length === 0) {
      setState({
        team: [{ name: student.name, studentId: student.studentId, status: "confirmed" }],
      });
    }
  }, [mode, student, team.length]);

  if (!student) return null;

  const isTeam = mode === "team";
  const teamOk = !isTeam || teamName.trim().length > 0;
  const canJoin = code.length === 6 && teamOk && !loading;
  const nextInvitee = INVITEES.find((p) => !team.some((m) => m.studentId === p.studentId));

  const invite = () => {
    if (!nextInvitee) return;
    const member: TeamMember = { ...nextInvitee, status: "pending" };
    setState((s) => ({ team: [...s.team, member] }));
    timers.current.push(
      window.setTimeout(() => {
        setState((s) => ({
          team: s.team.map((m) =>
            m.studentId === member.studentId ? { ...m, status: "confirmed" } : m,
          ),
        }));
      }, 2000),
    );
  };

  const join = () => {
    setLoading(true);
    setError(null);
    timers.current.push(
      window.setTimeout(() => {
        setLoading(false);
        const err = forceError ?? checkCode(code);
        if (err) {
          setError(err);
          return;
        }
        setState({ joinedCode: code });
        if (getLive().status === "open")
          live.addStudent({ id: student.studentId, name: student.name });
        navigate("/lobby");
      }, 700),
    );
  };

  return (
    <AuthLayout
      topRight={
        <div className="flex items-center gap-2 rounded-full bg-surface py-1 pl-4 pr-1 shadow-soft">
          <Link
            to="/me"
            className="flex min-h-11 items-center text-sm font-semibold text-primary/70 underline-offset-2 hover:text-primary hover:underline"
          >
            My sessions
          </Link>
          <AccountMenu />
        </div>
      }
    >
      {offCampus ? (
        <div
          className="flex w-full max-w-[480px] flex-col items-center rounded-card bg-surface p-6 text-center shadow-soft sm:p-10"
          role="alert"
        >
          <Logo size="md" />
          <div className="mt-8 grid size-16 place-items-center rounded-full bg-danger/10 text-danger">
            <Icon name="wifiOff" size={32} />
          </div>
          <h1 className="mt-4 text-xl font-bold">Connect to the campus network to join</h1>
          <p className="mt-2 text-sm text-primary/60">
            Live sessions only run on-site. Join the university Wi-Fi in class, then enter the code.
          </p>
          <Button className="mt-6" variant="secondary" onClick={() => navigate("/me")}>
            Review past sessions instead
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-[480px] rounded-card bg-surface p-6 shadow-soft sm:p-10">
          <Logo size="md" />

          <h1 className="mt-8 text-center text-2xl font-extrabold">Enter class code</h1>
          <p className="mt-1 text-center text-sm text-primary/60">Shown on the projector</p>

          <div className="mt-6 flex flex-col items-center">
            <CodeInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              error={!!error}
              disabled={loading}
            />
            <p
              className={`mt-2 min-h-5 text-sm font-medium ${error ? "text-danger" : "text-transparent"}`}
              role={error ? "alert" : undefined}
            >
              {error ? JOIN_ERROR_TEXT[error] : " "}
            </p>
          </div>

          {/* Individual / team toggle */}
          <div
            className="mt-4 grid grid-cols-2 rounded-chip bg-bg p-1"
            role="radiogroup"
            aria-label="Join mode"
          >
            {(["individual", "team"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setState({ mode: m })}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-surface text-primary shadow-soft"
                    : "text-primary/60 hover:text-primary"
                }`}
              >
                {m === "team" && <Icon name="users" size={16} />}
                {m === "individual" ? "Individual" : "Join as team"}
              </button>
            ))}
          </div>

          {isTeam && (
            <div className="mt-5 flex flex-col gap-4">
              <Input
                label="Team name"
                placeholder="e.g. Loop Troopers"
                value={teamName}
                onChange={(e) => setState({ teamName: e.target.value })}
              />
              <div>
                <div className="mb-2 text-sm font-semibold">Members</div>
                <ul className="divide-y divide-primary/10 rounded-chip border border-primary/10">
                  {team.map((m) => (
                    <li key={m.studentId} className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar name={m.name} size={30} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-sm font-semibold">{m.name}</div>
                        <div className="font-mono text-xs text-primary/60">{m.studentId}</div>
                      </div>
                      {m.status === "confirmed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                          <Icon name="check" size={13} strokeWidth={3} />
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/15 px-2.5 py-1 text-xs font-semibold text-primary/60">
                          <Icon name="spinner" size={12} />
                          Pending
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" className="mt-2" onClick={invite} disabled={!nextInvitee}>
                  + Invite member
                </Button>
              </div>
            </div>
          )}

          <Button fullWidth className="mt-6" disabled={!canJoin} loading={loading} onClick={join}>
            Join session
          </Button>
          {isTeam && !teamOk && code.length === 6 && (
            <p className="mt-2 text-center text-xs text-primary/60">
              Add a team name to join as a team
            </p>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
