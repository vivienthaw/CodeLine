import { useState } from "react";
import { Icon } from "../../components";
import {
  fmtDay,
  reviewSessions,
  reviewWindow,
  type ReviewSession,
  type Topic,
} from "../../mock/review";
import { Link } from "../../router";

/**
 * /me/progress — numbers across every session attended, expired ones included
 * (their content is locked, their results still count). Read-only.
 */

const TOPICS: Topic[] = ["Loops", "Arrays", "Strings", "Conditions"];
type ModeFilter = "all" | "individual" | "team";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function Progress() {
  const sessions = reviewSessions(); // newest first

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold">Progress</h2>
        <p className="text-sm text-primary/60">
          Every session you've played counts here — including ones whose review has expired.
        </p>
      </div>

      <Summary sessions={sessions} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-5">
        <ScoreChart sessions={sessions} />
        <TopicChart sessions={sessions} />
      </div>

      <History sessions={sessions} />
    </div>
  );
}

/* ---------------- summary ---------------- */

function Summary({ sessions }: { sessions: ReviewSession[] }) {
  const tiles: [string, string, string][] = [
    [
      "Sessions attended",
      String(sessions.length),
      `${sessions.filter((s) => s.mode === "team").length} as a team`,
    ],
    [
      "Average score",
      Math.round(avg(sessions.map((s) => s.score))).toLocaleString("en-GB"),
      "per session",
    ],
    ["Accuracy", pct(avg(sessions.map((s) => s.accuracy))), "right on the first try"],
    [
      "Wrong attempts",
      String(sessions.reduce((a, s) => a + s.wrongAttempts, 0)),
      "wrong drops + wrong answers",
    ],
    [
      "Avg time per line",
      mmss(avg(sessions.map((s) => s.avgLineSec))),
      "to place your CodeLine line",
    ],
  ];
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
      data-progress-summary
    >
      {tiles.map(([label, value, sub]) => (
        <div key={label} className="rounded-card bg-surface p-4 shadow-soft">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary/50">
            {label}
          </div>
          <div className="mt-1.5 text-[28px] font-extrabold leading-none tabular-nums">{value}</div>
          <div className="mt-1.5 text-xs text-primary/55">{sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- score over time (line) ---------------- */

const W = 640;
const H = 260;
const PAD = { l: 44, r: 24, t: 20, b: 34 };

function niceMax(v: number) {
  const step = v > 1000 ? 500 : 200;
  return Math.max(step, Math.ceil(v / step) * step);
}

function ScoreChart({ sessions }: { sessions: ReviewSession[] }) {
  const [mode, setMode] = useState<ModeFilter>("all");
  const [hover, setHover] = useState<string | null>(null);
  const pts = [...sessions]
    .filter((s) => mode === "all" || s.mode === mode)
    .sort((a, b) => a.date.localeCompare(b.date));

  // x: real time between sessions; y: score from 0
  const times = sessions.map((s) => new Date(s.date).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const yMax = niceMax(Math.max(...sessions.map((s) => s.score)));
  const x = (s: ReviewSession) =>
    PAD.l + ((new Date(s.date).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const ticks = Array.from({ length: 4 }, (_, i) => (yMax / 3) * i);
  const hovered = pts.find((p) => p.id === hover);
  const last = pts.at(-1);

  return (
    <section className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="score-chart-h">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="score-chart-h" className="font-bold">
            Score per session
          </h3>
          <p className="text-xs text-primary/55">
            <span aria-hidden>●</span> individual · <span aria-hidden>○</span> team (team score)
          </p>
        </div>
        <div
          role="group"
          aria-label="Show sessions"
          className="inline-flex rounded-chip bg-bg p-1 text-xs font-semibold"
        >
          {(
            [
              ["individual", "Individual"],
              ["team", "Team"],
              ["all", "All"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`cursor-pointer rounded-[8px] px-3 py-1.5 ${mode === m ? "bg-surface text-primary shadow-soft" : "text-primary/55 hover:text-primary"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Score per session: ${pts.map((p) => `${shortDay(p.date)} ${p.score}`).join(", ")}`}
        >
          {/* recessive grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(t)}
                y2={y(t)}
                className="stroke-primary/8"
                strokeWidth={1}
              />
              <text
                x={PAD.l - 8}
                y={y(t)}
                dy="0.35em"
                textAnchor="end"
                className="fill-primary/45 text-[11px] tabular-nums"
              >
                {Math.round(t)}
              </text>
            </g>
          ))}
          {/* x labels: one per session shown */}
          {pts.map((p) => (
            <text
              key={p.id}
              x={x(p)}
              y={H - 10}
              textAnchor="middle"
              className="fill-primary/55 text-[11px]"
            >
              {shortDay(p.date)}
            </text>
          ))}
          {/* line */}
          {pts.length > 1 && (
            <polyline
              points={pts.map((p) => `${x(p)},${y(p.score)}`).join(" ")}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {hovered && (
            <line
              x1={x(hovered)}
              x2={x(hovered)}
              y1={PAD.t}
              y2={H - PAD.b}
              className="stroke-primary/20"
              strokeDasharray="3 3"
            />
          )}
          {/* markers: 2px surface ring; team = hollow */}
          {pts.map((p) => (
            <circle
              key={p.id}
              cx={x(p)}
              cy={y(p.score)}
              r={hover === p.id ? 7 : 5.5}
              strokeWidth={p.mode === "team" ? 2.5 : 2}
              className={
                p.mode === "team" ? "fill-surface stroke-primary" : "fill-primary stroke-surface"
              }
            />
          ))}
          {/* selective direct label: latest value only */}
          {last && (
            <text
              x={x(last)}
              y={y(last.score) - 14}
              textAnchor="middle"
              className="fill-primary text-[12px] font-bold tabular-nums"
            >
              {last.score}
            </text>
          )}
          {/* hit targets bigger than the marks */}
          {pts.map((p) => (
            <rect
              key={p.id}
              x={x(p) - 24}
              y={PAD.t}
              width={48}
              height={H - PAD.t - PAD.b}
              fill="transparent"
              data-score-point={p.id}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {hovered && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-max -translate-x-1/2 -translate-y-full rounded-chip bg-primary px-3 py-2 text-xs text-white shadow-lift"
            style={{
              left: `${(x(hovered) / W) * 100}%`,
              top: `calc(${(y(hovered.score) / H) * 100}% - 12px)`,
            }}
          >
            <div className="font-bold">{hovered.title}</div>
            <div className="text-white/70">
              {fmtDay(hovered.date)} ·{" "}
              {hovered.mode === "team" ? `Team ${hovered.team?.name}` : "Individual"}
            </div>
            <div className="mt-0.5 font-bold tabular-nums">
              {hovered.score} pts · rank {hovered.rank} / {hovered.of}
            </div>
          </div>
        )}
        {!pts.length && (
          <p className="absolute inset-0 grid place-items-center text-sm text-primary/55">
            No {mode} sessions yet
          </p>
        )}
      </div>
    </section>
  );
}

/* ---------------- accuracy by topic (bars) ---------------- */

function TopicChart({ sessions }: { sessions: ReviewSession[] }) {
  const [hover, setHover] = useState<Topic | null>(null);
  const rows = TOPICS.map((t) => {
    const of = sessions.filter((s) => s.topic === t);
    return { topic: t, n: of.length, acc: of.length ? avg(of.map((s) => s.accuracy)) : null };
  });

  return (
    <section className="rounded-card bg-surface p-5 shadow-soft" aria-labelledby="topic-chart-h">
      <h3 id="topic-chart-h" className="font-bold">
        Accuracy by topic
      </h3>
      <p className="mb-4 text-xs text-primary/55">
        Right on the first try, averaged over your sessions on each topic
      </p>
      <ul className="flex flex-col gap-4">
        {rows.map((r) => (
          <li
            key={r.topic}
            data-topic={r.topic}
            className="relative"
            onMouseEnter={() => setHover(r.topic)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-semibold">{r.topic}</span>
              <span className="text-xs text-primary/50">
                {r.n ? `${r.n} session${r.n === 1 ? "" : "s"}` : "no sessions yet"}
              </span>
            </div>
            {r.acc === null ? (
              <div
                className="h-3 rounded-full border border-dashed border-primary/15"
                aria-label={`${r.topic}: no sessions yet`}
              />
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="relative h-3 flex-1 rounded-full bg-primary/8"
                  role="meter"
                  aria-label={`${r.topic} accuracy`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(r.acc * 100)}
                >
                  <div
                    className={`absolute inset-y-0 left-0 rounded-[4px] bg-primary transition-opacity ${hover && hover !== r.topic ? "opacity-50" : ""}`}
                    style={{ width: `${r.acc * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm font-bold tabular-nums">{pct(r.acc)}</span>
              </div>
            )}
            {hover === r.topic && r.acc !== null && (
              <div
                role="tooltip"
                className="pointer-events-none absolute -top-9 right-0 z-10 rounded-chip bg-primary px-3 py-1.5 text-xs text-white shadow-lift"
              >
                {r.topic}: {pct(r.acc)} first try ·{" "}
                {sessions
                  .filter((s) => s.topic === r.topic)
                  .map((s) => shortDay(s.date))
                  .join(", ")}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- history table ---------------- */

function History({ sessions }: { sessions: ReviewSession[] }) {
  return (
    <section
      className="overflow-hidden rounded-card bg-surface shadow-soft"
      aria-labelledby="history-h"
    >
      <h3 id="history-h" className="border-b border-primary/10 px-5 py-4 font-bold">
        Session history
      </h3>
      {/* narrow screens: the table scrolls inside its card, never the page */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-bg/60 text-xs font-bold uppercase tracking-wider text-primary/50">
            <tr>
              <th className="px-5 py-2.5">Date</th>
              <th className="px-3 py-2.5">Session</th>
              <th className="px-3 py-2.5">Topic</th>
              <th className="px-3 py-2.5">Mode</th>
              <th className="px-3 py-2.5 text-right">Score</th>
              <th className="px-3 py-2.5 text-right">Accuracy</th>
              <th className="px-5 py-2.5 text-right">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/8">
            {sessions.map((s) => {
              const expired = reviewWindow(s).expired;
              return (
                <tr key={s.id} data-history-row={s.id}>
                  <td className="whitespace-nowrap px-5 py-3 text-primary/70">{fmtDay(s.date)}</td>
                  <td className="px-3 py-3">
                    {expired ? (
                      <span className="inline-flex items-center gap-1.5 text-primary/70">
                        {s.title}
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/6 px-2 py-0.5 text-[11px] font-semibold text-primary/50">
                          <Icon name="lock" size={11} /> review expired
                        </span>
                      </span>
                    ) : (
                      <Link
                        to={`/me/sessions/${s.id}`}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {s.title}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-3">{s.topic}</td>
                  <td className="px-3 py-3">
                    {s.mode === "team" ? `Team · ${s.team?.name}` : "Individual"}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">
                    {s.score.toLocaleString("en-GB")}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{pct(s.accuracy)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {s.rank} <span className="text-primary/45">/ {s.of}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
