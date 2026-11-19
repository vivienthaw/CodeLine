import { CLASSMATES } from "./data";
import { reviewSessions } from "./review";

/**
 * Mock leaderboards for /me/rank. Names only — never student IDs.
 * Rank is game performance only; read-only like the rest of /me.
 */

export type RankScope = "session" | "month" | "course";

export type RankEntry = {
  rank: number;
  name: string;
  score: number;
  /** rank before the latest session; null = wasn't ranked then */
  prevRank: number | null;
  you?: boolean;
};

export type TeamEntry = RankEntry & { members: number };

export type Board<T> = { scope: RankScope; label: string; context: string; entries: T[]; you: T | null };

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A board where "you" land exactly at yourRank with yourScore: the people above
 * you score more, the people below score less (no ties at your score).
 */
function makeBoard(
  names: string[],
  you: { name: string; score: number; rank: number; prevRank: number | null },
  spread: number,
  seed: number,
): RankEntry[] {
  const rnd = seeded(seed);
  const others = names.filter((n) => n !== you.name);
  const above = you.rank - 1;
  const scores = others.map((_, i) =>
    i < above
      ? you.score + Math.round(((above - i) / above) * spread + rnd() * spread * 0.15) + 3
      : Math.max(0, you.score - Math.round(((i - above + 1) / (others.length - above)) * spread * 1.4 + rnd() * spread * 0.1) - 3),
  );
  // noise can swap neighbours — keep each side in order so ranks read top-down
  const hi = scores.slice(0, above).sort((a, b) => b - a);
  const lo = scores.slice(above).sort((a, b) => b - a);
  const rows = others.map((name, i) => ({ name, score: i < above ? hi[i]! : lo[i - above]! }));
  rows.splice(above, 0, { name: you.name, score: you.score });
  const n = rows.length;
  return rows.map((r, i) => {
    const rank = i + 1;
    if (r.name === you.name) return { ...r, rank, prevRank: you.prevRank, you: true };
    const roll = rnd();
    const prevRank = roll < 0.08 ? null : Math.min(n, Math.max(1, rank + Math.round((rnd() - 0.5) * 8)));
    return { ...r, rank, prevRank };
  });
}

const TEAMS = [
  "Stack Overflowers",
  "The Semicolons",
  "Null Pointers",
  "Bit Flippers",
  "Loop de Loops",
  "Off By One",
  "Hello Worlds",
  "Recursion Rangers",
  "Syntax Terrors",
  "Big O's",
];

export function playerBoard(scope: RankScope, me: string): Board<RankEntry> {
  const sessions = reviewSessions(); // newest first
  const latest = sessions[0]!;
  const monthDays = 30;
  const recent = sessions.filter((s) => Date.now() - new Date(s.date).getTime() <= monthDays * 86_400_000);
  const names = [me, ...CLASSMATES.filter((n) => n !== me)].slice(0, latest.of);

  const sum = (xs: typeof sessions) => xs.reduce((a, s) => a + s.score, 0);
  const cfg = {
    session: {
      label: "This session",
      context: `${latest.title} · ${names.length} players`,
      you: { name: me, score: latest.score, rank: latest.rank, prevRank: 10 },
      spread: 260,
      seed: 11,
    },
    month: {
      label: "This month",
      context: `Last ${monthDays} days · ${recent.length} sessions`,
      you: { name: me, score: sum(recent), rank: 5, prevRank: 4 },
      spread: 420,
      seed: 22,
    },
    course: {
      label: "Whole course",
      context: `All ${sessions.length} sessions this course`,
      you: { name: me, score: sum(sessions), rank: 12, prevRank: 14 },
      spread: 700,
      seed: 33,
    },
  }[scope];

  const entries = makeBoard(names, cfg.you, cfg.spread, cfg.seed);
  return { scope, label: cfg.label, context: cfg.context, entries, you: entries.find((e) => e.you) ?? null };
}

/** Teams only exist in team sessions; "This session" was individual, so it has none. */
export function teamBoard(scope: RankScope): Board<TeamEntry> {
  const sessions = reviewSessions();
  const latest = sessions[0]!;
  const teamSessions = sessions.filter((s) => s.mode === "team");
  const mine = teamSessions[0];
  const label = scope === "session" ? "This session" : scope === "month" ? "This month" : "Whole course";
  if (scope === "session" && latest.mode !== "team") {
    return { scope, label, context: `${latest.title} was played individually`, entries: [], you: null };
  }
  if (!mine?.team) return { scope, label, context: "No team sessions yet", entries: [], you: null };

  const base = makeBoard(TEAMS, { name: mine.team.name, score: mine.score, rank: mine.rank, prevRank: 5 }, 180, scope === "month" ? 44 : 55);
  const entries = base.map((e) => ({ ...e, members: e.name === mine.team!.name ? mine.team!.members.length : 4 }));
  return {
    scope,
    label,
    context: `${mine.title} · ${TEAMS.length} teams`,
    entries,
    you: entries.find((e) => e.you) ?? null,
  };
}

export const TOP_N = 10;
