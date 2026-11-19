import { useState } from "react";
import { Button, Icon, Professor, useToast } from "../../components";
import { useLive } from "../../mock/live";
import { Link, navigate } from "../../router";
import { modeInfo } from "../data";
import { getReportSessions } from "../reports/data";
import { fmtWhen } from "../reports/ReportUI";
import { fmtTime, type StaffSession } from "../sessions";
import { StaffHeader, StaffLayout } from "../StaffLayout";
import { useStaff } from "../store";
import { ModeIcon } from "../ui";
import { openConsole, openLobby } from "./launch";

/** /staff/sessions — sessions you've set up, with their class code and a way into the lobby. */
export default function SessionsList() {
  const sessions = useStaff((s) => s.sessions);
  const pastCount = getReportSessions().length;

  return (
    <StaffLayout>
      <StaffHeader
        title="Sessions"
        subtitle="Sessions you've set up. Share the class code, then open the lobby when the class is ready."
        actions={
          <Button icon={<Icon name="plus" />} onClick={() => navigate("/staff/sessions/new")}>
            New session
          </Button>
        }
      />
      <div className="flex flex-col gap-4 px-10 pb-12">
        {sessions.length ? (
          <ul className="flex flex-col gap-3" aria-label="Sessions">
            {sessions.map((s) => (
              <SessionCard key={s.id} s={s} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 py-16 text-center">
            <Professor className="h-28" tapping />
            <h2 className="text-lg font-bold">No sessions yet</h2>
            <p className="max-w-md text-sm text-primary/60">
              Pick a few question sets as rounds, set timers and scoring, and you'll get a class code to share.
            </p>
            <Button className="mt-1" icon={<Icon name="plus" />} onClick={() => navigate("/staff/sessions/new")}>
              New session
            </Button>
          </div>
        )}

        <Link
          to="/staff/reports"
          className="flex items-center gap-3 self-start rounded-chip px-1 text-sm font-semibold text-primary/65 hover:text-primary"
        >
          <Icon name="chart" size={17} />
          {pastCount} past session{pastCount === 1 ? "" : "s"} with results are in Reports →
        </Link>
      </div>
    </StaffLayout>
  );
}

function SessionCard({ s }: { s: StaffSession }) {
  const toast = useToast();
  const sets = useStaff((x) => x.sets);
  const liveCode = useLive((x) => x.code);
  const liveStatus = useLive((x) => x.status);
  const [copied, setCopied] = useState(false);
  const byId = new Map(sets.map((x) => [x.id, x]));
  const missing = s.rounds.filter((r) => !byId.has(r.setId)).length;
  const playable = s.rounds.length - missing;
  const total = s.rounds.reduce((a, r) => a + (byId.has(r.setId) ? r.timerSec : 0), 0);
  const isThis = liveCode === s.code;
  const status = isThis && liveStatus === "open" ? "open" : isThis && liveStatus === "ended" ? "ended" : "scheduled";
  const d = new Date(s.startsAt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.code);
    } catch {
      /* clipboard blocked — the code is on screen anyway */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li data-session-row className="flex items-stretch gap-5 rounded-card bg-surface p-5 shadow-soft">
      {/* date */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-chip bg-primary/6 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary/55">
          {d.toLocaleDateString("en-GB", { month: "short" })}
        </span>
        <span className="text-2xl font-extrabold leading-none tabular-nums">{d.getDate()}</span>
      </div>

      {/* what */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-lg font-extrabold">{s.title}</h2>
          <StatusPill status={status} />
        </div>
        <p className="text-sm text-primary/60">
          {s.className} · {fmtWhen(s.startsAt)} · {s.playMode === "team" ? `Teams of ${s.teamSize}` : "Individual"} · {s.expected}{" "}
          students · {fmtTime(total)} total
        </p>
        <ol className="mt-2.5 flex flex-wrap gap-2">
          {s.rounds.map((r, i) => {
            const set = byId.get(r.setId);
            return (
              <li
                key={r.id}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  set ? "bg-bg text-primary/80" : "bg-danger/8 text-danger line-through"
                }`}
              >
                <span className="text-primary/45">{i + 1}</span>
                {set && <ModeIcon mode={set.mode} size={13} />}
                {set ? `${modeInfo(set.mode).short} — ${set.title}` : "Deleted set"}
                {set && <span className="font-normal text-primary/50">· {fmtTime(r.timerSec)}</span>}
              </li>
            );
          })}
        </ol>
        {missing > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-danger">
            ● {missing === 1 ? "A set this session uses was" : `${missing} sets this session uses were`} deleted — {missing === 1 ? "that round is" : "those rounds are"} skipped
          </p>
        )}
      </div>

      {/* code + actions */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        <button
          onClick={copy}
          title="Copy class code"
          aria-label={`Class code ${s.code.split("").join(" ")}. Copy`}
          className="group flex cursor-pointer items-center gap-2 rounded-chip border-2 border-primary/15 px-3 py-1.5 hover:border-primary/40"
        >
          <span className="font-mono text-xl font-bold tracking-[0.2em]">{s.code}</span>
          <span className="text-xs font-semibold text-primary/50 group-hover:text-primary">{copied ? "Copied!" : <Icon name="copy" size={15} />}</span>
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => openConsole(s, sets)} disabled={!playable}>
            Lecturer console
          </Button>
          <Button
            onClick={() => {
              if (!playable) return toast("wrong", "Every set in this session was deleted");
              openLobby(s, sets);
            }}
            disabled={!playable}
          >
            {status === "open" ? "Go to lobby →" : "Open lobby →"}
          </Button>
        </div>
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: "scheduled" | "open" | "ended" }) {
  const [label, cls] =
    status === "open"
      ? ["Lobby open", "bg-success/15 text-[#1E7B4F]"]
      : status === "ended"
        ? ["Ended", "bg-primary/10 text-primary/60"]
        : ["Scheduled", "bg-accent/12 text-[#B5600F]"];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {status === "open" && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-success" />}
      {label}
    </span>
  );
}
