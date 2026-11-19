import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";

export type ToastKind = "correct" | "wrong";
type ToastItem = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const MAX_TOASTS = 2;
const HIDE_AFTER_MS = 2000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }].slice(-MAX_TOASTS));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), HIDE_AFTER_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <Toast key={t.id} kind={t.kind} message={t.message} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Toast({ kind, message }: { kind: ToastKind; message: string }) {
  return (
    <div
      role="status"
      className={`cl-anim-toast flex items-center gap-2 rounded-chip px-4 py-2.5 font-semibold text-white shadow-lift ${
        kind === "correct" ? "bg-success" : "bg-danger"
      }`}
    >
      <Icon name={kind === "correct" ? "check" : "x"} size={18} strokeWidth={3} />
      {message}
    </div>
  );
}
