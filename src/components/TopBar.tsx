import { Icon } from "./icons";

export function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function TimerPill({ seconds, size = "md" }: { seconds: number; size?: "md" | "xl" }) {
  const urgent = seconds < 30;
  return (
    <div
      role="timer"
      aria-live="off"
      className={`inline-flex items-center gap-2 rounded-full font-mono font-bold tabular-nums transition-colors ${
        size === "xl" ? "px-8 py-3 text-6xl" : "px-4 py-1.5 text-lg"
      } ${urgent ? "cl-anim-pulse bg-danger text-white" : "bg-primary text-white"}`}
    >
      <Icon name="clock" size={size === "xl" ? 44 : 18} />
      {formatTime(seconds)}
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 font-bold text-primary">
      <Icon name="star" size={16} className="fill-accent text-accent" />
      <span className="tabular-nums">{score.toLocaleString()}</span>
    </div>
  );
}

export function ProgressBar({
  value,
  total,
  label = "lines placed",
  className = "",
}: {
  value: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className={`w-44 ${className}`}>
      <div className="mb-1 text-xs font-semibold text-primary/70">
        <span className="tabular-nums text-primary">
          {value} / {total}
        </span>{" "}
        {label}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
        <div className="cl-hp-fill h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-primary font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function TopBar({
  roundLabel,
  seconds,
  score,
  placed,
  total,
  name,
  progressLabel = "lines placed",
}: {
  progressLabel?: string;
  roundLabel: string;
  seconds: number;
  score: number;
  placed: number;
  total: number;
  name: string;
}) {
  return (
    // phones: two rows (round + timer, then score + progress); tablet/desktop: one 64px row
    <header className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-primary/10 bg-surface px-4 py-2 shadow-soft md:h-16 md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6 md:py-0">
      <div className="min-w-0 truncate font-bold text-primary">{roundLabel}</div>
      <TimerPill seconds={seconds} />
      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-end md:gap-5">
        <ScorePill score={score} />
        <ProgressBar value={placed} total={total} label={progressLabel} className="min-w-0 flex-1 sm:w-44 sm:flex-none" />
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <span className="hidden font-semibold text-primary sm:inline">{name}</span>
        </div>
      </div>
    </header>
  );
}
