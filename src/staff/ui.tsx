import type { Difficulty, SetMode } from "./data";

/** Small staff-side visual helpers: mode icon, difficulty chip, relative time. */

export function ModeIcon({ mode, size = 18 }: { mode: SetMode; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (mode) {
    case "codeline":
      return (
        <svg {...common}>
          <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
        </svg>
      );
    case "mc":
      return (
        <svg {...common}>
          <circle cx="6" cy="7" r="2" />
          <circle cx="6" cy="17" r="2" />
          <path d="M11 7h9M11 17h9" />
        </svg>
      );
    case "tf":
      return (
        <svg {...common}>
          <path d="m3 12 3 3 5-6M14 9l6 6M20 9l-6 6" />
        </svg>
      );
    case "match":
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2" />
          <circle cx="19" cy="18" r="2" />
          <circle cx="5" cy="18" r="2" />
          <circle cx="19" cy="6" r="2" />
          <path d="M7 6c6 0 6 12 10 12M7 18c6 0 6-12 10-12" />
        </svg>
      );
    case "fill":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h5M15 12h5M4 17h16" />
          <path d="M10 13.5h4" strokeWidth={3} />
        </svg>
      );
  }
}

const DIFF_TONE: Record<Difficulty, string> = {
  Easy: "bg-success/12 text-success",
  Medium: "bg-accent/15 text-[#B5600F]",
  Hard: "bg-danger/12 text-danger",
};

export function DifficultyChip({ value }: { value: Difficulty }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${DIFF_TONE[value]}`}>{value}</span>;
}

export function timeAgo(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? "yesterday" : `${d} days ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w} week${w === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
