import { useState, type ReactNode } from "react";
import { Avatar, Button, Icon, Modal, Professor } from "../components";
import { DEMO_ACCOUNTS, landingPath, signInAs, type DemoAccount } from "../lib/auth";
import { getState, useStore } from "../mock/store";
import { navigate } from "../router";

export function AuthLayout({ children, topRight }: { children: ReactNode; topRight?: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-8 font-sans text-primary sm:py-16">
      {/* phones: account chip sits above the card; tablet/desktop: top-right corner */}
      {topRight && <div className="mb-4 flex w-full max-w-[480px] justify-end md:absolute md:right-8 md:top-6 md:mb-0 md:w-auto">{topRight}</div>}
      {children}
    </div>
  );
}

export function Logo({ size = "lg" }: { size?: "md" | "lg" }) {
  return (
    <div className="text-center">
      <div className={`font-extrabold tracking-tight ${size === "lg" ? "text-4xl" : "text-2xl"}`}>
        <span className="mr-1.5 rounded-chip bg-primary px-2 py-0.5 align-middle font-mono text-[0.6em] text-white">
          &lt;/&gt;
        </span>
        Code<span className="text-accent">Line</span>
      </div>
      <div className="mt-1 text-sm font-medium text-primary/60">The Class vs The Professor</div>
    </div>
  );
}

/** Mockup sign-in: one button, then pick a demo account. No real SIT login, no rules. */
export default function SignIn() {
  const offCampus = useStore((s) => s.dev.offCampus);
  const [open, setOpen] = useState(false);

  const pick = (who: DemoAccount) => {
    setOpen(false);
    navigate(landingPath(signInAs(who), getState().dev.offCampus));
  };

  return (
    <AuthLayout>
      <div className="relative w-full max-w-[480px]">
        {/* professor peeks from the right edge, pointer stick over the card */}
        <Professor
          className="pointer-events-none absolute -right-36 -top-10 hidden h-56 -scale-x-100 md:block"
          tapping={!offCampus}
          mood={offCampus ? "heal" : "idle"}
        />

        <div className="relative rounded-card bg-surface p-6 shadow-soft sm:p-10">
          <Logo />

          <Button
            fullWidth
            className="mt-8"
            icon={<Icon name="mail" />}
            onClick={() => setOpen(true)}
          >
            Sign in with SIT email
          </Button>

          <p className="mt-8 text-center text-xs text-primary/50" data-signin-footer>
            Live sessions on campus · reviews from anywhere
          </p>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={
          <span className="flex items-center gap-3" data-sso-title>
            <span
              className="grid size-10 place-items-center rounded-chip bg-[#0F1E33] font-serif text-sm font-bold text-white"
              aria-hidden
            >
              SIT
            </span>
            <span className="leading-tight">
              <span className="block text-base">Demo sign-in</span>
              <span className="block text-xs font-semibold text-primary/50">
                Choose an account to view
              </span>
            </span>
          </span>
        }
      >
        <p className="mb-3 rounded-chip bg-bg px-3 py-2 text-xs text-primary/60">
          This is a mockup: there is no real SIT login and no password. Nothing you do is saved.
        </p>
        <ul className="flex flex-col gap-2">
          {(Object.keys(DEMO_ACCOUNTS) as DemoAccount[]).map((who, i) => {
            const a = DEMO_ACCOUNTS[who];
            return (
              <li key={who}>
                <button
                  onClick={() => pick(who)}
                  {...(i === 0 ? { "data-autofocus": true } : {})}
                  data-demo-account={who}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-chip border-2 border-primary/12 px-3 py-2.5 text-left hover:border-primary/40 hover:bg-bg/60"
                >
                  <Avatar name={a.name.replace(/^Dr\.\s*/, "")} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{a.name}</span>
                    <span className="block truncate text-xs text-primary/55">{a.email}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${a.role === "student" ? "bg-primary/10 text-primary" : "bg-accent text-white"}`}
                  >
                    {a.role === "student" ? "Student" : a.staffTitle}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </AuthLayout>
  );
}
