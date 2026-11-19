import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Professor } from "./Professor";

export type BossState = "idle" | "hit" | "heal" | "defeated";
export type BossSize = "sm" | "md" | "lg";

type Float = { id: number; text: string; kind: "hit" | "heal" };

const sizes: Record<
  BossSize,
  { card: string; art: string; bar: string; label: string; float: string }
> = {
  sm: { card: "p-3 gap-2 w-64", art: "h-20", bar: "h-2.5", label: "text-xs", float: "text-xl" },
  md: { card: "p-5 gap-3 w-full max-w-sm", art: "h-36", bar: "h-3.5", label: "text-sm", float: "text-3xl" },
  lg: { card: "p-6 gap-4 w-full max-w-5xl", art: "h-48", bar: "h-8", label: "text-[28px]", float: "text-7xl" },
};

const CONFETTI_COLORS = ["#F28C28", "#2EAD6B", "#1B365D", "#E5484D", "#F5C542"];

export function hpColorClass(hp: number) {
  if (hp < 20) return "cl-anim-hp-flash bg-danger";
  if (hp <= 50) return "bg-accent";
  return "bg-danger";
}

export function BossCard({
  hp,
  size = "md",
  state = "idle",
  damage = 500,
  healAmount = 5,
  trigger = 0,
  className = "",
  artClassName,
}: {
  /** 0–100 */
  hp: number;
  size?: BossSize;
  state?: BossState;
  /** Shown in the floating "-N" on hit (e.g. 500 or "18%"). */
  damage?: number | string;
  /** Percent shown in the floating "+N HP" on heal. */
  healAmount?: number;
  /** Bump to replay the hit/heal animation while state stays the same. */
  trigger?: number;
  className?: string;
  /** Override the doodle's size (e.g. shorter on phones). */
  artClassName?: string;
}) {
  const s = sizes[size];
  const clamped = Math.max(0, Math.min(100, hp));
  const [floats, setFloats] = useState<Float[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    if (state !== "hit" && state !== "heal") return;
    const id = nextId.current++;
    setAnimKey((k) => k + 1);
    setFloats((f) => [
      ...f,
      { id, kind: state, text: state === "hit" ? `-${damage}` : `+${healAmount} HP` },
    ]);
    const t = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 850);
    return () => clearTimeout(t);
  }, [state, trigger, damage, healAmount]);

  const defeated = state === "defeated";

  return (
    <div
      className={`relative flex flex-col items-center rounded-card bg-surface shadow-soft ${s.card} ${className}`}
    >
      {/* red flash overlay on hit */}
      {state === "hit" && (
        <div
          key={`flash-${animKey}`}
          className="cl-anim-flash pointer-events-none absolute inset-0 rounded-card bg-danger"
        />
      )}

      <div className="relative flex w-full justify-center">
        <div
          key={`art-${animKey}-${state}`}
          className={
            state === "hit" ? "cl-anim-boss-shake" : defeated ? "cl-anim-tip" : ""
          }
        >
          <Professor mood={state} className={artClassName ?? s.art} />
        </div>

        {floats.map((f) => (
          <span
            key={f.id}
            className={`cl-anim-float pointer-events-none absolute left-1/2 top-1/4 font-mono font-bold ${s.float} ${
              f.kind === "hit" ? "text-danger" : "text-success"
            }`}
          >
            {f.text}
          </span>
        ))}

        {defeated && <Confetti />}
      </div>

      <div className="w-full">
        <div className={`mb-1 flex items-baseline justify-between font-bold text-primary ${s.label}`}>
          <span className="tracking-[0.18em]">PROFESSOR</span>
          <span className="font-mono">{defeated ? "0%" : `${Math.round(clamped)}%`}</span>
        </div>
        <div
          className={`w-full overflow-hidden rounded-full bg-primary/10 ${s.bar}`}
          role="progressbar"
          aria-label="Professor HP"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
        >
          <div
            className={`cl-hp-fill h-full rounded-full ${hpColorClass(clamped)}`}
            style={{ width: `${defeated ? 0 : clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const dist = 80 + ((i * 37) % 70);
    return {
      i,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist + 40}px`,
      rot: `${(i * 97) % 360}deg`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    };
  });
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="cl-anim-confetti absolute block h-2.5 w-1.5 rounded-sm"
          style={
            {
              background: p.color,
              "--dx": p.dx,
              "--dy": p.dy,
              "--rot": p.rot,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
