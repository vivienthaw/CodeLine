import { useEffect, useState, type ReactNode } from "react";
import {
  BossCard,
  Button,
  CodeInput,
  Icon,
  Input,
  Professor,
  PseudoRow,
  SnippetChip,
  ToastProvider,
  TopBar,
  useToast,
  type BossSize,
  type BossState,
  type ChipState,
  type SlotState,
} from "../components";

const TOKENS = [
  { name: "primary", hex: "#1B365D", use: "nav, headings, primary buttons" },
  { name: "accent", hex: "#F28C28", use: "boss, drag arrows, hover slot" },
  { name: "success", hex: "#2EAD6B", use: "correct / locked" },
  { name: "danger", hex: "#E5484D", use: "wrong / penalty / low HP" },
  { name: "muted", hex: "#9AA4B2", use: "auto-filled, disabled" },
  { name: "bg", hex: "#F5F7FA", use: "page background" },
  { name: "surface", hex: "#FFFFFF", use: "cards" },
];

export default function ComponentsDemo() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg font-sans text-primary">
        <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
            <div>
              <div className="text-xl font-extrabold">
                Code<span className="text-accent">Line</span>{" "}
                <span className="font-medium text-primary/50">· Components</span>
              </div>
              <div className="text-sm text-primary/60">The Class vs The Professor — UI kit (§0–§1)</div>
            </div>
            <nav className="flex gap-1 text-sm font-semibold">
              {["tokens", "boss", "chips", "rows", "topbar", "toast", "controls"].map((id) => (
                <a key={id} href={`#${id}`} className="rounded-chip px-3 py-2 capitalize hover:bg-primary/5">
                  {id}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col gap-10 px-8 py-10">
          <TokensSection />
          <BossSection />
          <ChipsSection />
          <RowsSection />
          <TopBarSection />
          <ToastSection />
          <ControlsSection />
        </main>
      </div>
    </ToastProvider>
  );
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {note && <p className="mt-1 text-sm text-primary/60">{note}</p>}
      <div className="mt-4 rounded-card bg-surface p-6 shadow-soft">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary/50">{children}</div>;
}

/* ---------------- tokens ---------------- */
function TokensSection() {
  return (
    <Section id="tokens" title="Design tokens">
      <div className="grid grid-cols-7 gap-3">
        {TOKENS.map((t) => (
          <div key={t.name}>
            <div className="h-16 rounded-card border border-primary/10" style={{ background: t.hex }} />
            <div className="mt-2 text-sm font-bold">{t.name}</div>
            <div className="font-mono text-xs text-primary/60">{t.hex}</div>
            <div className="text-xs text-primary/50">{t.use}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-6">
        <div>
          <Label>Inter — UI</Label>
          <div className="text-3xl font-extrabold">The Class vs The Professor</div>
          <div className="text-base">Drag your code to the matching pseudocode step</div>
        </div>
        <div>
          <Label>JetBrains Mono — code</Label>
          <pre className="font-mono text-sm leading-relaxed">
            {"for (int i = 1; i <= n; i++) {\n  if (i % 2 == 0) sum += i;\n}"}
          </pre>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <Label>Card · 12px</Label>
            <div className="size-20 rounded-card bg-surface shadow-soft ring-1 ring-primary/5" />
          </div>
          <div>
            <Label>Chip · 8px</Label>
            <div className="h-11 w-24 rounded-chip border-2 border-primary bg-surface" />
          </div>
          <div>
            <Label>Doodle</Label>
            <Professor className="h-24" tapping />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- boss ---------------- */
function BossSection() {
  const [hp, setHp] = useState(100);
  const [state, setState] = useState<BossState>("idle");
  const [size, setSize] = useState<BossSize>("md");
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (state !== "hit" && state !== "heal") return;
    const t = setTimeout(() => setState("idle"), 900);
    return () => clearTimeout(t);
  }, [state, trigger]);

  const hit = () => {
    setHp((h) => Math.max(0, h - 12.5));
    setState("hit");
    setTrigger((n) => n + 1);
  };
  const heal = () => {
    setHp((h) => Math.min(100, h + 5));
    setState("heal");
    setTrigger((n) => n + 1);
  };

  return (
    <Section
      id="boss"
      title="BossCard"
      note="HP bar: >50% danger · 20–50% orange · <20% flashing red. Hit = shake + red flash + −500 float; heal = +HP float + wider grin."
    >
      <div className="flex gap-8">
        <div className="flex w-72 shrink-0 flex-col gap-4">
          <div>
            <Label>HP · {Math.round(hp)}%</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={hp}
              onChange={(e) => setHp(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={hit} disabled={state === "defeated"}>Hit −500</Button>
            <Button variant="secondary" onClick={heal} disabled={state === "defeated"}>Heal</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setHp(0);
                setState("defeated");
              }}
            >
              Defeat
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setHp(100);
                setState("idle");
              }}
            >
              Reset
            </Button>
          </div>
          <div>
            <Label>Size</Label>
            <Segmented options={["sm", "md", "lg"] as const} value={size} onChange={setSize} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setHp(35)}>Set 35%</Button>
            <Button variant="ghost" onClick={() => setHp(12)}>Set 12%</Button>
          </div>
        </div>
        <div className="flex min-h-80 flex-1 items-center justify-center rounded-card bg-bg p-6">
          <BossCard hp={hp} size={size} state={state} trigger={trigger} />
        </div>
      </div>
    </Section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-chip border-2 border-primary/15 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`min-h-10 min-w-12 cursor-pointer rounded-[6px] px-3 text-sm font-semibold ${
            value === o ? "bg-primary text-white" : "text-primary hover:bg-primary/5"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ---------------- chips ---------------- */
const CHIP_STATES: ChipState[] = ["default", "dragging", "locked", "wrong", "autofilled", "selected"];

function ChipsSection() {
  const [wrongKey, setWrongKey] = useState(0);
  return (
    <Section id="chips" title="SnippetChip" note="Monospace code, ⋮⋮ handle. Click the wrong chip to replay its shake.">
      <div className="grid grid-cols-3 gap-6">
        {CHIP_STATES.map((s) => (
          <div key={s}>
            <Label>{s}</Label>
            <div className="relative">
              {s === "dragging" && (
                <SnippetChip code={"if (i % 2 == 0)"} className="absolute inset-0 opacity-80" aria-hidden />
              )}
              <SnippetChip
                key={s === "wrong" ? wrongKey : s}
                code={s === "locked" ? "sum += i;" : "if (i % 2 == 0)"}
                state={s}
                onClick={s === "wrong" ? () => setWrongKey((k) => k + 1) : undefined}
                className={s === "dragging" ? "-translate-y-1 rotate-1" : ""}
              />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- rows + mini sandbox ---------------- */
const SANDBOX_ROWS = [
  { line: 3, text: "FOR i FROM 1 TO N" },
  { line: 4, text: "  IF i IS EVEN" },
  { line: 5, text: "    ADD i TO sum" },
];
const SANDBOX_ANSWER = 4;
const SANDBOX_CODE = "if (i % 2 == 0) {";

function RowsSection() {
  const toast = useToast();
  const [chip, setChip] = useState<ChipState>("default");
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [placed, setPlaced] = useState(false);
  const [hp, setHp] = useState(60);
  const [boss, setBoss] = useState<BossState>("idle");
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (boss !== "hit" && boss !== "heal") return;
    const t = setTimeout(() => setBoss("idle"), 900);
    return () => clearTimeout(t);
  }, [boss, trigger]);

  const drop = (line: number) => {
    setHoverLine(null);
    if (placed) return;
    setTrigger((n) => n + 1);
    if (line === SANDBOX_ANSWER) {
      setPlaced(true);
      setChip("locked");
      setHp((h) => Math.max(0, h - 12.5));
      setBoss("hit");
      toast("correct", "+100 pts · +35 speed bonus");
    } else {
      setChip("wrong");
      setHp((h) => Math.min(100, h + 3));
      setBoss("heal");
      toast("wrong", "−10 pts · try again");
    }
  };

  const reset = () => {
    setPlaced(false);
    setChip("default");
    setHp(60);
    setBoss("idle");
  };

  const slotState = (line: number): SlotState =>
    placed && line === SANDBOX_ANSWER ? "filled" : hoverLine === line ? "hover" : "empty";

  return (
    <Section
      id="rows"
      title="PseudoRow + DropSlot"
      note="Static slot states, then a live sandbox: drag the chip (or tap it, then tap a slot). Correct answer is line 4."
    >
      <div className="flex flex-col gap-2">
        <PseudoRow
          lineNo={1}
          text="SET sum TO 0"
          slotState="filled"
          chip={<SnippetChip code="int sum = 0;" state="locked" />}
          caption="placed by Mai"
        />
        <PseudoRow lineNo={2} text="READ N" slotState="empty" />
        <PseudoRow lineNo={3} text="FOR i FROM 1 TO N" slotState="hover" />
        <PseudoRow
          lineNo={6}
          text="  END IF"
          slotState="autofilled"
          chip={<SnippetChip code="}" state="autofilled" />}
          caption="Auto-filled (absent)"
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Label>Sandbox</Label>
        <Button variant="ghost" onClick={reset}>Reset sandbox</Button>
      </div>
      <div className="grid grid-cols-[300px_1fr] gap-6">
        <div className="flex flex-col gap-4">
          <BossCard hp={hp} size="sm" state={boss} trigger={trigger} className="w-full!" />
          <div className="rounded-card border border-primary/10 bg-bg p-4">
            <div className="mb-2 text-sm font-bold">{placed ? "✓ Your line is placed!" : "Your clipped code"}</div>
            {placed ? (
              <SnippetChip code={SANDBOX_CODE} state="locked" />
            ) : (
              <SnippetChip
                code={SANDBOX_CODE}
                state={chip}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", "chip");
                  // let the browser snapshot the default look before lifting
                  requestAnimationFrame(() => setChip("dragging"));
                }}
                onDragEnd={() => {
                  setHoverLine(null);
                  setChip((c) => (c === "dragging" ? "default" : c));
                }}
                onClick={() => setChip((c) => (c === "selected" ? "default" : "selected"))}
                onWrongDone={() => setChip("default")}
              />
            )}
            <p className="mt-2 text-xs text-primary/60">Drag your code to the matching pseudocode step</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {SANDBOX_ROWS.map((r) => (
            <PseudoRow
              key={r.line}
              lineNo={r.line}
              text={r.text}
              slotState={slotState(r.line)}
              chip={<SnippetChip code={SANDBOX_CODE} state="locked" />}
              caption={placed && r.line === SANDBOX_ANSWER ? "you" : undefined}
              slotProps={{
                onDragOver: (e) => {
                  if (placed) return;
                  e.preventDefault();
                  if (hoverLine !== r.line) setHoverLine(r.line);
                },
                onDragLeave: () => setHoverLine((h) => (h === r.line ? null : h)),
                onDrop: (e) => {
                  e.preventDefault();
                  drop(r.line);
                },
                onClick: () => {
                  if (chip === "selected") drop(r.line);
                },
              }}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------- top bar ---------------- */
function TopBarSection() {
  const [seconds, setSeconds] = useState(300);
  const [running, setRunning] = useState(false);
  const [placed, setPlaced] = useState(12);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);

  return (
    <Section id="topbar" title="TopBar" note="Timer turns red and pulses under 0:30.">
      <div className="overflow-hidden rounded-card border border-primary/10">
        <TopBar roundLabel="Round 1 · CodeLine" seconds={seconds} score={240} placed={placed} total={20} name="Vivi" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"} timer
        </Button>
        <Button variant="ghost" onClick={() => setSeconds(300)}>5:00</Button>
        <Button variant="ghost" onClick={() => setSeconds(35)}>0:35</Button>
        <Button variant="ghost" onClick={() => setPlaced((p) => Math.min(20, p + 1))}>+1 line</Button>
      </div>
    </Section>
  );
}

/* ---------------- toast ---------------- */
function ToastSection() {
  const toast = useToast();
  return (
    <Section id="toast" title="Toast" note="Bottom-center, auto-hides after 2s, stacks max 2.">
      <div className="flex gap-2">
        <Button
          className="bg-success! border-success!"
          onClick={() => toast("correct", "+100 pts · +35 speed bonus")}
          icon={<Icon name="check" />}
        >
          Correct toast
        </Button>
        <Button
          className="bg-danger! border-danger!"
          onClick={() => toast("wrong", "−10 pts · try again")}
          icon={<Icon name="x" />}
        >
          Wrong toast
        </Button>
      </div>
    </Section>
  );
}

/* ---------------- buttons + inputs ---------------- */
function ControlsSection() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const emailError = email && !/^[^\s@]+@[^\s@]+\.edu(\.[a-z]{2})?$/i.test(email) ? "Use your university student email" : undefined;

  return (
    <Section id="controls" title="Buttons & inputs">
      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-5">
          <div>
            <Label>Variants</Label>
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          <div>
            <Label>Loading / disabled</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1500);
                }}
              >
                {loading ? "Signing in…" : "Click to load"}
              </Button>
              <Button disabled>Disabled</Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <Label>Full width + icon</Label>
            <Button fullWidth icon={<Icon name="mail" />}>Sign in with student email</Button>
          </div>
          <Input
            label="Email"
            placeholder="66130500047@ad.sit.kmutt.ac.th"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            helper="Try a non-.edu address to see the error"
          />
        </div>
        <div>
          <Label>Class code (large) — try pasting “cl7k2p”</Label>
          <CodeInput value={code} onChange={setCode} />
          <p className="mt-3 font-mono text-sm text-primary/60">value: “{code}”</p>
          <div className="mt-4">
            <Label>Error state</Label>
            <CodeInput value="ZZZZZZ" onChange={() => {}} error />
            <p className="mt-1.5 text-sm text-danger">Code not found</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
