import { useEffect } from "react";
import { Button, Professor } from "./components";
import { useLive, useLiveRounds, useRoundClock } from "./mock/live";
import { useStore } from "./mock/store";
import { Countdown } from "./pages/Lobby";
import { navigate, usePath } from "./router";

const STUDENT_ROUTES = new Set(["/lobby", "/play/codeline", "/play/quiz", "/results"]);

/**
 * Makes student tabs follow the lecturer console:
 * countdown overlay → play screen, round end → results, session end → notice.
 * Does nothing unless the student joined the live session's code.
 */
export default function StudentSync() {
  const path = usePath();
  const joinedCode = useStore((s) => s.joinedCode);
  const status = useLive((s) => s.status);
  const code = useLive((s) => s.code);
  const { round, countdownLeft } = useRoundClock();

  const following = status !== "none" && joinedCode === code && STUDENT_ROUTES.has(path);
  const r = useLiveRounds().current;
  const playRoute = r?.kind === "quiz" ? "/play/quiz" : "/play/codeline";

  useEffect(() => {
    if (!following || status === "ended") return;
    const playing = round.phase === "running" || round.phase === "paused";
    if (playing && path !== playRoute) navigate(playRoute, { replace: true });
    // the CodeLine and Quiz screens wrap up and move on by themselves
    if (round.phase === "ended" && path.startsWith("/play") && path !== "/play/codeline" && path !== "/play/quiz") {
      navigate("/results", { replace: true });
    }
  }, [following, status, round.phase, path, playRoute]);

  if (!following) return null;

  if (status === "ended") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary/95 font-sans text-white">
        <Professor className="h-40" mood="heal" />
        <h2 className="text-4xl font-extrabold">Session ended</h2>
        <p className="text-white/70">Your lecturer has closed this session. Thanks for playing!</p>
        <Button variant="secondary" onClick={() => navigate("/join")}>
          Back to join
        </Button>
      </div>
    );
  }

  if (round.phase === "countdown") {
    return <Countdown n={Math.max(1, Math.ceil(countdownLeft / 1000))} label={`Round ${r?.n ?? 1} starts in`} />;
  }

  if (round.phase === "paused" && path.startsWith("/play")) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-primary/80 font-sans text-white backdrop-blur-sm">
        <h2 className="text-5xl font-extrabold">Paused</h2>
        <p className="text-white/70">Your lecturer paused the round. Hold tight…</p>
      </div>
    );
  }

  return null;
}
