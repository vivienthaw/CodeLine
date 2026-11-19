import type { ReactNode } from "react";

/** "Mon 16 Nov · 10:00" */
export function fmtWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const fmtSec = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** KPI tile: the number is the hero; label above, context below. */
export function StatTile({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/50">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[32px] font-extrabold leading-none tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-sm text-primary/60">{sub}</div>}
    </div>
  );
}

/**
 * Single-series accuracy bar (0–1). One ink colour for every bar — a hard item is called
 * out with an icon + word next to it, never by recolouring the bar.
 */
export function Meter({ value, hard = false, label, width = "w-28" }: { value: number; hard?: boolean; label: string; width?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="flex items-center gap-2.5" title={`${label}: ${pct(v)}`}>
      <div
        className={`relative h-2 ${width} shrink-0 rounded-full bg-primary/8`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
      >
        <div className="absolute inset-y-0 left-0 rounded-[4px] bg-primary" style={{ width: `${v * 100}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-bold tabular-nums">{pct(v)}</span>
      {hard && <HardTag />}
    </div>
  );
}

export function HardTag({ children = "Hard" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-bold text-[#B5600F]">
      <span aria-hidden>▲</span>
      {children}
    </span>
  );
}

export function ProfessorResult({ defeated, hpLeft }: { defeated: boolean; hpLeft: number }) {
  return defeated ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E7B4F]">
      <span aria-hidden className="grid size-4 place-items-center rounded-full bg-success text-[10px] text-white">
        ✓
      </span>
      Defeated
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary/70">
      <span aria-hidden className="grid size-4 place-items-center rounded-full bg-primary/15 text-[10px] text-primary">
        ✕
      </span>
      Survived · {hpLeft}% HP
    </span>
  );
}
