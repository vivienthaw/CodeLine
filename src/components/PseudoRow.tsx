import type { HTMLAttributes, ReactNode } from "react";

export type SlotState = "empty" | "hover" | "filled" | "autofilled";

const slotClass: Record<SlotState, string> = {
  empty: "border-2 border-dashed border-muted/70 bg-bg text-muted",
  hover: "border-2 border-dashed border-accent bg-accent/10 text-accent",
  filled: "border-2 border-transparent",
  autofilled: "border-2 border-transparent",
};

export function DropSlot({
  state = "empty",
  children,
  caption,
  slotId,
  className = "w-full",
  ...rest
}: {
  state?: SlotState;
  /** Rendered as data-slot for pointer hit-testing during drags. */
  slotId?: number;
  /** The chip shown when filled / autofilled. */
  children?: ReactNode;
  /** Small line under the chip, e.g. classmate name. */
  caption?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  const empty = state === "empty" || state === "hover";
  return (
    <div className={className}>
      <div
        data-slot={slotId}
        className={`flex min-h-12 items-center justify-center rounded-chip transition-colors duration-150 ${slotClass[state]}`}
        {...rest}
      >
        {empty ? (
          <span className="pointer-events-none text-sm font-medium">Drop code here</span>
        ) : (
          <div className="cl-anim-snap w-full">{children}</div>
        )}
      </div>
      {caption && !empty && <div className="mt-1 pl-1 text-xs text-primary/60">{caption}</div>}
    </div>
  );
}

export function PseudoRow({
  lineNo,
  text,
  slotState = "empty",
  chip,
  caption,
  slotWidth = "w-full sm:w-[340px]",
  slotProps,
  highlight = false,
  className = "",
}: {
  lineNo: number;
  /** Tint the row (e.g. a row the current student can still fill). */
  highlight?: boolean;
  text: string;
  slotState?: SlotState;
  chip?: ReactNode;
  caption?: ReactNode;
  /** Tailwind width class — keep it equal to the chip width. */
  slotWidth?: string;
  slotProps?: Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-stretch gap-2 rounded-card border bg-surface px-3 py-2.5 transition-colors sm:flex-row sm:items-start sm:gap-4 sm:px-4 sm:py-3 ${
        highlight ? "border-accent/50" : "border-primary/10"
      } ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 font-mono text-[13px] text-primary sm:min-h-12 sm:text-[14px]">
        <span className="w-6 shrink-0 text-right text-muted">{lineNo}</span>
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
      <DropSlot
        state={slotState}
        caption={caption}
        slotId={lineNo}
        className={`shrink-0 ${slotWidth}`}
        {...slotProps}
      >
        {chip}
      </DropSlot>
    </div>
  );
}
