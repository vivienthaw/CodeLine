import { useState } from "react";
import { Icon, initials } from "../../components";
import {
  playerBoard,
  teamBoard,
  TOP_N,
  type Board,
  type RankEntry,
  type RankScope,
  type TeamEntry,
} from "../../mock/rank";
import { useStore } from "../../mock/store";

type Tab = "players" | "teams";

const SCOPES: [RankScope, string][] = [
  ["session", "This session"],
  ["month", "This month"],
  ["course", "Whole course"],
];

/** /me/rank — leaderboards. Names only, never student IDs. Read-only. */
export default function Rank() {
  const me = useStore((s) => s.student?.name) ?? "You";
  const [scope, setScope] = useState<RankScope>("session");
  const [tab, setTab] = useState<Tab>("players");
  const board: Board<RankEntry | TeamEntry> =
    tab === "players" ? playerBoard(scope, me) : teamBoard(scope);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">Rank</h2>
          <p className="text-sm text-primary/60">
            How the class did in the game. Arrows show the change since the previous session.
          </p>
        </div>
        <div
          role="group"
          aria-label="Period"
          className="inline-flex rounded-chip bg-surface p-1 shadow-soft"
        >
          {SCOPES.map(([s, label]) => (
            <button
              key={s}
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={`min-h-9 cursor-pointer rounded-[8px] px-3.5 text-sm font-semibold transition-colors ${
                scope === s ? "bg-primary text-white" : "text-primary/60 hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5">
        <section
          className="overflow-hidden rounded-card bg-surface shadow-soft"
          aria-labelledby="board-h"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-primary/10 px-4 pt-4 sm:px-5">
            <div className="pb-3">
              <h3 id="board-h" className="font-extrabold">
                Game performance
              </h3>
              <p className="text-xs text-primary/55">
                {board.label} · {board.context}
              </p>
            </div>
            <div role="tablist" aria-label="Leaderboard" className="flex self-end">
              {(
                [
                  ["players", "Players"],
                  ["teams", "Teams"],
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  role="tab"
                  id={`rank-tab-${t}`}
                  aria-selected={tab === t}
                  aria-controls="rank-panel"
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => setTab(t)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      const other = t === "players" ? "teams" : "players";
                      setTab(other);
                      document.getElementById(`rank-tab-${other}`)?.focus();
                    }
                  }}
                  className={`-mb-px cursor-pointer border-b-[3px] px-4 pb-3 text-sm font-semibold ${
                    tab === t
                      ? "border-accent text-primary"
                      : "border-transparent text-primary/55 hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div role="tabpanel" id="rank-panel" aria-labelledby={`rank-tab-${tab}`}>
            {board.entries.length ? (
              <Table board={board} team={tab === "teams"} />
            ) : (
              <div className="px-6 py-14 text-center text-sm text-primary/60">
                <Icon name="users" size={28} className="mx-auto mb-2 text-primary/30" />
                <div className="font-semibold text-primary/75">
                  No team rankings for this period
                </div>
                <div>{board.context}.</div>
                <div className="mt-1 text-xs">Try “This month” or “Whole course”.</div>
              </div>
            )}
          </div>

          <p
            className="border-t border-primary/10 bg-bg/50 px-5 py-3 text-xs text-primary/60"
            data-rank-note
          >
            Rank reflects game performance, not overall programming ability.
          </p>
        </section>

        <YouCard board={board} team={tab === "teams"} />
      </div>
    </div>
  );
}

function Table({ board, team }: { board: Board<RankEntry | TeamEntry>; team: boolean }) {
  const top = board.entries.slice(0, TOP_N);
  const you = board.you;
  const pinned = you && you.rank > TOP_N ? you : null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-left text-sm">
        <thead className="text-xs font-bold uppercase tracking-wider text-primary/50">
          <tr>
            <th className="w-20 px-5 py-2.5">Rank</th>
            <th className="w-20 px-3 py-2.5">
              <span className="sr-only">Change since previous session</span>
              <span aria-hidden>±</span>
            </th>
            <th className="px-3 py-2.5">{team ? "Team" : "Player"}</th>
            <th className="px-5 py-2.5 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {top.map((e) => (
            <Row key={e.name} e={e} team={team} />
          ))}
          {pinned && (
            <>
              <tr aria-hidden>
                <td colSpan={4} className="py-1 text-center text-primary/30">
                  ⋯
                </td>
              </tr>
              <Row e={pinned} team={team} pinned />
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  e,
  team,
  pinned = false,
}: {
  e: RankEntry | TeamEntry;
  team: boolean;
  pinned?: boolean;
}) {
  const medal = e.rank <= 3 ? ["bg-[#E8B931]", "bg-[#B8C2CC]", "bg-[#C98B4E]"][e.rank - 1] : null;
  return (
    <tr
      data-rank-row={e.rank}
      data-you={e.you || undefined}
      data-pinned={pinned || undefined}
      className={`border-t border-primary/8 ${e.you ? "bg-accent/10 shadow-[inset_4px_0_0_var(--color-accent)]" : ""} ${
        pinned ? "sticky bottom-0" : ""
      }`}
    >
      <td className="px-5 py-2.5">
        <span
          className={`inline-grid size-7 place-items-center rounded-full text-sm font-extrabold tabular-nums ${
            medal ? `${medal} text-primary` : "text-primary/70"
          }`}
        >
          {e.rank}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <Change rank={e.rank} prev={e.prevRank} />
      </td>
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold">
            {team ? <Icon name="users" size={15} /> : initials(e.name)}
          </span>
          <span className="font-semibold">{e.name}</span>
          {e.you && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
              {team ? "Your team" : "You"}
            </span>
          )}
          {team && "members" in e && (
            <span className="text-xs text-primary/45">{e.members} members</span>
          )}
        </span>
      </td>
      <td className="px-5 py-2.5 text-right font-bold tabular-nums">
        {e.score.toLocaleString("en-GB")}
      </td>
    </tr>
  );
}

/** ▲3 / ▼1 / – / new — icon + number + screen-reader words, never colour alone. */
function Change({ rank, prev }: { rank: number; prev: number | null }) {
  if (prev === null)
    return (
      <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-bold text-primary/60">
        new
      </span>
    );
  const d = prev - rank;
  if (d === 0)
    return (
      <span className="text-primary/40">
        <span aria-hidden>–</span>
        <span className="sr-only">no change</span>
      </span>
    );
  const up = d > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-bold tabular-nums ${up ? "text-[#1E7B4F]" : "text-danger"}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(d)}
      <span className="sr-only">{` place${Math.abs(d) === 1 ? "" : "s"} ${up ? "up" : "down"}`}</span>
    </span>
  );
}

function YouCard({ board, team }: { board: Board<RankEntry | TeamEntry>; team: boolean }) {
  const you = board.you;
  if (!you) return null;
  const total = board.entries.length;
  const d = you.prevRank === null ? null : you.prevRank - you.rank;
  return (
    <aside
      className="order-first rounded-card bg-primary p-5 text-white shadow-lift lg:order-none"
      aria-label={team ? "Your team's rank" : "Your rank"}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-white/60">
        {team ? "Your team" : "You"} · {board.label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-5xl font-extrabold tabular-nums">#{you.rank}</span>
        <span className="text-lg font-bold text-white/50">of {total}</span>
      </div>
      <div className="mt-1 text-sm text-white/75">
        {you.score.toLocaleString("en-GB")} points
        {d !== null && d !== 0 && (
          <>
            {" · "}
            <span className={d > 0 ? "text-[#7BE0A8]" : "text-[#FF9B9B]"}>
              {d > 0 ? "▲" : "▼"} {Math.abs(d)} since last session
            </span>
          </>
        )}
        {d === 0 && " · same as last session"}
      </div>
      {you.rank > TOP_N && (
        <p className="mt-3 text-xs text-white/60">
          Pinned below the top {TOP_N} so you can always find yourself.
        </p>
      )}
      <p className="mt-4 border-t border-white/15 pt-3 text-xs text-white/60">
        Only names are shown here — student IDs never appear on leaderboards.
      </p>
    </aside>
  );
}
