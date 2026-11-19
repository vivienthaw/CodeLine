import { Professor } from "../../components";
import { Link } from "../../router";
import { StaffLayout } from "../StaffLayout";
import { Meter } from "./ReportUI";
import { getSession, getStudent, getStudents, KIND_LABEL, type RoundInfo, type Session } from "./data";
import { Heatmap } from "./charts";
import { longDay, mmss, pct, sessionInFilters, sessionRanking, summarizeSession, useFilters, type Filters } from "./metrics";
import { Card, ReportFrame } from "./ReportFrame";

export default function SessionReport({ id }: { id: string }) {
  const s = getSession(id);
  if (!s)
    return (
      <StaffLayout>
        <div className="flex flex-col items-center gap-3 px-10 py-24 text-center">
          <Professor className="h-28" mood="heal" />
          <h1 className="text-2xl font-extrabold">Session not found</h1>
          <Link to="/staff/reports" className="font-semibold text-accent underline underline-offset-2">
            Back to the class overview
          </Link>
        </div>
      </StaffLayout>
    );
  return <Report s={s} />;
}

function Report({ s }: { s: Session }) {
  const f = useFilters();
  const sum = summarizeSession(s, f);
  const inFilters = sessionInFilters(s, f);
  const rounds = s.rounds.filter((r) => f.mode === "all" || r.kind === f.mode);

  return (
    <ReportFrame
      title={s.title}
      back={
        <Link to="/staff/reports" className="text-sm font-semibold text-primary/60 hover:text-primary">
          ← Class overview
        </Link>
      }
      subtitle={
        <span data-session-header>
          {longDay(s.date)} · class code <span className="font-mono">{s.code}</span> · {s.kinds.map((k) => KIND_LABEL[k]).join(" + ")} ·{" "}
          {s.play === "team" ? "Team" : "Individual"} · {s.squads} {s.squads === 1 ? "board" : "squads / boards"}
        </span>
      }
    >
      {!inFilters && (
        <p className="rounded-chip border-2 border-accent/40 bg-accent/8 px-4 py-2 text-sm" role="status">
          This session is outside the current filters — it's shown in full anyway{f.mode !== "all" && ", with only the rounds matching the Mode filter"}.
        </p>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card label="Participation" value={`${sum.joined + sum.autofilled} / ${getStudents().length}`} sub={`${sum.autofilled} auto-filled · ${sum.absent} absent`} />
        <Card label="Average score" value={Math.round(sum.avg)} sub={`range ${sum.min}–${sum.max}`} />
        <Card label="Topic" value={s.topic} sub={`Session ${s.n} of 10`} />
        <Card label="Rounds" value={s.rounds.length} sub={s.play === "team" ? "teams of 4 — shared results" : "individual results"} />
      </div>

      {rounds.length ? (
        rounds.map((r) => <RoundSection key={r.n} s={s} r={r} />)
      ) : (
        <p className="rounded-card border-2 border-dashed border-primary/15 px-6 py-10 text-center text-sm text-primary/55">
          This session has no {f.mode === "all" ? "" : KIND_LABEL[f.mode as keyof typeof KIND_LABEL]} rounds.
        </p>
      )}

      <Ranking s={s} f={f} />
    </ReportFrame>
  );
}

function roundStats(s: Session, r: RoundInfo) {
  const k = r.n - 1;
  const present = s.results.filter((x) => x.attendance !== "absent" && x.rounds[k]);
  // team rounds: members share one result — count each team once
  const seen = new Set<string>();
  const res = present.filter((x) => !x.team || (!seen.has(x.team) && seen.add(x.team))).map((x) => x.rounds[k]!);
  return {
    present: present.length,
    units: res.length,
    avg: res.length ? res.reduce((a, x) => a + x.score, 0) / res.length : 0,
    wrong: res.reduce((a, x) => a + x.wrong, 0),
    firstTry: res.length ? res.reduce((a, x) => a + x.correct, 0) / Math.max(1, res.reduce((a, x) => a + x.attempted, 0)) : 0,
  };
}

function RoundSection({ s, r }: { s: Session; r: RoundInfo }) {
  const st = roundStats(s, r);
  return (
    <section className="overflow-hidden rounded-card bg-surface shadow-soft" aria-labelledby={`round-${r.n}`} data-round={r.kind}>
      <header className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-primary/10 px-5 py-4">
        <h2 id={`round-${r.n}`} className="mr-auto font-extrabold">
          Round {r.n} · {KIND_LABEL[r.kind]}
          {r.title && <span className="font-semibold text-primary/55"> — {r.title}</span>}
        </h2>
        {(
          [
            ["Participation", `${st.present} / ${getStudents().length}${s.play === "team" ? ` · ${st.units} teams` : ""}`],
            ["Avg score", String(Math.round(st.avg))],
            ["Wrong attempts", String(st.wrong)],
            ["Completion time", `${mmss(r.completionSec ?? null)} of ${mmss(r.timerSec)}`],
          ] as const
        ).map(([l, v]) => (
          <div key={l} className="text-right" data-round-stat={l}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary/50">{l}</div>
            <div className="font-extrabold tabular-nums">{v}</div>
          </div>
        ))}
      </header>
      <div className="p-5">{r.kind === "codeline" ? <CodeLineDetail r={r} boards={s.squads} /> : <QuizDetail r={r} />}</div>
    </section>
  );
}

function CodeLineDetail({ r, boards }: { r: RoundInfo; boards: number }) {
  const lines = r.lines!;
  const cells = r.confusion!;
  const top = cells
    .flatMap((row, i) => row.map((v, j) => ({ i, j, v })))
    .filter((c) => c.i !== c.j && c.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-6">
      <div>
        <h3 className="mb-1 font-bold">Which steps students confused</h3>
        <p className="mb-3 text-xs text-primary/55">
          Each cell counts wrong drops: a snippet that belongs to the column's step, dropped on the row's step.
          {boards > 1 && ` All ${boards} squad boards played this problem and are combined.`}
        </p>
        <Heatmap
          rows={lines.map((l) => `${"  ".repeat(l.indent)}${l.pseudo}`)}
          cols={lines.map((l) => l.java)}
          cells={cells}
          rowTitle="Dropped on step"
          colTitle="snippet's step"
        />
      </div>
      <aside className="rounded-chip bg-bg/70 p-4" aria-label="Most confused">
        <h3 className="text-sm font-bold">Most confused</h3>
        {top.length ? (
          <ol className="mt-2 flex flex-col gap-3 text-sm" data-most-confused>
            {top.map((c) => (
              <li key={`${c.i}-${c.j}`}>
                <div className="font-bold tabular-nums">
                  {c.v} wrong drop{c.v === 1 ? "" : "s"}
                </div>
                <div className="text-primary/70">
                  Step {c.j + 1}'s <code className="font-mono text-[12px]">{lines[c.j]!.java}</code> put on step {c.i + 1} “{lines[c.i]!.pseudo}”
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-primary/55">No wrong drops.</p>
        )}
      </aside>
    </div>
  );
}

function QuizDetail({ r }: { r: RoundInfo }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs font-bold uppercase tracking-wider text-primary/50">
        <tr>
          <th className="w-12 py-2">#</th>
          <th className="py-2">Question</th>
          <th className="w-56 py-2">Correct</th>
          <th className="w-[30%] py-2">Most-chosen wrong option</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-primary/8">
        {r.questions!.map((q) => (
          <tr key={q.n} data-question={q.n}>
            <td className="py-2.5 font-mono font-bold text-muted">Q{q.n}</td>
            <td className="py-2.5 pr-4">
              {q.prompt}
              <div className="text-xs text-primary/50">
                Answer: <span className="font-mono">{q.correct}</span>
              </div>
            </td>
            <td className="py-2.5">
              <Meter value={q.pctCorrect} hard={q.pctCorrect < 0.6} label={`Q${q.n} correct`} width="w-24" />
            </td>
            <td className="py-2.5">
              {q.topWrong ? (
                <>
                  <span className="font-mono text-[13px]">{q.topWrong.label}</span>
                  <span className="text-primary/50"> · {pct(q.topWrong.share)} of wrong answers</span>
                </>
              ) : (
                <span className="text-primary/40">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Ranking({ s, f }: { s: Session; f: Filters }) {
  const { rows, rankOf } = sessionRanking(s, f);
  const absent = s.results.filter((r) => r.attendance === "absent");
  return (
    <section className="overflow-hidden rounded-card bg-surface shadow-soft" aria-labelledby="ranking-h">
      <header className="flex items-baseline justify-between border-b border-primary/10 px-5 py-4">
        <h2 id="ranking-h" className="font-bold">
          Ranking <span className="font-semibold text-primary/45">· {rows.length} ranked, {absent.length} absent</span>
        </h2>
        {s.play === "team" && <span className="text-xs text-primary/55">Team session: members share their team's result — not individual skill</span>}
      </header>
      <table className="w-full text-left text-sm">
        <thead className="bg-bg/60 text-xs font-bold uppercase tracking-wider text-primary/50">
          <tr>
            <th className="w-20 px-5 py-2.5">Rank</th>
            <th className="px-3 py-2.5">Student</th>
            {s.play === "team" && <th className="px-3 py-2.5">Team</th>}
            <th className="px-3 py-2.5 text-right">Score</th>
            <th className="px-3 py-2.5 text-right">Accuracy</th>
            <th className="px-3 py-2.5 text-right">Wrong</th>
            <th className="px-5 py-2.5">Attendance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-primary/8">
          {[...rows.map((x) => ({ r: x.r, score: x.score as number | null })), ...absent.map((r) => ({ r, score: null }))].map(({ r, score }) => {
            const st = getStudent(r.studentId)!;
            const counted = r.rounds.filter((x) => f.mode === "all" || x.kind === f.mode);
            const att = counted.reduce((a, x) => a + x.attempted, 0);
            return (
              <tr key={r.studentId} data-rank-row={rankOf.get(r.studentId) ?? "absent"} className={score === null ? "text-primary/45" : ""}>
                <td className="px-5 py-2 font-bold tabular-nums">{rankOf.get(r.studentId) ?? "—"}</td>
                <td className="px-3 py-2">
                  <Link to={`/staff/reports/students/${st.id}`} className="font-semibold hover:underline">
                    {st.name}
                  </Link>
                </td>
                {s.play === "team" && <td className="px-3 py-2">{r.team}</td>}
                <td className="px-3 py-2 text-right font-bold tabular-nums">{score ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{score === null || !att ? "—" : pct(counted.reduce((a, x) => a + x.correct, 0) / att)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{score === null ? "—" : counted.reduce((a, x) => a + x.wrong, 0)}</td>
                <td className="px-5 py-2 text-xs">{r.attendance === "joined" ? "Joined" : r.attendance === "autofilled" ? "Auto-filled" : "Absent"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
