import { useState, type ReactNode } from "react";

/**
 * Report charts. Single-series charts use the brand navy; multi-series ones use the
 * validated categorical slots below (blue / orange / aqua — passes CVD + normal-vision
 * checks; aqua is under 3:1 on white, so segments always carry visible count labels).
 */
export const SERIES = { blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a" };
const NAVY = "var(--color-primary)";

export const EMPTY = "No sessions in this range";

export function ChartCard({
  title,
  sub,
  legend,
  actions,
  empty,
  children,
  className = "",
}: {
  title: string;
  sub?: ReactNode;
  legend?: ReactNode;
  actions?: ReactNode;
  empty?: string | false;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-surface p-5 shadow-soft ${className}`} aria-label={title}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{title}</h3>
          {sub && <p className="text-xs text-primary/55">{sub}</p>}
        </div>
        {actions}
      </div>
      {legend && <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary/70">{legend}</div>}
      {empty ? <Empty text={empty} /> : children}
    </section>
  );
}

export function Empty({ text = EMPTY }: { text?: string }) {
  return (
    <div className="grid h-40 place-items-center rounded-chip border-2 border-dashed border-primary/12 text-sm text-primary/55" data-empty>
      {text}
    </div>
  );
}

export function LegendItem({ color, label, dashed = false, shape = "line" }: { color: string; label: string; dashed?: boolean; shape?: "line" | "box" | "band" }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {shape === "box" ? (
        <span className="size-3 rounded-[3px]" style={{ background: color }} />
      ) : shape === "band" ? (
        <span className="h-3 w-5 rounded-[3px]" style={{ background: color, opacity: 0.18 }} />
      ) : (
        <svg width="20" height="8" aria-hidden>
          <line x1="1" x2="19" y1="4" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} strokeLinecap="round" />
        </svg>
      )}
      {label}
    </span>
  );
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-max max-w-64 -translate-x-1/2 -translate-y-full rounded-chip bg-primary px-3 py-2 text-xs text-white shadow-lift"
      style={{ left: `${x}%`, top: `calc(${y}% - 10px)` }}
    >
      {children}
    </div>
  );
}

const niceMax = (v: number) => {
  const step = v > 600 ? 200 : v > 200 ? 100 : 50;
  return Math.max(step, Math.ceil(v / step) * step);
};

/* ---------------- line with min–max band ---------------- */

const W = 640;
const H = 240;
const P = { l: 44, r: 16, t: 16, b: 30 };

type BandPoint = { id: string; label: string; title: string; avg: number; min: number; max: number };

export function BandLine({ points }: { points: BandPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const yMax = niceMax(Math.max(...points.map((p) => p.max), 1));
  const x = (i: number) => (points.length === 1 ? (P.l + W - P.r) / 2 : P.l + (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v / yMax) * (H - P.t - P.b);
  const band = [...points.map((p, i) => `${x(i)},${y(p.max)}`), ...[...points].reverse().map((p, k) => `${x(points.length - 1 - k)},${y(p.min)}`)].join(" ");
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Class average per session: ${points.map((p) => `${p.label} ${Math.round(p.avg)}`).join(", ")}`}>
        <Grid yMax={yMax} y={y} />
        {points.length > 1 && <polygon points={band} fill={NAVY} opacity={0.1} />}
        {points.length > 1 && <polyline points={points.map((p, i) => `${x(i)},${y(p.avg)}`).join(" ")} fill="none" stroke={NAVY} strokeWidth={2} strokeLinejoin="round" />}
        {points.map((p, i) => (
          <g key={p.id}>
            {points.length === 1 && <line x1={x(i)} x2={x(i)} y1={y(p.min)} y2={y(p.max)} stroke={NAVY} strokeOpacity={0.25} strokeWidth={10} strokeLinecap="round" />}
            <circle cx={x(i)} cy={y(p.avg)} r={hover === i ? 6 : 4.5} fill={NAVY} stroke="white" strokeWidth={2} />
            <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-primary/55 text-[11px]">
              {p.label}
            </text>
          </g>
        ))}
        <HitZones n={points.length} x={x} setHover={setHover} />
      </svg>
      {h && (
        <Tooltip x={(x(hover!) / W) * 100} y={(y(h.max) / H) * 100}>
          <div className="font-bold">{h.title}</div>
          <div>
            Average <b>{Math.round(h.avg)}</b> · range {h.min}–{h.max}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* ---------------- two lines (student vs class) ---------------- */

type TwoPoint = { id: string; label: string; title: string; a: number | null; b: number };

export function TwoLines({ points, aLabel, bLabel }: { points: TwoPoint[]; aLabel: string; bLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const yMax = niceMax(Math.max(...points.map((p) => Math.max(p.a ?? 0, p.b)), 1));
  const x = (i: number) => (points.length === 1 ? (P.l + W - P.r) / 2 : P.l + (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - v / yMax) * (H - P.t - P.b);
  // the student line breaks at absences
  const segs: string[][] = [[]];
  points.forEach((p, i) => (p.a === null ? segs.push([]) : segs.at(-1)!.push(`${x(i)},${y(p.a)}`)));
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${aLabel} vs ${bLabel}`}>
        <Grid yMax={yMax} y={y} />
        <polyline points={points.map((p, i) => `${x(i)},${y(p.b)}`).join(" ")} fill="none" stroke="#6b7685" strokeWidth={2} strokeDasharray="5 4" />
        {segs.filter((s) => s.length > 1).map((s, k) => (
          <polyline key={k} points={s.join(" ")} fill="none" stroke={SERIES.blue} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {points.map((p, i) => (
          <g key={p.id}>
            {p.a !== null ? (
              <circle cx={x(i)} cy={y(p.a)} r={hover === i ? 6 : 4.5} fill={SERIES.blue} stroke="white" strokeWidth={2} />
            ) : (
              <text x={x(i)} y={y(0) - 6} textAnchor="middle" className="fill-primary/45 text-[10px] font-semibold">
                absent
              </text>
            )}
            <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-primary/55 text-[11px]">
              {p.label}
            </text>
          </g>
        ))}
        <HitZones n={points.length} x={x} setHover={setHover} />
      </svg>
      {h && (
        <Tooltip x={(x(hover!) / W) * 100} y={(y(Math.max(h.a ?? 0, h.b)) / H) * 100}>
          <div className="font-bold">{h.title}</div>
          <div>
            {aLabel}: <b>{h.a === null ? "absent" : h.a}</b> · {bLabel}: <b>{Math.round(h.b)}</b>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

function Grid({ yMax, y }: { yMax: number; y: (v: number) => number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((k) => {
        const v = (yMax / 4) * k;
        return (
          <g key={k}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-primary/8" />
            <text x={P.l - 8} y={y(v)} dy="0.35em" textAnchor="end" className="fill-primary/45 text-[11px] tabular-nums">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function HitZones({ n, x, setHover }: { n: number; x: (i: number) => number; setHover: (i: number | null) => void }) {
  const w = n > 1 ? (W - P.l - P.r) / (n - 1) : W;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} data-hit={i} x={x(i) - w / 2} y={0} width={w} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
      ))}
    </>
  );
}

/* ---------------- horizontal topic bars (optional class-average tick) ---------------- */

export function TopicBars({
  rows,
  color = NAVY,
  refLabel,
}: {
  rows: { topic: string; value: number | null; ref?: number | null; sessions: number }[];
  color?: string;
  refLabel?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.topic} className="relative" data-topic={r.topic} onMouseEnter={() => setHover(r.topic)} onMouseLeave={() => setHover(null)}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-semibold">{r.topic}</span>
            <span className="text-xs text-primary/50">{r.sessions ? `${r.sessions} session${r.sessions === 1 ? "" : "s"}` : "no sessions in range"}</span>
          </div>
          {r.value === null ? (
            <div className="h-3 rounded-full border border-dashed border-primary/15" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative h-3 flex-1 rounded-full bg-primary/8">
                <div className="absolute inset-y-0 left-0 rounded-[4px]" style={{ width: `${r.value * 100}%`, background: color }} />
                {r.ref != null && (
                  <span className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full bg-[#3d4653]" style={{ left: `${r.ref * 100}%` }} title={`${refLabel}: ${Math.round(r.ref * 100)}%`} />
                )}
              </div>
              <span className="w-10 text-right text-sm font-bold tabular-nums">{Math.round(r.value * 100)}%</span>
            </div>
          )}
          {hover === r.topic && r.value !== null && (
            <div role="tooltip" className="pointer-events-none absolute -top-8 right-0 z-10 rounded-chip bg-primary px-3 py-1.5 text-xs text-white shadow-lift">
              {r.topic}: {Math.round(r.value * 100)}%{r.ref != null && ` · ${refLabel} ${Math.round(r.ref * 100)}%`}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- histogram ---------------- */

export function Histogram({ values, bin = 50 }: { values: number[]; bin?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const lo = Math.floor(Math.min(...values, 0) / bin) * bin;
  const hi = Math.ceil((Math.max(...values, bin) + 1) / bin) * bin;
  const bins = Array.from({ length: Math.max(1, (hi - lo) / bin) }, (_, k) => ({ from: lo + k * bin, to: lo + (k + 1) * bin, n: 0 }));
  values.forEach((v) => bins[Math.min(bins.length - 1, Math.floor((v - lo) / bin))]!.n++);
  const top = Math.max(...bins.map((b) => b.n), 1);
  return (
    <div className="relative">
      <div className="flex h-44 items-end gap-[2px] border-b border-primary/15" role="img" aria-label={`Score distribution: ${bins.map((b) => `${b.from}–${b.to - 1}: ${b.n}`).join(", ")}`}>
        {bins.map((b, k) => (
          <div key={k} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)} data-bin={`${b.from}`}>
            {b.n > 0 && <span className="mb-0.5 text-center text-[10px] font-semibold tabular-nums text-primary/60">{b.n}</span>}
            <div className="rounded-t-[4px]" style={{ height: `${(b.n / top) * 85}%`, background: NAVY, opacity: hover === null || hover === k ? 1 : 0.55 }} />
            {hover === k && (
              <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max -translate-x-1/2 rounded-chip bg-primary px-2.5 py-1.5 text-xs text-white shadow-lift">
                {b.from}–{b.to - 1} pts: <b>{b.n}</b> student{b.n === 1 ? "" : "s"}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-primary/50">
        <span>{lo}</span>
        <span>score</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}

/* ---------------- stacked participation bars ---------------- */

export const PART_COLORS = { joined: SERIES.blue, absent: SERIES.orange, autofilled: SERIES.aqua };

export function StackedBars({ rows }: { rows: { id: string; label: string; title: string; joined: number; autofilled: number; absent: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = Math.max(...rows.map((r) => r.joined + r.autofilled + r.absent), 1);
  return (
    <div className="flex h-52 items-end gap-2" role="img" aria-label="Participation per session: joined, auto-filled, absent">
      {rows.map((r) => {
        const segs: [keyof typeof PART_COLORS, number][] = [
          ["joined", r.joined],
          ["autofilled", r.autofilled],
          ["absent", r.absent],
        ];
        return (
          <div key={r.id} className="relative flex h-full flex-1 flex-col" onMouseEnter={() => setHover(r.id)} onMouseLeave={() => setHover(null)} data-part={r.id}>
            <div className="flex flex-1 flex-col-reverse gap-[2px]">
              {segs.map(([k, n]) =>
                n ? (
                  <div
                    key={k}
                    className="grid min-h-4 place-items-center text-[10px] font-bold tabular-nums text-white first:rounded-b-[2px] last:rounded-t-[4px]"
                    style={{ height: `${(n / total) * 100}%`, background: PART_COLORS[k] }}
                  >
                    {n}
                  </div>
                ) : null,
              )}
            </div>
            <div className="mt-1 text-center text-[11px] text-primary/55">{r.label}</div>
            {hover === r.id && (
              <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max -translate-x-1/2 rounded-chip bg-primary px-3 py-2 text-xs text-white shadow-lift">
                <div className="font-bold">{r.title}</div>
                Joined {r.joined} · Auto-filled {r.autofilled} · Absent {r.absent}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- sparkline ---------------- */

export function Sparkline({ values, label }: { values: (number | null)[]; label: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <span className="text-xs text-primary/40">—</span>;
  const w = 84;
  const h = 24;
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const x = (i: number) => 2 + (i / (values.length - 1)) * (w - 4);
  const y = (v: number) => 3 + (1 - (v - lo) / Math.max(1, hi - lo)) * (h - 6);
  const segs: string[][] = [[]];
  values.forEach((v, i) => (v === null ? segs.push([]) : segs.at(-1)!.push(`${x(i)},${y(v)}`)));
  const lastI = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0).at(-1)!;
  return (
    <svg width={w} height={h} role="img" aria-label={label} className="overflow-visible">
      {segs.filter((s) => s.length > 1).map((s, k) => (
        <polyline key={k} points={s.join(" ")} fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      <circle cx={x(lastI)} cy={y(values[lastI]!)} r={2.5} fill={NAVY} />
    </svg>
  );
}

/* ---------------- heatmap (sequential, one hue) ---------------- */

export function Heatmap({
  rows,
  cols,
  cells,
  rowTitle,
  colTitle,
}: {
  rows: string[];
  cols: string[];
  cells: number[][];
  rowTitle: string;
  colTitle: string;
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const max = Math.max(...cells.flat(), 1);
  const steps = 5;
  const level = (v: number) => (v === 0 ? 0 : Math.ceil((v / max) * steps));
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-[2px] text-xs" aria-label={`${rowTitle} by ${colTitle}`}>
          <thead>
            <tr>
              <th className="px-2 text-left align-bottom text-[11px] font-bold uppercase tracking-wider text-primary/45">
                {rowTitle} ↓ · {colTitle} →
              </th>
              {cols.map((c, j) => (
                <th key={j} className="w-11 text-center font-mono font-bold text-primary/55" title={c}>
                  {j + 1}
                </th>
              ))}
              <th className="pl-2 text-left text-[11px] font-bold uppercase tracking-wider text-primary/45">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const total = cells[i]!.reduce((a, b) => a + b, 0);
              return (
                <tr key={i} data-heat-row={i + 1}>
                  <th className="max-w-64 truncate px-2 py-1 text-left font-mono font-normal text-primary/80" title={r}>
                    <span className="mr-1.5 font-bold text-primary/45">{i + 1}</span>
                    {r}
                  </th>
                  {cells[i]!.map((v, j) => {
                    const lv = level(v);
                    const diag = i === j;
                    return (
                      <td
                        key={j}
                        onMouseEnter={() => setHover([i, j])}
                        onMouseLeave={() => setHover(null)}
                        className={`relative h-9 w-11 rounded-[4px] text-center font-bold tabular-nums ${diag ? "bg-[repeating-linear-gradient(45deg,#eef1f5,#eef1f5_4px,#fff_4px,#fff_8px)]" : ""} ${lv >= 3 ? "text-white" : "text-primary/70"}`}
                        style={diag ? undefined : { background: lv ? `color-mix(in oklab, ${NAVY} ${lv * 18}%, white)` : "#f5f7fa" }}
                      >
                        {diag ? "" : v || ""}
                        {hover && hover[0] === i && hover[1] === j && !diag && (
                          <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-72 -translate-x-1/2 rounded-chip bg-primary px-3 py-2 text-left text-xs font-normal text-white shadow-lift">
                            <b>{v}</b> wrong drop{v === 1 ? "" : "s"} of step {j + 1}'s snippet onto step {i + 1}
                            <div className="text-white/70">“{cols[j]}” → “{r}”</div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="pl-2 font-bold tabular-nums">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-primary/55">
        fewer
        {Array.from({ length: steps }, (_, k) => (
          <span key={k} className="h-3 w-6 rounded-[3px]" style={{ background: `color-mix(in oklab, ${NAVY} ${(k + 1) * 18}%, white)` }} />
        ))}
        more wrong drops · striped = the right slot
      </div>
    </div>
  );
}
