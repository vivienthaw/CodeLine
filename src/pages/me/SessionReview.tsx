import { useId, useState, type ReactNode } from "react";
import { Button, Icon, initials } from "../../components";
import {
  fmtDay,
  getReviewSession,
  REVIEW_DAYS,
  reviewWindow,
  roundScore,
  type Attempt,
  type CodeLineReview,
  type QuizItem,
  type QuizReview,
  type ReviewRound,
  type ReviewSession,
} from "../../mock/review";
import { canPractice } from "../../mock/practice";
import { useStore } from "../../mock/store";
import { Link, navigate } from "../../router";
import { ExpiryBadge } from "./MySessions";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** /me/sessions/:id — read-only review of one session. */
export default function SessionReview({ id }: { id: string }) {
  const s = getReviewSession(id);
  const w = s ? reviewWindow(s) : null;

  return (
    <>
      <Link to="/me/sessions" className="mb-4 inline-block text-sm font-semibold text-primary/60 hover:text-primary">
        ← My Sessions
      </Link>
      {!s ? (
        <Locked title="Session not found" body="It isn't one of the sessions you attended." />
      ) : s.attendance !== "joined" ? (
        <Locked
          title="You weren't in this session"
          body="Reviews and practice are only for sessions you joined. Absent sessions don't count in Progress or Rank either."
        />
      ) : w!.expired || !s.rounds.length ? (
        <Locked
          title="This review has expired"
          body={`Reviews stay open for ${REVIEW_DAYS} days — this one was open until ${fmtDay(w!.until)}. Your score (${s.score}) and rank (${s.rank} / ${s.of}) still count in Progress and Rank.`}
        />
      ) : (
        <Review s={s} />
      )}
    </>
  );
}

function Locked({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 px-6 py-16 text-center" role="alert">
      <span className="grid size-14 place-items-center rounded-full bg-primary/8 text-primary/60">
        <Icon name="lock" size={26} />
      </span>
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="max-w-md text-sm text-primary/60">{body}</p>
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={() => navigate("/me/progress")}>
          See Progress
        </Button>
        <Button variant="ghost" onClick={() => navigate("/me/sessions")}>
          My Sessions
        </Button>
      </div>
    </div>
  );
}

function Review({ s }: { s: ReviewSession }) {
  const [tab, setTab] = useState(0);
  const me = useStore((x) => x.student?.name);
  const team = s.mode === "team";
  const ids = useId();

  return (
    <div className="flex flex-col gap-5">
      {/* header */}
      <header className="rounded-card bg-surface p-4 shadow-soft sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight sm:text-[26px]">{s.title}</h1>
            <p className="mt-1 text-sm text-primary/60">
              {fmtDay(s.date)} · {s.topic} · {s.className}
            </p>
            <div className="mt-3">
              <ExpiryBadge s={s} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6 sm:text-right">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary/50">{team ? "Team result" : "Your score"}</div>
              <div className="text-[26px] font-extrabold leading-none tabular-nums sm:text-[32px]">{s.score.toLocaleString("en-GB")}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-primary/50">{team ? "Team rank" : "Rank"}</div>
              <div className="text-[26px] font-extrabold leading-none tabular-nums sm:text-[32px]">
                {s.rank}
                <span className="text-lg font-bold text-primary/40"> / {s.of}</span>
              </div>
            </div>
          </div>
        </div>

        {team && s.team && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/10 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-bold text-[#B5600F]">
              <Icon name="users" size={15} /> Team {s.team.name}
            </span>
            <ul className="flex flex-wrap gap-2" aria-label="Team members">
              {s.team.members.map((m) => (
                <li key={m} className="inline-flex items-center gap-1.5 rounded-full bg-bg py-1 pl-1 pr-3 text-sm font-semibold">
                  <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{initials(m)}</span>
                  {m}
                  {m === me && <span className="text-primary/45">(you)</span>}
                </li>
              ))}
            </ul>
            <span className="text-xs text-primary/50">Everyone in the team sees this same review.</span>
          </div>
        )}
      </header>

      <p className="flex items-center gap-2 text-xs text-primary/55">
        <Icon name="eye" size={14} /> Review only — nothing on this page changes your score or rank.
      </p>

      {/* rounds */}
      <div role="tablist" aria-label="Rounds" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {s.rounds.map((r, i) => {
          const active = tab === i;
          return (
            <button
              key={i}
              role="tab"
              id={`${ids}-tab-${i}`}
              aria-selected={active}
              aria-controls={`${ids}-panel-${i}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const next = (i + (e.key === "ArrowRight" ? 1 : -1) + s.rounds.length) % s.rounds.length;
                setTab(next);
                document.getElementById(`${ids}-tab-${next}`)?.focus();
              }}
              className={`flex shrink-0 cursor-pointer flex-col items-start gap-0.5 rounded-card px-3 py-2 text-left transition-colors sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-3 ${
                active ? "bg-primary text-white shadow-lift" : "bg-surface text-primary shadow-soft hover:bg-primary/5"
              }`}
            >
              <span className={`text-sm font-bold ${active ? "text-white/60" : "text-primary/45"}`}>Round {i + 1}</span>
              <span className={`font-extrabold ${r.participated ? "" : "opacity-60"}`}>{r.kind === "codeline" ? "CodeLine" : "Quiz"}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${active ? "bg-white/15" : "bg-primary/8"}`}>
                {r.participated ? `${roundScore(r)} pts` : "not taken"}
              </span>
            </button>
          );
        })}
      </div>

      {s.rounds.map((r, i) => (
        <div key={i} role="tabpanel" id={`${ids}-panel-${i}`} aria-labelledby={`${ids}-tab-${i}`} hidden={tab !== i}>
          <RoundPanel r={r} s={s} />
        </div>
      ))}
    </div>
  );
}

function RoundPanel({ r, s }: { r: ReviewRound; s: ReviewSession }) {
  if (!r.participated)
    return (
      <div className="rounded-card border-2 border-dashed border-primary/15 bg-surface/60 px-6 py-12 text-center" data-not-taken>
        <Icon name="lock" size={22} className="mx-auto mb-2 text-primary/40" />
        <div className="font-bold">You didn't take part in this round</div>
        <p className="mt-1 text-sm text-primary/60">There's nothing to review or practise here — you can only practise rounds you played.</p>
      </div>
    );
  return r.kind === "codeline" ? <CodeLinePanel r={r} s={s} /> : <QuizPanel r={r} s={s} />;
}

/* ---------------- CodeLine ---------------- */

function CodeLinePanel({ r, s }: { r: CodeLineReview; s: ReviewSession }) {
  const team = s.mode === "team";
  const studentId = useStore((x) => x.student?.studentId);
  const practise = canPractice(studentId, s.id, r.id).ok;
  const [open, setOpen] = useState<Set<number>>(() => new Set([r.yourLine]));
  const allOpen = open.size === r.lines.length;
  const toggle = (n: number) =>
    setOpen((o) => {
      const next = new Set(o);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
      <section className="overflow-hidden rounded-card bg-surface shadow-soft" aria-label="Completed board">
        <div className="flex flex-col items-start gap-3 border-b border-primary/10 px-4 py-4 sm:flex-row sm:gap-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold">{r.title}</h2>
            <p className="mt-0.5 text-sm text-primary/65">{r.statement}</p>
            {r.squad && (
              <p className="mt-1.5 text-xs text-primary/55" data-squad>
                <Icon name="users" size={12} className="mr-1 inline" />
                {r.squad.name} board — the class played {r.squad.count} problems in squads; you see and practise your squad's.
              </p>
            )}
          </div>
          {practise && (
            <Button variant="secondary" className="shrink-0" onClick={() => navigate(`/me/sessions/${s.id}/practice/${r.id}`)}>
              Practice this problem
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between bg-bg/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary/50 sm:px-5">
          <span className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] gap-3 sm:grid-cols-[32px_minmax(0,1fr)_minmax(0,1.2fr)_28px]">
            <span>#</span>
            <span>
              Pseudocode<span className="sm:hidden"> · Java</span>
            </span>
            <span className="hidden sm:block">Correct Java</span>
            <button
              onClick={() => setOpen(allOpen ? new Set() : new Set(r.lines.map((l) => l.n)))}
              className="col-start-3 cursor-pointer justify-self-end sm:col-start-4 whitespace-nowrap normal-case tracking-normal text-primary/60 hover:text-primary"
              title={allOpen ? "Collapse all explanations" : "Expand all explanations"}
            >
              {allOpen ? "Collapse" : "Expand"} all
            </button>
          </span>
        </div>

        <ol>
          {r.lines.map((l) => {
            const mine = l.n === r.yourLine;
            const isOpen = open.has(l.n);
            return (
              <li
                key={l.n}
                data-board-line={l.n}
                data-mine={mine || undefined}
                className={`border-t border-primary/8 ${mine ? "bg-accent/8 shadow-[inset_4px_0_0_var(--color-accent)]" : ""}`}
              >
                <button
                  onClick={() => toggle(l.n)}
                  aria-expanded={isOpen}
                  aria-label={`Step ${l.n}: ${l.pseudo}${mine ? ` (${team ? "your team's" : "your"} line)` : ""}. ${isOpen ? "Hide" : "Show"} explanation`}
                  className="grid w-full cursor-pointer grid-cols-[24px_minmax(0,1fr)_20px] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left hover:bg-primary/3 sm:grid-cols-[32px_minmax(0,1fr)_minmax(0,1.2fr)_28px] sm:px-5"
                >
                  <span className="font-mono text-sm font-bold text-muted">{l.n}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px]">
                    <span className="min-w-0 break-words" style={{ paddingLeft: `${l.indent * 2}ch` }}>
                      {l.pseudo}
                    </span>
                    {mine && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-sans text-[11px] font-bold text-white">
                        {team ? "Your team's line" : "Your line"}
                      </span>
                    )}
                  </span>
                  <code className="col-start-2 row-start-2 min-w-0 justify-self-start break-words rounded-[6px] bg-success/10 px-2 py-1 font-mono text-[12.5px] sm:col-start-auto sm:row-start-auto sm:justify-self-stretch">{l.java}</code>
                  <Icon name="chevron" size={16} className={`col-start-3 row-start-1 justify-self-end text-primary/40 transition-transform sm:col-start-auto sm:row-start-auto ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <p className="px-4 pb-3 pl-[52px] text-sm text-primary/75 sm:px-5 sm:pl-[64px]">
                    <span className="font-semibold text-primary">Why: </span>
                    {l.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <Timeline r={r} team={team} />
    </div>
  );
}

function Timeline({ r, team }: { r: CodeLineReview; team: boolean }) {
  const total = roundScore(r);
  const placed = r.attempts.find((a) => a.ok);
  return (
    <aside className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="attempts-h">
      <h2 id="attempts-h" className="font-extrabold">
        {team ? "Your team's attempts" : "Your attempts"}
      </h2>
      <p className="mt-0.5 text-xs text-primary/55">
        Line {r.yourLine} · <span className="font-mono">{r.lines.find((l) => l.n === r.yourLine)?.java}</span>
      </p>

      {/* one-line summary, e.g. step 3 ✕ (−10) → step 6 ✕ (−10) → step 4 ✓ (+100 +35) */}
      <p className="mt-3 rounded-chip bg-bg px-3 py-2 font-mono text-[12px] leading-relaxed text-primary/80" data-attempt-summary>
        {r.attempts
          .map((a) => `step ${a.step} ${a.ok ? "✓" : "✕"} (${signed(a.points)}${a.speed ? ` +${a.speed}` : ""})`)
          .join(" → ")}
      </p>

      <ol className="relative mt-4 flex flex-col gap-4 pl-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-0.5 before:bg-primary/10">
        {r.attempts.map((a, i) => (
          <AttemptRow key={i} a={a} team={team} />
        ))}
      </ol>

      <div className="mt-5 flex items-baseline justify-between border-t border-primary/10 pt-3">
        <span className="text-sm text-primary/60">
          {placed ? `Placed at ${mmss(placed.at)} of ${mmss(r.timerSec)}` : "Not placed before time ran out"}
        </span>
        <span className="text-lg font-extrabold tabular-nums">{total} pts</span>
      </div>
    </aside>
  );
}

function AttemptRow({ a, team }: { a: Attempt; team: boolean }) {
  return (
    <li className="relative" data-attempt>
      <span
        aria-hidden
        className={`absolute -left-6 top-0.5 grid size-5 place-items-center rounded-full text-[11px] font-bold text-white ring-4 ring-surface ${
          a.ok ? "bg-success" : "bg-danger"
        }`}
      >
        {a.ok ? "✓" : "✕"}
      </span>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">
          Dropped on step {a.step} <span className="sr-only">{a.ok ? "correct" : "wrong"}</span>
        </span>
        <span className={`shrink-0 text-sm font-bold tabular-nums ${a.ok ? "text-[#1E7B4F]" : "text-danger"}`}>
          {signed(a.points)}
          {a.speed ? <span className="text-primary/55"> +{a.speed} speed</span> : null}
        </span>
      </div>
      <div className="text-xs text-primary/50">
        <span className="font-mono">{mmss(a.at)}</span>
        {team && a.by && <> · by {a.by}</>} · {a.ok ? "Correct slot" : "Wrong slot"}
      </div>
    </li>
  );
}

/* ---------------- Quiz ---------------- */

const KIND = { mc: "Multiple choice", tf: "True / False", match: "Match", fill: "Fill the blank" } as const;

function QuizPanel({ r, s }: { r: QuizReview; s: ReviewSession }) {
  const team = s.mode === "team";
  const studentId = useStore((x) => x.student?.studentId);
  const practise = canPractice(studentId, s.id, r.id).ok;
  const right = r.items.filter((q) => q.isCorrect).length;
  return (
    <section aria-label={r.title} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-extrabold">{r.title}</h2>
        <span className="flex items-center gap-4 text-sm text-primary/60">
          <span>
            {right} of {r.items.length} correct · <span className="font-bold text-primary">{roundScore(r)} pts</span>
          </span>
          {practise && (
            <Button variant="secondary" onClick={() => navigate(`/me/sessions/${s.id}/practice/${r.id}`)}>
              Practice this quiz
            </Button>
          )}
        </span>
      </div>
      {r.items.map((q) => (
        <QuestionCard key={q.n} q={q} team={team} />
      ))}
    </section>
  );
}

function QuestionCard({ q, team }: { q: QuizItem; team: boolean }) {
  const who = team ? "Team's answer" : "Your answer";
  return (
    <article className="rounded-card bg-surface p-4 shadow-soft sm:p-5" data-quiz-item={q.n}>
      <div className="flex items-start gap-3">
        <span className="font-mono text-sm font-bold text-muted">Q{q.n}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{q.prompt}</h3>
            <span className="rounded-full bg-primary/6 px-2 py-0.5 text-[11px] font-semibold text-primary/55">{KIND[q.kind]}</span>
          </div>
          {q.code && (
            <pre className="mt-2 overflow-x-auto rounded-chip bg-[#0F1E33] px-4 py-3 font-mono text-[13px] leading-relaxed text-white/90">
              {q.code}
            </pre>
          )}
        </div>
        <Verdict ok={q.isCorrect} points={q.points} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:pl-8">
        <AnswerBox label={who} tone={q.isCorrect ? "ok" : "bad"} by={team ? q.by : undefined}>
          {q.yours}
        </AnswerBox>
        <AnswerBox label="Correct answer" tone="ok">
          {q.correct}
        </AnswerBox>
      </div>

      <p className="mt-3 text-sm text-primary/75 sm:pl-8">
        <span className="font-semibold text-primary">Why: </span>
        {q.explanation}
      </p>
    </article>
  );
}

function Verdict({ ok, points }: { ok: boolean; points: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        ok ? "bg-success/12 text-[#1E7B4F]" : "bg-danger/10 text-danger"
      }`}
    >
      <span aria-hidden>{ok ? "✓" : "✕"}</span>
      {ok ? `Correct · +${points}` : "Wrong · 0"}
    </span>
  );
}

function AnswerBox({ label, tone, by, children }: { label: string; tone: "ok" | "bad"; by?: string; children: ReactNode }) {
  return (
    <div className={`rounded-chip border-2 px-3 py-2 ${tone === "ok" ? "border-success/40 bg-success/5" : "border-danger/35 bg-danger/5"}`}>
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-primary/50">
        <span>
          <span aria-hidden className={tone === "ok" ? "text-success" : "text-danger"}>
            {tone === "ok" ? "✓ " : "✕ "}
          </span>
          {label}
        </span>
        {by && <span className="normal-case tracking-normal text-primary/45">by {by}</span>}
      </div>
      <div className="mt-1 whitespace-pre-line font-mono text-[13px]">{children}</div>
    </div>
  );
}

