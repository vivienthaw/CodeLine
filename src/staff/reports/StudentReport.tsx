import { Fragment, useMemo, useState } from "react";
import { Button, Icon, Professor } from "../../components";
import { Link, navigate } from "../../router";
import { StaffLayout } from "../StaffLayout";
import { CLASS, getStudent, getStudents, KIND_LABEL, type Attendance, type Session, type StudentSession } from "./data";
import { ChartCard, EMPTY, LegendItem, SERIES, TopicBars, TwoLines } from "./charts";
import {
  classRank,
  classSummaries,
  filteredSessions,
  mmss,
  pct,
  resultFor,
  sessionScore,
  shortDay,
  summarizeSession,
  summarizeStudent,
  topicAccuracy,
  useFilters,
  type Filters,
} from "./metrics";
import { Card, ReportFrame } from "./ReportFrame";
import { DownloadIcon } from "./ClassOverview";


export default function StudentReport({ id }: { id: string }) {
  const st = getStudent(id);
  if (!st)
    return (
      <StaffLayout>
        <div className="flex flex-col items-center gap-3 px-10 py-24 text-center">
          <Professor className="h-28" mood="heal" />
          <h1 className="text-2xl font-extrabold">Student not found</h1>
          <Link to="/staff/reports" className="font-semibold text-accent underline underline-offset-2">
            Back to the class overview
          </Link>
        </div>
      </StaffLayout>
    );
  return <Report key={id} id={id} />;
}

function Report({ id }: { id: string }) {
  const st = getStudent(id)!;
  const f = useFilters();
  const sessions = filteredSessions(f);
  const me = summarizeStudent(st, sessions, f);
  const all = useMemo(() => classSummaries(sessions, f), [sessions, f]);
  const rank = classRank(all, st.id);
  const ORDER = [...getStudents()].sort((a, b) => a.name.localeCompare(b.name));
  const i = ORDER.findIndex((x) => x.id === st.id);
  const prev = ORDER[(i - 1 + ORDER.length) % ORDER.length]!;
  const next = ORDER[(i + 1) % ORDER.length]!;

  const classTopic = topicAccuracy(sessions, f);
  const myTopic = topicAccuracy(sessions, f, st.id);

  return (
    <ReportFrame
      title={st.name}
      back={
        <Link to="/staff/reports" className="text-sm font-semibold text-primary/60 hover:text-primary">
          ← Class overview
        </Link>
      }
      subtitle={
        <span data-student-header>
          <span className="font-mono">{st.id}</span> · {st.email} · {CLASS.name} · attended{" "}
          <b className="text-primary">
            {me.attended} / {me.sessions}
          </b>{" "}
          sessions
        </span>
      }
      actions={
        <>
          <Button variant="ghost" onClick={() => navigate(`/staff/reports/students/${prev.id}`)} title={prev.name}>
            ← Previous student
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/staff/reports/students/${next.id}`)} title={next.name}>
            Next student →
          </Button>
          <Button variant="secondary" icon={<DownloadIcon />} onClick={() => window.print()}>
            Export student report (PDF)
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-5 gap-4" data-summary>
        <Card label="Avg score" value={me.attended ? Math.round(me.avgScore) : "—"} sub="per session attended" />
        <Card label="Accuracy" value={pct(me.accuracy)} sub="right on the first try" />
        <Card label="Wrong attempts" value={me.wrong} sub="wrong drops + wrong answers" />
        <Card label="Avg time per line" value={mmss(me.avgLineSec)} sub="CodeLine rounds" />
        <Card
          label="Class rank"
          value={
            rank.rank ? (
              <>
                #{rank.rank}
                <span className="text-lg font-bold text-primary/40"> / {rank.of}</span>
              </>
            ) : (
              "—"
            )
          }
          sub="Game performance — not overall ability"
        />
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
        <ChartCard
          title="Score per session"
          sub="Gaps are absences"
          legend={
            <>
              <LegendItem color={SERIES.blue} label={st.name} />
              <LegendItem color="#6b7685" label="Class average" dashed />
            </>
          }
          empty={!sessions.length && EMPTY}
        >
          <TwoLines
            aLabel={st.name.split(" ")[0]!}
            bLabel="Class avg"
            points={sessions.map((s) => {
              const r = resultFor(s, st.id);
              return { id: s.id, label: shortDay(s.date), title: s.title, a: r.attendance === "absent" ? null : sessionScore(r, f), b: summarizeSession(s, f).avg };
            })}
          />
        </ChartCard>
        <ChartCard
          title="Accuracy by topic"
          sub="Bar = this student · mark = class average"
          legend={
            <>
              <LegendItem color={SERIES.blue} label={st.name} shape="box" />
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-[3px] rounded-full bg-[#3d4653]" /> Class average
              </span>
            </>
          }
          empty={!sessions.length && EMPTY}
        >
          <TopicBars
            color={SERIES.blue}
            refLabel="class"
            rows={myTopic.map((t, k) => ({ topic: t.topic, value: t.accuracy, ref: classTopic[k]!.accuracy, sessions: t.sessions }))}
          />
        </ChartCard>
      </div>

      <History sessions={sessions} studentId={st.id} f={f} />
    </ReportFrame>
  );
}

const ATT: Record<Attendance, [string, string]> = {
  joined: ["Joined", "bg-success/12 text-[#1E7B4F]"],
  autofilled: ["Auto-filled", "bg-accent/12 text-[#B5600F]"],
  absent: ["Absent", "bg-primary/8 text-primary/60"],
};

function teamRank(s: Session, team: string, f: Filters) {
  const scores = new Map<string, number>();
  for (const r of s.results) if (r.team && r.attendance !== "absent" && !scores.has(r.team)) scores.set(r.team, sessionScore(r, f));
  const sorted = [...scores.values()].sort((a, b) => b - a);
  return { rank: sorted.indexOf(scores.get(team)!) + 1, of: scores.size };
}

function individualRank(s: Session, studentId: string, f: Filters) {
  const present = s.results.filter((r) => r.attendance !== "absent").map((r) => ({ id: r.studentId, sc: sessionScore(r, f) }));
  present.sort((a, b) => b.sc - a.sc);
  const mine = present.find((x) => x.id === studentId);
  return { rank: mine ? present.findIndex((x) => x.sc === mine.sc) + 1 : 0, of: present.length };
}

function History({ sessions, studentId, f }: { sessions: Session[]; studentId: string; f: Filters }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = [...sessions].reverse();
  return (
    <section className="overflow-hidden rounded-card bg-surface shadow-soft" aria-labelledby="history-h">
      <header className="flex items-baseline justify-between border-b border-primary/10 px-5 py-4">
        <h2 id="history-h" className="font-bold">
          Session history
        </h2>
        <span className="text-xs text-primary/55">Click a row for the attempt timeline · practice at home is counted, never scored</span>
      </header>
      {!rows.length ? (
        <p className="px-5 py-10 text-center text-sm text-primary/55">{EMPTY}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-bg/60 text-xs font-bold uppercase tracking-wider text-primary/50">
            <tr>
              <th className="w-8 px-3 py-2.5 pl-5" />
              <th className="px-3 py-2.5">Date</th>
              <th className="px-3 py-2.5">Session</th>
              <th className="px-3 py-2.5">Mode</th>
              <th className="px-3 py-2.5">Played as</th>
              <th className="px-3 py-2.5 text-right">Score</th>
              <th className="px-3 py-2.5 text-right">Accuracy</th>
              <th className="px-3 py-2.5 text-right">Wrong</th>
              <th className="px-3 py-2.5 text-right">Time</th>
              <th className="px-3 py-2.5 text-right">Rank</th>
              <th className="px-3 py-2.5">Attendance</th>
              <th className="px-3 py-2.5 pr-5">Practice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/8">
            {rows.map((s) => {
              const r = resultFor(s, studentId);
              const absent = r.attendance === "absent";
              const counted = r.rounds.filter((x) => f.mode === "all" || x.kind === f.mode);
              const correct = counted.reduce((a, x) => a + x.correct, 0);
              const attempted = counted.reduce((a, x) => a + x.attempted, 0);
              const wrong = counted.reduce((a, x) => a + x.wrong, 0);
              const line = counted.find((x) => x.kind === "codeline");
              const rk = absent ? null : r.team ? teamRank(s, r.team, f) : individualRank(s, studentId, f);
              const isOpen = open === s.id;
              return (
                <Fragment key={s.id}>
                  <tr
                    data-history-row={s.id}
                    onClick={() => !absent && setOpen(isOpen ? null : s.id)}
                    className={`${absent ? "text-primary/50" : "cursor-pointer hover:bg-bg/60"} ${isOpen ? "bg-bg/60" : ""}`}
                  >
                    <td className="px-3 py-2.5 pl-5">
                      {!absent && (
                        <button aria-expanded={isOpen} aria-label={`Attempt timeline for ${s.title}`} className="grid size-6 cursor-pointer place-items-center rounded text-primary/50 hover:text-primary">
                          <Icon name="chevron" size={15} className={isOpen ? "rotate-180" : "-rotate-90"} />
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{shortDay(s.date)}</td>
                    <td className="min-w-48 px-3 py-2.5">
                      <Link to={`/staff/reports/sessions/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-primary hover:underline">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{s.kinds.map((k) => KIND_LABEL[k]).join(" + ")}</td>
                    <td className="px-3 py-2.5">
                      {r.team ? (
                        <span>
                          Team · {r.team}
                          <span className="mt-0.5 block w-max rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-bold text-primary/65" data-team-tag>
                            Team result — not individual skill
                          </span>
                        </span>
                      ) : (
                        "Individual"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{absent ? "—" : sessionScore(r, f)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{absent || !attempted ? "—" : pct(correct / attempted)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{absent ? "—" : wrong}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{line ? mmss(line.lineSec) : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{rk ? `${rk.rank} / ${rk.of}` : "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ATT[r.attendance][1]}`}>{ATT[r.attendance][0]}</span>
                    </td>
                    <td className="px-3 py-2.5 pr-5 text-xs text-primary/65" data-practice={r.practised}>
                      {r.practised ? `Practised ${r.practised} time${r.practised === 1 ? "" : "s"} at home` : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-bg/40">
                      <td />
                      <td colSpan={11} className="px-3 py-3 pr-5">
                        <Timeline r={r} s={s} f={f} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Timeline({ r, s, f }: { r: StudentSession; s: Session; f: Filters }) {
  const counted = r.rounds.map((x, k) => ({ x, info: s.rounds[k]! })).filter(({ x }) => f.mode === "all" || x.kind === f.mode);
  return (
    <div className="flex flex-col gap-2" data-timeline>
      {counted.map(({ x, info }) =>
        x.kind === "codeline" ? (
          <div key={info.n} className="text-sm">
            <span className="mr-2 font-semibold">Round {info.n} · CodeLine</span>
            <span className="text-primary/55">
              line {x.line}: <code className="font-mono text-[12px]">{info.lines?.[x.line! - 1]?.java}</code>
            </span>
            <div className="mt-1 font-mono text-[12.5px] text-primary/85" data-attempt-line>
              {x.attempts!.map((a, k) => (
                <span key={k}>
                  {k > 0 && <span className="text-primary/40"> → </span>}
                  <span className={a.ok ? "text-[#1E7B4F]" : "text-danger"}>
                    Step {a.step} {a.ok ? "✓" : "✕"} {a.ok ? `+${a.points}${a.speed ? ` +${a.speed}` : ""}` : `−${Math.abs(a.points)}`}
                  </span>
                  <span className="text-primary/40"> ({mmss(a.at)})</span>
                </span>
              ))}
              {x.autofilled && <span className="text-primary/55"> → auto-filled when time ran out</span>}
            </div>
          </div>
        ) : (
          <div key={info.n} className="text-sm">
            <span className="mr-2 font-semibold">
              Round {info.n} · {KIND_LABEL[x.kind]}
            </span>
            <span className="text-primary/65">
              {x.correct} / {x.attempted} correct · {x.score} pts
            </span>
          </div>
        ),
      )}
      {r.team && <p className="text-xs text-primary/50">Team round: the attempts above are the team's, shared by every member.</p>}
    </div>
  );
}
