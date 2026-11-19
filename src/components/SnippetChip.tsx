import { useEffect, useRef, type HTMLAttributes } from "react";
import { Icon } from "./icons";

export type ChipState = "default" | "dragging" | "locked" | "wrong" | "autofilled" | "selected";

const stateClass: Record<ChipState, string> = {
  default: "bg-surface border-primary hover:shadow-soft",
  dragging: "bg-surface border-primary scale-[1.03] shadow-lift z-10",
  locked: "bg-success/10 border-success text-primary",
  wrong: "bg-surface border-danger cl-anim-shake",
  autofilled: "bg-muted/15 border-muted text-primary/60 italic",
  selected: "bg-surface border-primary outline-3 outline-accent outline-offset-2",
};

export function SnippetChip({
  code,
  state = "default",
  onWrongDone,
  className = "",
  ...rest
}: {
  /** 1–2 lines of Java. */
  code: string;
  state?: ChipState;
  /** Fires after the 400ms wrong-shake so the parent can send the chip home. */
  onWrongDone?: () => void;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className">) {
  const interactive = state !== "locked" && state !== "autofilled";

  // keep the latest callback without restarting the timer on every parent render
  const doneRef = useRef(onWrongDone);
  doneRef.current = onWrongDone;
  useEffect(() => {
    if (state !== "wrong") return;
    const t = setTimeout(() => doneRef.current?.(), 420);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={state === "selected" || undefined}
      aria-disabled={!interactive || undefined}
      className={`relative flex min-h-11 select-none items-center gap-2 rounded-chip border-2 px-2.5 py-2 transition-[transform,box-shadow,background-color] duration-150 ${stateClass[state]} ${
        interactive ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      } ${className}`}
      {...rest}
    >
      {interactive ? (
        <span className="shrink-0 text-muted" aria-hidden>
          <Icon name="grip" size={16} />
        </span>
      ) : state === "locked" ? (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-white">
          <Icon name="check" size={13} strokeWidth={3} />
        </span>
      ) : null}

      <code className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[13px] leading-snug text-primary">
        {code}
      </code>

      {state === "autofilled" && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-sans text-[11px] font-semibold not-italic text-white">
          Auto-filled
        </span>
      )}
      {state === "wrong" && (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger text-white">
          <Icon name="x" size={12} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
