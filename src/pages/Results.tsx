import { useMemo, useState } from "react";
import { Avatar, BossCard, Button, Icon, Professor, formatTime } from "../components";
import { CLASSMATES, CURRENT_STUDENT, ROUNDS } from "../mock/data";
import { useLive } from "../mock/live";
import { PROBLEM } from "../mock/problem";
import { getRoundAnswers } from "../mock/reveal";
import { useStore, type RoundResult } from "../mock/store";
import { Logo } from "./SignIn";

/** Spec §7 example numbers — used when /results is opened without playing a round. */
export const EXAMPLE_RESULT: RoundResult = {
  round: "codeline",
  outcome: "defeated",
  base: 100,
  speedBonus: 35,
  penalties: 20,
  wrongDrops: 2,
  attempts: 3,
  timeTakenMs: 72_000,
  total: 115,
  myLines: [PROBLEM.assignedLine],
};

type Entry = { id: string; name: string; score: number; team?: boolean; me?: boolean };

const TEAM_NAMES = [
  "Loop Troopers",
  "Null Pointers",
  "The Semicolons",
  "Bit Busters",
  "Stack Overflowers",
];

/** Deterministic mock scores so the leaderboard doesn't reshuffle on every render. */
function mockEntries(teamMode: boolean, quiz: boolean): Entry[] {
  const out: Entry[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  CLASSMATES.slice(0, 37).forEach((name, i) => {
    const correct = rand() > 0.12;
    const score = quiz
      ? // 5 questions: some right, plus speed + combo bonuses
        Math.round((1 + Math.floor(rand() * 5)) * (100 + rand() * 50) + rand() * 40)
      : correct
        ? 100 + Math.round(rand() * 50) - 10 * Math.floor(rand() * 3)
        : -10 * Math.floor(rand() * 3);
    out.push({ id: `c${i}`, name, score });
  });
  if (teamMode) {
    TEAM_NAMES.forEach((name, i) =>
      out.push({ id: `t${i}`, name, score: (quiz ? 5 : 1) * (120 + Math.round(rand() * 40)), team: true }),
    );
  }
  return out;
}

export default function Results() {
  const stored = useStore((s) => s.lastResult);
  const student = useStore((s) => s.student) ?? CURRENT_STUDENT;
  const mode = useStore((s) => s.mode);
  const teamName = useStore((s) => s.teamName);
  const liveIndex = useLive((s) => s.round.index);
  const liveStatus = useLive((s) => s.status);
  const liveCode = useLive((s) => s.code);
  const liveRounds = useLive((s) => s.rounds);
  const joinedCode = useStore((s) => s.joinedCode);
  const livePhase = useLive((s) => s.round.phase);

  const result = stored ?? EXAMPLE_RESULT;
  const won = result.outcome === "defeated";
  const teamMode = mode === "team";
  const roundNo = result.round === "quiz" ? 2 : 1;

  const board = useMemo(() => {
    const me: Entry = {
      id: "me",
      name: teamMode && teamName ? teamName : student.name,
      score: result.total,
      team: teamMode,
      me: true,
    };
    return [...mockEntries(teamMode, result.round === "quiz"), me].sort(
      (a, b) => b.score - a.score || (a.me ? -1 : b.me ? 1 : 0),
    );
  }, [teamMode, teamName, student.name, result.total, result.round]);

  const myRank = board.findIndex((e) => e.me) + 1;
  const following = liveStatus !== "none" && joinedCode === liveCode;
  const nextRound = (following ? liveRounds : ROUNDS)[following ? liveIndex + (livePhase === "ended" ? 1 : 0) : roundNo];
  const lecturerQueuedNext = livePhase === "idle" && liveIndex === roundNo;

  return (
    <div className="min-h-screen bg-bg font-sans text-primary">
      <header className="flex h-14 items-center gap-6 border-b border-primary/10 bg-surface px-4 shadow-soft sm:h-16 md:px-8">
        <div className="hidden sm:block">
          <Logo size="md" />
        </div>
        <div className="hidden h-8 w-px bg-primary/10 sm:block" />
        <div className="font-bold">Round {roundNo} · Results</div>
      </header>

      <div className="mx-auto max-w-[1360px] px-3 py-4 sm:px-4 md:px-8 md:py-6">
        <Banner won={won} quiz={result.round === "quiz"} />

        <div className="mt-4 grid grid-cols-1 gap-4 md:mt-6 lg:grid-cols-[3fr_2fr] lg:gap-6">
          {/* ---------- left: answer & explanation ---------- */}
          {result.round === "quiz" ? (
            <QuizReview rows={result.quiz ?? []} />
          ) : (
            <section className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
              <CodeLineAnswers myLines={result.myLines} />
            </section>
          )}

          {/* ---------- right ---------- */}
          <div className="flex flex-col gap-4 lg:gap-6">
            <ScoreCard result={result} />
            <Leaderboard board={board} myRank={myRank} />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 pb-6">
          <Button disabled className="min-w-56">
            {nextRound
              ? `Next round: ${nextRound.kind === "quiz" ? "Quiz" : "CodeLine"}`
              : "Session complete"}
          </Button>
          <p className="text-sm text-primary/60">
            {nextRound ? (
              <>
                {lecturerQueuedNext
                  ? "Round " + (roundNo + 1) + " is ready — waiting for lecturer to start"
                  : "Waiting for lecturer"}
                <span className="cl-dots" aria-hidden>
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </>
            ) : (
              "That's all for today — thanks for playing!"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- banner ---------------- */
function Banner({ won, quiz }: { won: boolean; quiz: boolean }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-4 overflow-hidden rounded-card px-5 py-5 text-center shadow-soft sm:flex-row sm:gap-8 sm:px-10 sm:py-6 sm:text-left ${
        won ? "bg-primary text-white" : "bg-surface text-primary"
      }`}
    >
      {won ? (
        <BossCard hp={0} size="sm" state="defeated" className="shrink-0 bg-white/95" />
      ) : (
        <div className="relative shrink-0">
          <Professor className="h-24 sm:h-32" mood="heal" />
          <span className="absolute -right-4 top-0 rotate-12 font-mono text-xl font-bold text-accent">
            HA HA!
          </span>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          {won ? "Professor defeated! 🎉" : "The professor escaped…"}
        </h1>
        <p className={`mt-2 text-base sm:text-lg ${won ? "text-white/75" : "text-primary/60"}`}>
          {quiz
            ? won
              ? "The class answered well enough to knock him out."
              : "He survived the quiz — still standing, just about."
            : won
              ? "Every line was placed — the class wins this round."
              : "Time ran out before the board was complete. He'll be back for the next round."}
        </p>
      </div>
    </div>
  );
}

/* ---------------- answer rows ---------------- */
/** Answers come from the data layer, which only releases them once the round is over. */
function CodeLineAnswers({ myLines }: { myLines: number[] }) {
  const answers = getRoundAnswers("codeline");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-lg font-extrabold">Answer &amp; explanation</h2>
        <span className="text-sm text-primary/60">{answers.title}</span>
      </div>
      <div className="hidden grid-cols-[1fr_1fr_44px] gap-x-4 border-b border-primary/10 px-3 pb-2 text-xs font-bold uppercase tracking-wider text-primary/50 sm:grid">
        <span>Pseudocode</span>
        <span>Java</span>
        <span />
      </div>
      <ol className="divide-y divide-primary/10" data-answers>
        {answers.lines.map((l) => (
          <AnswerRow key={l.line} line={l} mine={myLines.includes(l.line)} />
        ))}
      </ol>
    </>
  );
}

function AnswerRow({ line, mine }: { line: (typeof PROBLEM.lines)[number]; mine: boolean }) {
  const [open, setOpen] = useState(mine);
  const id = `exp-${line.line}`;
  return (
    <li className={mine ? "-mx-3 rounded-chip bg-accent/8 px-3 ring-2 ring-accent" : ""}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="grid min-h-12 w-full cursor-pointer grid-cols-[minmax(0,1fr)_32px] items-center gap-x-3 gap-y-1.5 px-3 py-2 text-left sm:grid-cols-[1fr_1fr_44px] sm:gap-x-4"
      >
        <span className="flex min-w-0 items-center gap-3 font-mono text-[13px]">
          <span className="w-4 text-right text-muted">{line.line}</span>
          <span className="min-w-0 whitespace-pre-wrap break-words">{line.pseudo.trim()}</span>
          {mine && (
            <span className="rounded-full bg-accent px-2 py-0.5 font-sans text-[11px] font-bold text-white">
              Your line
            </span>
          )}
        </span>
        <code className="col-start-1 row-start-2 justify-self-start break-all rounded-[6px] bg-success/10 px-2 py-1 font-mono text-[13px] sm:col-start-auto sm:row-start-auto sm:justify-self-auto">
          {line.java}
        </code>
        <span
          className={`col-start-2 row-start-1 grid place-items-center text-primary/60 transition-transform sm:col-start-auto sm:row-start-auto ${open ? "rotate-180" : ""}`}
        >
          <Icon name="chevron" size={20} />
        </span>
      </button>
      {open && (
        <p id={id} className="px-3 pb-3 text-sm leading-relaxed text-primary/75 sm:pl-10">
          {line.explanation}
        </p>
      )}
    </li>
  );
}

/* ---------------- quiz review ---------------- */
function QuizReview({ rows }: { rows: NonNullable<RoundResult["quiz"]> }) {
  const right = rows.filter((r) => r.correct).length;
  return (
    <section className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold">Answer &amp; explanation</h2>
        <span className="text-sm text-primary/60">
          {right} / {rows.length} correct
        </span>
      </div>
      {rows.length === 0 && <p className="text-sm text-primary/60">No questions were answered.</p>}
      <ol className="divide-y divide-primary/10">
        {rows.map((r, i) => (
          <QuizRow key={r.id} row={r} n={i + 1} />
        ))}
      </ol>
    </section>
  );
}

function QuizRow({ row, n }: { row: NonNullable<RoundResult["quiz"]>[number]; n: number }) {
  const [open, setOpen] = useState(!row.correct);
  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-1 py-2 text-left"
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full text-white ${row.correct ? "bg-success" : "bg-danger"}`}
        >
          <Icon name={row.correct ? "check" : "x"} size={14} strokeWidth={3} />
        </span>
        <span className="flex-1 font-semibold">
          Q{n}. {row.prompt}
        </span>
        <span className={`text-primary/60 transition-transform ${open ? "rotate-180" : ""}`}>
          <Icon name="chevron" size={20} />
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 pb-3 pl-11 text-sm">
          <div>
            <span className="text-primary/60">Your answer: </span>
            <span className={`font-mono ${row.correct ? "text-success" : "text-danger"}`}>
              {row.yourAnswer}
            </span>
          </div>
          {!row.correct && (
            <div>
              <span className="text-primary/60">Correct: </span>
              <span className="font-mono text-success">{row.rightAnswer}</span>
            </div>
          )}
          <p className="text-primary/75">{row.explanation}</p>
        </div>
      )}
    </li>
  );
}

/* ---------------- score card ---------------- */
function ScoreCard({ result }: { result: RoundResult }) {
  const quiz = result.round === "quiz";
  const placed = quiz ? result.attempts > 0 : result.myLines.length > 0;
  return (
    <section className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
      <h2 className="text-lg font-extrabold">Your score</h2>
      <dl className="mt-4 flex flex-col gap-2 text-[15px]">
        <ScoreLine label="Base" value={`+${result.base}`} />
        <ScoreLine label="Speed bonus" value={`+${result.speedBonus}`} />
        {result.comboBonus !== undefined && (
          <ScoreLine label="Class combo bonus" value={`+${result.comboBonus}`} />
        )}
        {result.round !== "quiz" && (
          <ScoreLine
            label={`Penalties${result.wrongDrops ? ` (${result.wrongDrops} wrong ${result.wrongDrops === 1 ? "drop" : "drops"})` : ""}`}
            value={result.penalties ? `−${result.penalties}` : "0"}
            danger={result.penalties > 0}
          />
        )}
      </dl>
      <div className="mt-4 flex items-end justify-between border-t border-primary/10 pt-4">
        <span className="text-sm font-bold uppercase tracking-wider text-primary/60">Total</span>
        <span className="font-mono text-5xl font-extrabold tabular-nums">{result.total}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat
          label={quiz ? "Total answer time" : "Time taken"}
          value={
            placed && result.timeTakenMs !== null ? formatTime(result.timeTakenMs / 1000) : "—"
          }
        />
        <Stat
          label={quiz ? "Answered" : "Attempts"}
          value={
            quiz ? `${result.attempts} / ${result.quiz?.length ?? 0}` : String(result.attempts)
          }
        />
      </div>
      {!placed && (
        <p className="mt-3 text-sm text-primary/60">
          {quiz
            ? "You didn't answer any questions this round."
            : "You didn't place a line this round."}
        </p>
      )}
    </section>
  );
}

function ScoreLine({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-primary/70">{label}</dt>
      <dd className={`font-mono font-bold tabular-nums ${danger ? "text-danger" : "text-success"}`}>
        {value}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-chip bg-bg px-3 py-2">
      <div className="text-xs font-semibold text-primary/60">{label}</div>
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

/* ---------------- leaderboard ---------------- */
function Leaderboard({ board, myRank }: { board: Entry[]; myRank: number }) {
  const top = board.slice(0, 10);
  const pinned = myRank > 10 ? board[myRank - 1] : null;
  return (
    <section className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold">Game performance</h2>
        <span className="text-sm text-primary/60">
          You're #{myRank} of {board.length}
        </span>
      </div>
      <ol className="flex flex-col gap-1">
        {top.map((e, i) => (
          <LeaderRow key={e.id} entry={e} rank={i + 1} />
        ))}
        {pinned && (
          <>
            <li className="py-1 text-center text-muted" aria-hidden>
              ⋯
            </li>
            <LeaderRow entry={pinned} rank={myRank} />
          </>
        )}
      </ol>
    </section>
  );
}

function LeaderRow({ entry, rank }: { entry: Entry; rank: number }) {
  const medal =
    rank === 1
      ? "bg-[#F5C542]"
      : rank === 2
        ? "bg-[#C9D1DC]"
        : rank === 3
          ? "bg-[#E2A06B]"
          : "bg-primary/8";
  return (
    <li
      className={`flex items-center gap-3 rounded-chip px-3 py-1.5 ${
        entry.me ? "bg-accent/10 ring-2 ring-accent" : ""
      }`}
      aria-current={entry.me || undefined}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${medal}`}
      >
        {rank}
      </span>
      <Avatar name={entry.name} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {entry.name}
        {entry.me && <span className="ml-1 text-primary/50">(you)</span>}
      </span>
      {entry.team && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary/70">
          Team
        </span>
      )}
      <span className="w-12 text-right font-mono text-sm font-bold tabular-nums">
        {entry.score}
      </span>
    </li>
  );
}
