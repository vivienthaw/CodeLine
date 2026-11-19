import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

/** Centered dialog with backdrop. Esc / backdrop click close it; focus moves into it and returns on close. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // focus the first footer button (usually the safe choice) or the panel
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      // keep Tab inside the dialog
      if (e.key === "Tab" && panel) {
        const items = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!items.length) return;
        const firstEl = items[0]!;
        const lastEl = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-4xl" : "max-w-2xl";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="presentation">
      <div className="absolute inset-0 bg-primary/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={`cl-anim-toast relative flex max-h-[calc(100vh-3rem)] w-full flex-col rounded-card bg-surface shadow-lift outline-none ${width}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-4">
          <h2 className="text-lg font-extrabold text-primary">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid size-9 shrink-0 cursor-pointer place-items-center rounded-chip text-primary/60 hover:bg-primary/5 hover:text-primary"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-primary">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-primary/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
