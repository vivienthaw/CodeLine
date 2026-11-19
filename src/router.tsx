import { useEffect, useRef, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

/** Minimal pushState router — no dependency needed for a small prototype. */

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, ""); // "" or "/some/prefix"

/**
 * Memory mode (VITE_ROUTER=memory) keeps the route in memory instead of the URL — for hosts
 * that serve the app from a fixed address and don't allow path changes (e.g. a claude.ai Artifact).
 */
const MEMORY = import.meta.env.VITE_ROUTER === "memory";
let memoryUrl = "/";

/** The query string of the current route ("?email=…" or ""). */
export function currentSearch() {
  if (!MEMORY) return window.location.search;
  const i = memoryUrl.indexOf("?");
  return i < 0 ? "" : memoryUrl.slice(i);
}

function currentPath() {
  if (MEMORY) return memoryUrl.split("?")[0]!.replace(/\/+$/, "") || "/";
  let p = window.location.pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  p = p.replace(/\/+$/, "");
  return p || "/";
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/* ---------- navigation guard (unsaved changes) ---------- */

/** Return true to allow leaving for `to`, false to block (the guard shows its own UI). */
type Guard = (to: string) => boolean;
let guard: Guard | null = null;
let shownPath = currentPath();

if (!MEMORY) window.addEventListener("popstate", () => {
  const to = currentPath();
  if (guard && to !== shownPath && !guard(to)) {
    // undo the browser's back/forward so the URL keeps matching the screen
    window.history.pushState(null, "", BASE + shownPath);
    return;
  }
  shownPath = to;
  notify();
});

/** Block in-app navigation while `when` is true; `onBlock(to)` is called instead. Also warns on reload/close. */
export function useNavigationGuard(when: boolean, onBlock: (to: string) => void) {
  const onBlockRef = useRef(onBlock);
  onBlockRef.current = onBlock;
  useEffect(() => {
    if (!when) return;
    const g: Guard = (to) => {
      onBlockRef.current(to);
      return false;
    };
    guard = g;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      if (guard === g) guard = null;
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [when]);
}

/* ---------- api ---------- */

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePath() {
  return useSyncExternalStore(subscribe, currentPath);
}

/** `force` skips the unsaved-changes guard (e.g. "Leave without saving"). */
export function navigate(to: string, { replace = false, force = false } = {}) {
  if (!force && guard && to !== shownPath && !guard(to)) return;
  const url = BASE + (to.startsWith("/") ? to : `/${to}`);
  if (MEMORY) memoryUrl = to.startsWith("/") ? to : `/${to}`;
  else if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  shownPath = currentPath();
  window.scrollTo(0, 0);
  notify();
}

export function Link({
  to,
  onClick,
  ...rest
}: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={MEMORY ? "#" : BASE + to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
