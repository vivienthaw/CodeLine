import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Modal, Select, useToast } from "../../components";
import { Link, navigate } from "../../router";
import { CLASS, getStudents, type Session } from "./data";
import {
  BandLine,
  ChartCard,
  EMPTY,
  Histogram,
  LegendItem,
  PART_COLORS,
  Sparkline,
  StackedBars,
  TopicBars,
} from "./charts";
import {
  classSummaries,
  FLAG_TEXT,
  filteredSessions,
  mmss,
  needsAttention,
  pct,
  shortDay,
  summarizeSession,
  topicAccuracy,
  useFilters,
  type Filters,
  type StudentSummary,
} from "./metrics";
import { Card, ReportFrame } from "./ReportFrame";

export default function ClassOverview() {
  const f = useFilters();
  const sessions = filteredSessions(f);
  const sums = useMemo(() => sessions.map((s) => summarizeSession(s, f)), [sessions, f]);
  const students = useMemo(() => classSummaries(sessions, f), [sessions, f]);
  const [exportOpen, setExportOpen] = useState(false);

  const attendance = sums.length ? sums.reduce((a, x) => a + (x.joined + x.autofilled) / getStudents().length, 0) / sums.length : null;
  const avgScore = sums.length ? sums.reduce((a, x) => a + x.avg, 0) / sums.length : null;
  // pooled: every first try by every student in range
  const attempted = students.reduce((a, x) => a + x.attempted, 0);
  const acc = attempted ? students.reduce((a, x) => a + x.correct, 0) / attempted : null;

  return (
    <ReportFrame
      title="Reports"
      subtitle={`${CLASS.name} · ${CLASS.term} · lecturers and TAs see the same reports`}
      actions={
        <Button variant="secondary" icon={<DownloadIcon />} onClick={() => setExportOpen(true)}>
          Department export
        </Button>
      }
    >
      <div className="grid grid-cols-5 gap-4" data-summary>
        <Card label="Students enrolled" value={getStudents().length} sub={CLASS.name} />
        <Card label="Avg attendance" value={pct(attendance)} sub="joined or auto-filled" />
        <Card label="Avg score" value={avgScore === null ? "—" : Math.round(avgScore)} sub="per student, per session" />
        <Card label="Avg accuracy" value={pct(acc)} sub="right on the first try" />
        <Card label="Sessions run" value={sessions.length} sub={sessions.length ? `${shortDay(sessions[0]!.date)} – ${shortDay(sessions.at(-1)!.date)}` : "none in range"} />
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5">
        <ChartCard
          title="Class average per session"
          sub="Line = class average · band = lowest to highest score"
          legend={
            <>
              <LegendItem color="var(--color-primary)" label="Class average" />
              <LegendItem color="var(--color-primary)" label="Min–max" shape="band" />
            </>
          }
          empty={!sums.length && EMPTY}
        >
          <BandLine points={sums.map((x) => ({ id: x.s.id, label: shortDay(x.s.date), title: x.s.title, avg: x.avg, min: x.min, max: x.max }))} />
        </ChartCard>
        <ChartCard title="Accuracy by topic" sub="Right on the first try, whole class" empty={!sums.length && EMPTY}>
          <TopicBars rows={topicAccuracy(sessions, f).map((t) => ({ topic: t.topic, value: t.accuracy, sessions: t.sessions }))} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <DistributionCard sessions={sessions} f={f} />
        <ChartCard
          title="Participation per session"
          sub="Out of 40 enrolled"
          legend={
            <>
              <LegendItem color={PART_COLORS.joined} label="Joined" shape="box" />
              <LegendItem color={PART_COLORS.autofilled} label="Auto-filled" shape="box" />
              <LegendItem color={PART_COLORS.absent} label="Absent" shape="box" />
            </>
          }
          empty={!sums.length && EMPTY}
        >
          <StackedBars rows={sums.map((x) => ({ id: x.s.id, label: shortDay(x.s.date), title: x.s.title, joined: x.joined, autofilled: x.autofilled, absent: x.absent }))} />
        </ChartCard>
      </div>

      <NeedsAttention students={students} empty={!sessions.length} />
      <StudentTable students={students} empty={!sessions.length} />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} sessions={sessions} f={f} />
    </ReportFrame>
  );
}

function DistributionCard({ sessions, f }: { sessions: Session[]; f: Filters }) {
  const [pick, setPick] = useState<string | null>(null);
  const current = sessions.find((s) => s.id === pick) ?? sessions.at(-1);
  return (
    <ChartCard
      title="Score distribution"
      sub={current ? `${current.title} · students present` : "Pick a session"}
      actions={
        sessions.length > 0 && (
          <Select
            aria-label="Session for distribution"
            className="w-56"
            value={current?.id}
            onChange={(e) => setPick(e.target.value)}
            options={sessions.map((s): [string, string] => [s.id, `${shortDay(s.date)} · ${s.title.replace(/^Week \d+ — /, "")}`])}
          />
        )
      }
      empty={!current && EMPTY}
    >
      {current && <Histogram values={summarizeSession(current, f).scores} bin={f.mode === "all" ? 50 : 25} />}
    </ChartCard>
  );
}

/* ---------------- needs attention ---------------- */

function NeedsAttention({ students, empty }: { students: StudentSummary[]; empty: boolean }) {
  const rows = needsAttention(students);
  return (
    <section className="rounded-card border-l-4 border-accent bg-surface p-5 shadow-soft" aria-labelledby="attn-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="attn-h" className="font-bold">
          Needs attention <span className="font-semibold text-primary/45">· {rows.length}</span>
        </h2>
        <span className="text-xs text-primary/55">Accuracy under 50%, 2+ absences, or many wrong attempts (top 10%)</span>
      </div>
      {empty ? (
        <p className="text-sm text-primary/55">{EMPTY}</p>
      ) : rows.length ? (
        <ul className="grid grid-cols-2 gap-2">
          {rows.map(({ x, flags }) => (
            <li key={x.st.id}>
              <Link
                to={`/staff/reports/students/${x.st.id}`}
                className="flex h-full items-center gap-3 rounded-chip border border-primary/10 px-3 py-2 hover:border-primary/30 hover:bg-bg/60"
                data-attention={x.st.name}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{x.st.name}</span>
                    <span className="text-xs text-primary/55">
                      {pct(x.accuracy)} accuracy · {x.absences} absent · {x.wrong} wrong
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                  {flags.map((fl) => (
                    <span key={fl} className="rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-bold text-[#B5600F]">
                      ▲ {FLAG_TEXT[fl]}
                    </span>
                  ))}
                  </span>
                </span>
                <span aria-hidden className="text-primary/35">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-primary/55">Nobody matches these rules for the current filters.</p>
      )}
    </section>
  );
}

/* ---------------- student table ---------------- */

type Key = "name" | "id" | "attended" | "avgScore" | "accuracy" | "wrong" | "avgLineSec" | "lastActive";
const PAGE = 25;

function StudentTable({ students, empty }: { students: StudentSummary[]; empty: boolean }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const val = (x: StudentSummary): number | string => {
      switch (sort.key) {
        case "name":
          return x.st.name;
        case "id":
          return x.st.id;
        case "lastActive":
          return x.lastActive ?? "";
        case "accuracy":
          return x.accuracy ?? -1;
        case "avgLineSec":
          return x.avgLineSec ?? Infinity;
        default:
          return x[sort.key];
      }
    };
    const needle = q.trim().toLowerCase();
    return students
      .filter((x) => !needle || x.st.name.toLowerCase().includes(needle) || x.st.id.toLowerCase().includes(needle))
      .sort((a, b) => {
        const A = val(a);
        const B = val(b);
        return (typeof A === "string" ? A.localeCompare(B as string) : A - (B as number)) * sort.dir;
      });
  }, [students, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = rows.slice(p * PAGE, p * PAGE + PAGE);

  const head = (key: Key, label: string, right = false) => {
    const on = sort.key === key;
    return (
      <th className={`px-3 py-2.5 ${right ? "text-right" : ""}`} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          onClick={() => {
            setSort(on ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: key === "name" || key === "id" ? 1 : -1 });
            setPage(0);
          }}
          className={`inline-flex cursor-pointer items-center gap-1 uppercase hover:text-primary ${on ? "text-primary" : ""}`}
        >
          {label}
          <span aria-hidden className={on ? "" : "opacity-0"}>
            {sort.dir === 1 ? "↑" : "↓"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <section className="overflow-hidden rounded-card bg-surface shadow-soft" aria-labelledby="students-h">
      <header className="flex flex-wrap items-center gap-3 border-b border-primary/10 px-5 py-4">
        <h2 id="students-h" className="mr-auto font-bold">
          Students <span className="font-semibold text-primary/45">· {rows.length}</span>
        </h2>
        <label className="relative w-72">
          <span className="sr-only">Search students</span>
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary/45" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search name or student ID"
            className="min-h-10 w-full rounded-chip border-2 border-primary/20 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
      </header>
      {empty ? (
        <p className="px-5 py-10 text-center text-sm text-primary/55">{EMPTY}</p>
      ) : (
        <>
          <table className="w-full text-left text-sm">
            <thead className="bg-bg/60 text-xs font-bold uppercase tracking-wider text-primary/50">
              <tr>
                {head("name", "Name")}
                {head("id", "Student ID")}
                {head("attended", "Attended", true)}
                {head("avgScore", "Avg score", true)}
                {head("accuracy", "Accuracy", true)}
                {head("wrong", "Wrong", true)}
                {head("avgLineSec", "Time / line", true)}
                <th className="px-3 py-2.5">Trend</th>
                {head("lastActive", "Last active")}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/8">
              {shown.map((x) => (
                <tr
                  key={x.st.id}
                  data-student-row={x.st.id}
                  onClick={() => navigate(`/staff/reports/students/${x.st.id}`)}
                  className="cursor-pointer hover:bg-bg/60"
                >
                  <td className="px-3 py-2.5 pl-5">
                    <Link to={`/staff/reports/students/${x.st.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline">
                      {x.st.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-primary/60">{x.st.id}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {x.attended} <span className="text-primary/45">/ {x.sessions}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums">{x.attended ? Math.round(x.avgScore) : "—"}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${x.accuracy !== null && x.accuracy < 0.5 ? "font-bold text-[#B5600F]" : ""}`}>
                    {x.accuracy !== null && x.accuracy < 0.5 && <span aria-hidden>▲ </span>}
                    {pct(x.accuracy)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{x.wrong}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{mmss(x.avgLineSec)}</td>
                  <td className="px-3 py-2.5">
                    <Sparkline values={x.trend} label={`${x.st.name} score trend`} />
                  </td>
                  <td className="px-3 py-2.5 text-primary/65">{x.lastActive ? shortDay(x.lastActive) : "—"}</td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-primary/55">
                    No students match “{q}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <footer className="flex items-center justify-between border-t border-primary/10 px-5 py-3 text-sm text-primary/60">
            <span data-page-info>
              {rows.length ? `${p * PAGE + 1}–${Math.min(rows.length, (p + 1) * PAGE)} of ${rows.length}` : "0 of 0"}
            </span>
            <span className="flex items-center gap-2">
              <Button variant="ghost" disabled={p === 0} onClick={() => setPage(p - 1)}>
                ← Previous
              </Button>
              <span className="tabular-nums">
                Page {p + 1} of {pages}
              </span>
              <Button variant="ghost" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
                Next →
              </Button>
            </span>
          </footer>
        </>
      )}
    </section>
  );
}

/* ---------------- department export ---------------- */

function ExportModal({ open, onClose, sessions, f }: { open: boolean; onClose: () => void; sessions: Session[]; f: Filters }) {
  const toast = useToast();
  const [format, setFormat] = useState<"pdf" | "csv">("csv");
  const [personal, setPersonal] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const reasonOk = reason.trim().length >= 10;

  // start clean every time it opens (resetting on close raced with a quick reopen)
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setPersonal(false);
    setReason("");
  }, [open]);
  const close = () => onClose();

  const run = () => {
    if (personal) {
      if (!reasonOk) return;
      setSent(true); // personal data never leaves without approval
      return;
    }
    if (format === "csv") {
      const csv = aggregateCsv(sessions, f);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `${CLASS.id}-class-report.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast("correct", `Exported class summary (${sessions.length} sessions) as CSV`);
    } else {
      close();
      setTimeout(() => window.print(), 250);
      return;
    }
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Department export"
      footer={
        sent ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={run} disabled={personal && !reasonOk} data-autofocus>
              {personal ? "Request approval" : `Export ${format.toUpperCase()}`}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center" role="status">
          <span className="grid size-12 place-items-center rounded-full bg-success/15 text-success">
            <Icon name="check" size={24} />
          </span>
          <div className="font-bold">Approval requested</div>
          <p className="max-w-sm text-sm text-primary/65">
            The {format.toUpperCase()} with individual student data will be emailed to you once the request is approved. Reason: “{reason.trim()}”
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Format</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["pdf", "PDF", "Printable report with the charts"],
                  ["csv", "CSV", "Spreadsheet of per-session numbers"],
                ] as const
              ).map(([v, l, hint]) => (
                <label key={v} className={`flex cursor-pointer items-start gap-2 rounded-chip border-2 px-3 py-2 ${format === v ? "border-primary bg-primary/5" : "border-primary/15"}`}>
                  <input type="radio" name="export-format" value={v} checked={format === v} onChange={() => setFormat(v)} className="mt-1 accent-primary" />
                  <span>
                    <span className="block text-sm font-semibold">{l}</span>
                    <span className="block text-xs text-primary/55">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="rounded-chip bg-bg px-3 py-2 text-sm text-primary/70">
            By default the export holds <b>aggregate class data only</b>: {sessions.length} sessions in the current filters, attendance, averages and accuracy by
            topic — no names or IDs.
          </p>
          <label className="flex cursor-pointer items-start gap-2">
            <input type="checkbox" checked={personal} onChange={(e) => setPersonal(e.target.checked)} className="mt-1 size-4 accent-primary" />
            <span className="text-sm font-semibold">Include individual student data</span>
          </label>
          {personal && (
            <div className="flex flex-col gap-2 rounded-chip border-2 border-accent/50 bg-accent/8 px-4 py-3" role="alert">
              <div className="flex items-center gap-2 text-sm font-bold text-[#B5600F]">
                <span aria-hidden>▲</span> Requires approval — contains personal data
              </div>
              <label htmlFor="export-reason" className="text-sm font-semibold">
                Reason for including student data
              </label>
              <textarea
                id="export-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Moderation for the course review board"
                className="rounded-chip border-2 border-primary/20 bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <span className="text-xs text-primary/55">{reasonOk ? "Ready to send for approval." : "At least 10 characters."}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function aggregateCsv(sessions: Session[], f: Filters) {
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const rows = [["Date", "Session", "Topic", "Play type", "Joined", "Auto-filled", "Absent", "Average score", "Min", "Max"]];
  for (const s of sessions) {
    const x = summarizeSession(s, f);
    rows.push([s.date.slice(0, 10), s.title, s.topic, s.play, String(x.joined), String(x.autofilled), String(x.absent), String(Math.round(x.avg)), String(x.min), String(x.max)]);
  }
  rows.push([]);
  rows.push(["Topic", "Accuracy %", "Sessions"]);
  for (const t of topicAccuracy(sessions, f)) rows.push([t.topic, t.accuracy === null ? "" : String(Math.round(t.accuracy * 100)), String(t.sessions)]);
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);
