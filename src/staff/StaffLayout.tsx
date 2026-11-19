import type { ReactNode } from "react";
import { Icon, type IconName } from "../components";
import { AccountMenu } from "../components/AccountMenu";
import { Link, usePath } from "../router";

type NavItem = { label: string; icon: IconName; to?: string; match?: (path: string) => boolean };

const NAV: NavItem[] = [
  {
    label: "Question Bank",
    icon: "library",
    to: "/staff/questions",
    match: (p) => p.startsWith("/staff/questions"),
  },
  {
    label: "Sessions",
    icon: "calendar",
    to: "/staff/sessions",
    match: (p) => p.startsWith("/staff/sessions"),
  },
  {
    label: "Reports",
    icon: "chart",
    to: "/staff/reports",
    match: (p) => p.startsWith("/staff/reports"),
  },
];

/** Staff shell: 240px navy sidebar + scrollable content area. Desktop-first (1440×900). */
export function StaffLayout({ children }: { children: ReactNode }) {
  const path = usePath();

  return (
    <div className="flex min-h-screen min-w-[1180px] bg-bg font-sans text-primary">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-primary text-white">
        {/* logo */}
        <Link to="/staff/questions" className="flex items-center gap-2.5 px-6 pb-6 pt-7">
          <span className="rounded-chip bg-white/15 px-2 py-0.5 font-mono text-sm font-bold">
            &lt;/&gt;
          </span>
          <span className="text-2xl font-extrabold tracking-tight">
            Code<span className="text-accent">Line</span>
          </span>
        </Link>
        <div className="px-6 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
          Staff
        </div>

        {/* nav */}
        <nav className="flex flex-col gap-1 px-3" aria-label="Staff">
          {NAV.map((item) => {
            const active = item.match?.(path) ?? false;
            const base =
              "flex min-h-11 items-center gap-3 rounded-chip px-3 text-[15px] font-semibold transition-colors";
            if (!item.to) {
              return (
                <span
                  key={item.label}
                  aria-disabled
                  title="Coming soon"
                  className={`${base} cursor-not-allowed text-white/35`}
                >
                  <Icon name={item.icon} size={19} />
                  {item.label}
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Soon
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`${base} ${
                  active
                    ? "bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-accent)]"
                    : "text-white/75 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon name={item.icon} size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="ml-60 min-w-0 flex-1">
        {/* top bar: account menu (name, Lecturer/TA badge, Sign out) */}
        <div className="flex h-14 items-center justify-end border-b border-primary/8 bg-surface px-10 print:hidden">
          <AccountMenu />
        </div>
        {children}
      </main>
    </div>
  );
}

/** Page header used by every staff screen: title + optional subtitle + right-side actions. */
export function StaffHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-6 px-10 pb-6 pt-9">
      <div>
        <h1 className="text-[28px] font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-primary/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}
