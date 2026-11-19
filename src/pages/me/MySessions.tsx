import { useState, type ReactNode } from "react";
import { Icon } from "../../components";
import { fmtDay, REVIEW_DAYS, reviewSessions, reviewWindow, windowLabel, type ReviewSession } from "../../mock/review";
import { usePracticeCount } from "../../mock/practice";
import { useStore } from "../../mock/store";
import { Link } from "../../router";

type Filter = "all" | "individual" | "team";

/** /me and /me/sessions — sessions the student attended, newest first. */
export default function MySessions() {
  const [filter, setFilter] = useState<Filter>("all");
  const all = reviewSessions();
  const shown = all.filter((s) => filter === "all" || s.mode === filter);
  const count = (f: Filter) => all.filter((s) => f === "all" || s.mode === f).length;

  return (
    <section aria-labelledby="my-sessions-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="my-sessions-h" className="text-xl font-extrabold">
            My Sessions
          </h2>
          <p className="text-sm text-primary/60">
            Open a session to see the full board, your attempts and the explanations. Each review stays open for{" "}
            {REVIEW_DAYS} days.
          </p>
        </div>
        <div role="group" aria-label="Filter sessions" className="inline-flex rounded-chip bg-surface p-1 shadow-soft">
          {(
            [
              ["all", "All"],
              ["individual", "Individual"],
              ["team", "Team"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-9 cursor-pointer rounded-[8px] px-3.5 text-sm font-semibold transition-colors ${
                filter === f ? "bg-primary text-white" : "text-primary/60 hover:text-primary"
              }`}
            >
              {label} <span className={filter === f ? "text-white/60" : "text-primary/35"}>{count(f)}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <ul className="flex flex-col gap-3">
          {shown.map((s) => (
            <SessionCard key={s.id} s={s} />
          ))}
        </ul>
      ) : (
        <div className="rounded-card border-2 border-dashed border-primary/15 bg-surface/60 px-6 py-12 text-center text-sm text-primary/60">
          No {filter} sessions yet.{" "}
          <button onClick={() => setFilter("all")} className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline">
            Show all
          </button>
        </div>
      )}
    </section>
  );
}

function SessionCard({ s }: { s: ReviewSession }) {
  const w = reviewWindow(s);
  const d = new Date(s.date);

  const body = (
    <>
      {/* date */}
      <div
        className={`flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-chip py-2 sm:w-16 sm:self-center ${
          w.expired ? "bg-primary/5 text-primary/45" : "bg-primary/6"
        }`}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">
          {d.toLocaleDateString("en-GB", { month: "short" })}
        </span>
        <span className="text-2xl font-extrabold leading-none tabular-nums">{d.getDate()}</span>
      </div>

      {/* what */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-extrabold leading-tight sm:truncate sm:text-lg">{s.title}</h3>
          <ModeBadge s={s} muted={w.expired} />
        </div>
        <p className="mt-0.5 text-sm text-primary/60">
          {fmtDay(s.date)} · {s.topic} · {s.className}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <ExpiryBadge s={s} />
          {!w.expired && <Practised sessionId={s.id} />}
        </div>
      </div>

      {/* result */}
      {/* phones: its own row under the details; sm+: right-hand column */}
      <div className="flex w-full shrink-0 items-center justify-end gap-6 border-t border-primary/8 pt-3 sm:w-auto sm:border-0 sm:pt-0">
        <Stat label={s.mode === "team" ? "Team score" : "Score"} value={s.score.toLocaleString("en-GB")} />
        <Stat
          label={s.mode === "team" ? "Team rank" : "Rank"}
          value={
            <>
              {s.rank}
              <span className="text-base font-bold text-primary/40"> / {s.of}</span>
            </>
          }
        />
        <span aria-hidden className={`w-5 text-xl ${w.expired ? "text-primary/30" : "text-primary/35 group-hover:text-primary"}`}>
          {w.expired ? <Icon name="lock" size={20} /> : "→"}
        </span>
      </div>
    </>
  );

  const base = "group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card p-4 sm:flex-nowrap sm:gap-5 sm:p-5";
  return (
    <li data-review-card data-expired={w.expired || undefined}>
      {w.expired ? (
        // content is locked; numbers still count in Progress and Rank
        <div className={`${base} border-2 border-dashed border-primary/12 bg-surface/50 text-primary/55`} aria-disabled="true">
          {body}
        </div>
      ) : (
        <Link
          to={`/me/sessions/${s.id}`}
          aria-label={`Review ${s.title}, ${windowLabel(w)}`}
          className={`${base} bg-surface shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          {body}
        </Link>
      )}
    </li>
  );
}

function ModeBadge({ s, muted }: { s: ReviewSession; muted?: boolean }) {
  const team = s.mode === "team";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        muted ? "bg-primary/6 text-primary/50" : team ? "bg-accent/15 text-[#B5600F]" : "bg-primary/8 text-primary"
      }`}
    >
      {team && <Icon name="users" size={13} />}
      {team ? `Team · ${s.team?.name}` : "Individual"}
    </span>
  );
}

/** Calm when there's time, orange in the last few days, locked once expired. */
export function ExpiryBadge({ s }: { s: Pick<ReviewSession, "date"> }) {
  const w = reviewWindow(s);
  if (w.expired) {
    return (
      <span className="inline-flex items-start gap-1.5 text-xs font-semibold text-primary/55">
        <Icon name="lock" size={13} />
        Review expired (was open until {fmtDay(w.until)}) · score and rank still count in Progress
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        w.urgent ? "bg-accent/15 text-[#B5600F]" : "bg-success/10 text-[#1E7B4F]"
      }`}
    >
      {w.urgent ? <span aria-hidden>▲</span> : <Icon name="clock" size={13} />}
      {windowLabel(w)}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="text-right sm:w-24">
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

/** Practice is never scored — this count is the only place it shows. */
function Practised({ sessionId }: { sessionId: string }) {
  const studentId = useStore((x) => x.student?.studentId);
  const n = usePracticeCount(studentId, sessionId);
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/6 px-2.5 py-1 text-xs font-semibold text-primary/65" data-practised>
      Practised {n} time{n === 1 ? "" : "s"}
    </span>
  );
}
