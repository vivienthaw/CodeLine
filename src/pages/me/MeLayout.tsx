import type { ReactNode } from "react";
import { Button, Icon, Professor } from "../../components";
import { AccountMenu } from "../../components/AccountMenu";
import { useStore } from "../../mock/store";
import { Link, navigate, usePath } from "../../router";
import { Logo } from "../SignIn";

const TABS = [
  {
    to: "/me/sessions",
    label: "My Sessions",
    match: (p: string) => p === "/me" || p.startsWith("/me/sessions"),
  },
  { to: "/me/progress", label: "Progress", match: (p: string) => p.startsWith("/me/progress") },
  { to: "/me/rank", label: "Rank", match: (p: string) => p.startsWith("/me/rank") },
];

/**
 * Student home shell for /me/*: works on or off campus once signed in.
 * On campus it also offers the live session (/join); off campus it explains why that's missing.
 */
export function MeLayout({ children, hero = true }: { children: ReactNode; hero?: boolean }) {
  const path = usePath();
  const student = useStore((s) => s.student);
  const offCampus = useStore((s) => s.dev.offCampus);

  // access is checked in App (lib/auth); the student record is filled from the session
  if (!student) return null;

  return (
    <div className="min-h-screen bg-bg font-sans text-primary">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 shadow-soft backdrop-blur">
        {/* phones: logo + status/account on one row, tabs full-width below; md+: one row */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 pt-2 md:h-18 md:flex-nowrap md:gap-6 md:px-6 md:pt-0">
          <Link to="/me" aria-label="CodeLine home" className="[&_div.mt-1]:hidden md:[&_div.mt-1]:block">
            <Logo size="md" />
          </Link>
          <nav
            aria-label="Student"
            className="order-last -mx-4 mt-1 flex h-11 w-[calc(100%+2rem)] items-stretch border-t border-primary/8 md:order-none md:mx-0 md:ml-4 md:mt-0 md:h-full md:w-auto md:gap-1 md:border-0"
          >
            {TABS.map((t) => {
              const active = t.match(path);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 items-center justify-center border-b-[3px] px-3 text-[15px] font-semibold transition-colors md:flex-none ${
                    active
                      ? "border-accent text-primary"
                      : "border-transparent text-primary/55 hover:text-primary"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <CampusChip offCampus={offCampus} />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-5 md:px-6 md:pb-16 md:pt-8">
        {hero && <Hero name={student.name} offCampus={offCampus} />}
        {children}
      </main>
    </div>
  );
}

function CampusChip({ offCampus }: { offCampus: boolean }) {
  return offCampus ? (
    <span
      title="Off campus"
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2 py-1 text-xs font-semibold text-primary/70 sm:px-3"
    >
      <Icon name="wifiOff" size={14} /> <span className="sr-only sm:not-sr-only">Off campus</span>
    </span>
  ) : (
    <span
      title="On campus"
      className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-1 text-xs font-semibold text-[#1E7B4F] sm:px-3"
    >
      <span aria-hidden className="size-2 rounded-full bg-success" /> <span className="sr-only sm:not-sr-only">On campus</span>
    </span>
  );
}

function Hero({ name, offCampus }: { name: string; offCampus: boolean }) {
  return (
    <section className="mb-6 grid grid-cols-1 items-stretch gap-4 md:mb-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">
      <div className="flex items-center gap-4 sm:gap-5">
        <Professor className="h-16 shrink-0 sm:h-24" mood="idle" />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-[28px]">Hi, {name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-primary/65 sm:text-base">
            Look back at past rounds, see how you're improving, and check the leaderboard. Reviews
            stay open for 30 days.
          </p>
        </div>
      </div>
      {offCampus ? (
        <div className="flex items-start gap-3 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/8 text-primary/60">
            <Icon name="wifiOff" size={20} />
          </span>
          <div>
            <div className="font-bold">Live sessions are on campus only</div>
            <p className="mt-1 text-sm text-primary/60">
              Join the university Wi-Fi in class to play. Reviews, progress and rank work from
              anywhere.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-card bg-primary p-5 text-white shadow-lift">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-white/60">
              In class now?
            </div>
            <div className="mt-1 text-lg font-extrabold">Join live session</div>
            <p className="text-sm text-white/70">Enter the code on the projector.</p>
          </div>
          <Button
            variant="secondary"
            className="shrink-0 border-white! bg-white! text-primary!"
            onClick={() => navigate("/join")}
          >
            Join →
          </Button>
        </div>
      )}
    </section>
  );
}

/** Placeholder for tabs that later steps fill in. */
export function NotBuiltYet({ title, step }: { title: string; step: number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-primary/15 bg-surface/60 py-16 text-center">
      <div className="text-lg font-bold">{title}</div>
      <p className="text-sm text-primary/60">Built in review step {step}.</p>
    </div>
  );
}
