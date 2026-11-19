import { useEffect, useRef, useState } from "react";
import { signOut, useAuth } from "../lib/auth";
import { navigate } from "../router";
import { Icon } from "./icons";
import { Avatar } from "./TopBar";

/** Top-right avatar menu: who you are, your role, and Sign out. */
export function AccountMenu() {
  const s = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!s) return null;
  const badge = s.role === "student" ? "Student" : (s.staffTitle ?? "Lecturer");

  return (
    <div ref={root} className="relative" data-account-menu>
      <button
        ref={button}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${s.name}`}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-primary/6"
      >
        <Avatar name={s.name.replace(/^Dr\.\s*/, "")} size={34} />
        <span className="hidden text-sm font-semibold sm:inline">{s.name}</span>
        <Icon name="chevron" size={15} className={`text-primary/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="cl-anim-toast absolute right-0 top-full z-50 mt-2 w-64 rounded-card bg-surface p-2 text-primary shadow-lift ring-1 ring-primary/10">
          <div className="px-3 py-2">
            <div className="font-bold">{s.name}</div>
            <div className="truncate text-xs text-primary/55">{s.email}</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                data-role-badge
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.role === "student" ? "bg-primary/10 text-primary" : "bg-accent text-white"}`}
              >
                {badge}
              </span>
              {s.studentId && <span className="font-mono text-[11px] text-primary/50">{s.studentId}</span>}
            </div>
          </div>
          <div className="my-1 h-px bg-primary/10" />
          <button
            role="menuitem"
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-chip px-3 py-2 text-left text-sm font-semibold hover:bg-primary/6"
          >
            <SignOutIcon /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const SignOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
  </svg>
);
