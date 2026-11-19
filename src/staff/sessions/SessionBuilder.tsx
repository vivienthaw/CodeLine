import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button, Icon, Input, Modal, Select, useToast } from "../../components";
import { useDevAction } from "../../devBus";
import { Link, navigate } from "../../router";
import { DEMO_SESSION } from "../demo";
import { openConsole, openLobby as launchLobby, schedule } from "./launch";
import { CLASSES, MODES, itemCount, modeInfo, type QuestionSet, type SetMode } from "../data";
import { StaffHeader, StaffLayout } from "../StaffLayout";
import { addSession, getStaff, useQuestionSets, useStaff } from "../store";
import { DifficultyChip, ModeIcon } from "../ui";
import {
  MAX_TIMER,
  MIN_TIMER,
  fmtTime,
  generateCode,
  maxPoints,
  newRound,
  parseTime,
  participants,
  scoringLine,
  type SessionRound,
  type StaffSession,
} from "../sessions";

const pad = (n: number) => String(n).padStart(2, "0");
function nextHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:00` };
}

type Details = {
  title: string;
  className: string;
  date: string;
  time: string;
  playMode: "individual" | "team";
  teamSize: number;
  expected: number;
};

export default function SessionBuilder() {
  const toast = useToast();
  const sets = useQuestionSets();
  const sessions = useStaff((s) => s.sessions);
  const user = useStaff((s) => s.user);
  const setById = useMemo(() => new Map(sets.map((s) => [s.id, s])), [sets]);

  const [d, setD] = useState<Details>(() => ({
    title: "",
    className: CLASSES[0]!,
    ...nextHour(),
    playMode: "individual",
    teamSize: 4,
    expected: 40,
  }));
  const [rounds, setRounds] = useState<SessionRound[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [created, setCreated] = useState<StaffSession | null>(null);
  const patch = (p: Partial<Details>) => setD((x) => ({ ...x, ...p }));

  // rounds whose set was deleted from the bank are dropped
  const valid = rounds.filter((r) => setById.has(r.setId));
  const units = participants(d);
  const unitWord = d.playMode === "team" ? "teams" : "students";

  /* ---- validation ---- */
  const errors = {
    title: !d.title.trim() ? "Give the session a title" : undefined,
    when: !d.date || !d.time ? "Pick a date and time" : undefined,
    expected: !(d.expected >= 1) ? "At least 1 student" : undefined,
    rounds: valid.length === 0 ? "Add at least one round" : undefined,
    timers: valid.some((r) => r.timerSec < MIN_TIMER || r.timerSec > MAX_TIMER),
  };
  const errorCount = [errors.title, errors.when, errors.expected, errors.rounds, errors.timers].filter(Boolean).length;
  const warnings = valid.flatMap((r) => {
    const set = setById.get(r.setId)!;
    return set.mode === "codeline" && set.steps.length < units ? [{ id: r.id, text: groupingWarning(set.steps.length, units, unitWord) }] : [];
  });

  /* ---- create ---- */
  const create = () => {
    setShowErrors(true);
    if (errorCount) {
      toast("wrong", `Fix ${errorCount} problem${errorCount === 1 ? "" : "s"} before creating the session`);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const session: StaffSession = {
      id: `session-${Date.now().toString(36)}`,
      code: generateCode(new Set(sessions.map((s) => s.code))),
      title: d.title.trim(),
      className: d.className,
      startsAt: `${d.date}T${d.time}`,
      playMode: d.playMode,
      teamSize: d.teamSize,
      expected: d.expected,
      rounds: valid,
      createdAt: Date.now(),
      createdBy: user.name,
    };
    addSession(session);
    // the live session the lobby, lecturer console and projector run — students can't join until "Open lobby"
    schedule(session, sets);
    setCreated(session);
  };

  const openLobby = () => created && launchLobby(created, sets);

  // dev panel click-through: fill the form with 2 rounds (CodeLine + quiz), create, open the lobby
  useDevAction((a) => {
    if (a === "staff:fillSession") {
      const tourSet = setById.get(getStaff().tour.savedId ?? "");
      const codeline = tourSet?.mode === "codeline" && tourSet.status === "ready" ? tourSet : setById.get(DEMO_SESSION.fallbackCodelineId);
      const quiz = setById.get(DEMO_SESSION.quizSetId) ?? sets.find((x) => x.mode !== "codeline" && x.status === "ready");
      patch({ title: DEMO_SESSION.title });
      setRounds([codeline, quiz].flatMap((x) => (x ? [newRound(x)] : [])));
      toast("correct", `Filled in: ${[codeline, quiz].filter(Boolean).map((x) => x!.title).join(" + ")}`);
    } else if (a === "staff:create") create();
    else if (a === "staff:openLobby") openLobby();
  });

  return (
    <StaffLayout>
      <div className="px-10 pt-6">
        <Link to="/staff/sessions" className="text-sm font-semibold text-primary/60 hover:text-primary">
          ← Sessions
        </Link>
      </div>
      <StaffHeader title="New session" subtitle="Pick question sets, set timers and scoring, then share the class code." />

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 px-10 pb-12">
        <div className="flex flex-col gap-5">
          {/* ---------- details ---------- */}
          <section className="grid grid-cols-2 gap-5 rounded-card bg-surface p-6 shadow-soft">
            <Input
              label="Session title"
              value={d.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Week 10 — While loops"
              error={showErrors ? errors.title : undefined}
              className="col-span-2"
            />
            <Select label="Class" value={d.className} onChange={(e) => patch({ className: e.target.value })} options={CLASSES.map((c) => [c, c] as const)} />
            <div>
              <div className="mb-1.5 text-sm font-semibold">Date &amp; time</div>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <input
                  type="date"
                  aria-label="Date"
                  value={d.date}
                  onChange={(e) => patch({ date: e.target.value })}
                  aria-invalid={(showErrors && !d.date) || undefined}
                  className={`min-h-11 rounded-chip border-2 bg-surface px-3 text-sm outline-none focus:border-accent ${showErrors && !d.date ? "border-danger" : "border-primary/20"}`}
                />
                <input
                  type="time"
                  aria-label="Time"
                  value={d.time}
                  onChange={(e) => patch({ time: e.target.value })}
                  aria-invalid={(showErrors && !d.time) || undefined}
                  className={`min-h-11 rounded-chip border-2 bg-surface px-3 text-sm outline-none focus:border-accent ${showErrors && !d.time ? "border-danger" : "border-primary/20"}`}
                />
              </div>
              {showErrors && errors.when && <p className="mt-1.5 text-sm text-danger">{errors.when}</p>}
            </div>

            <div>
              <div className="mb-1.5 text-sm font-semibold">Play mode</div>
              <div className="grid grid-cols-2 rounded-chip bg-bg p-1" role="radiogroup" aria-label="Play mode">
                {(["individual", "team"] as const).map((m) => (
                  <button
                    key={m}
                    role="radio"
                    aria-checked={d.playMode === m}
                    onClick={() => patch({ playMode: m })}
                    className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[6px] text-sm font-semibold transition-colors ${
                      d.playMode === m ? "bg-surface shadow-soft" : "text-primary/60 hover:text-primary"
                    }`}
                  >
                    {m === "team" && <Icon name="users" size={15} />}
                    {m === "individual" ? "Individual" : "Team"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Expected students"
                type="number"
                min={1}
                max={300}
                value={Number.isFinite(d.expected) ? d.expected : ""}
                onChange={(e) => patch({ expected: e.target.value === "" ? NaN : Math.min(300, Math.max(0, Math.round(Number(e.target.value)))) })}
                error={showErrors ? errors.expected : undefined}
              />
              {d.playMode === "team" ? (
                <Select
                  label="Team size"
                  value={String(d.teamSize)}
                  onChange={(e) => patch({ teamSize: Number(e.target.value) })}
                  options={[2, 3, 4, 5, 6].map((n) => [String(n), `${n} per team`] as const)}
                />
              ) : (
                <div className="self-end pb-3 text-xs text-primary/55">Each student gets their own snippet in CodeLine rounds.</div>
              )}
            </div>
            {d.playMode === "team" && Number.isFinite(d.expected) && (
              <p className="col-span-2 -mt-2 text-xs text-primary/60">
                ≈ {units} teams of {d.teamSize}. In CodeLine rounds each team gets one snippet.
              </p>
            )}
          </section>

          {/* ---------- rounds ---------- */}
          <RoundsSection
            rounds={valid}
            setById={setById}
            units={units}
            unitWord={unitWord}
            showErrors={showErrors}
            roundsError={errors.rounds}
            onChange={setRounds}
            onAdd={() => setPickerOpen(true)}
          />
        </div>

        {/* ---------- summary ---------- */}
        <aside className="sticky top-6">
          <Summary
            d={d}
            rounds={valid}
            setById={setById}
            units={units}
            unitWord={unitWord}
            warnings={warnings.length}
            errorCount={showErrors ? errorCount : 0}
            onCreate={create}
          />
        </aside>
      </div>

      <RoundPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        sets={sets}
        usedIds={valid.map((r) => r.setId)}
        onPick={(set) => {
          setRounds((rs) => [...rs.filter((r) => setById.has(r.setId)), newRound(set)]);
          setPickerOpen(false);
          toast("correct", `Added round: ${set.title}`);
        }}
      />

      <CreatedModal session={created} onOpenLobby={openLobby} onConsole={() => created && openConsole(created, sets)} onClose={() => navigate("/staff/sessions")} />
    </StaffLayout>
  );
}

function groupingWarning(steps: number, units: number, unitWord: string) {
  const who = unitWord === "teams" ? "teams" : "students";
  return `${steps} steps for ${units} ${unitWord} – ${who} will be grouped or some steps duplicated`;
}

/* ---------------- rounds list ---------------- */
function RoundsSection({
  rounds,
  setById,
  units,
  unitWord,
  showErrors,
  roundsError,
  onChange,
  onAdd,
}: {
  rounds: SessionRound[];
  setById: Map<string, QuestionSet>;
  units: number;
  unitWord: string;
  showErrors: boolean;
  roundsError?: string;
  onChange: (r: SessionRound[]) => void;
  onAdd: () => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (focusId) handles.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to > rounds.length) return;
    const next = [...rounds];
    const [item] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, item!);
    onChange(next);
  };
  const update = (id: string, p: Partial<SessionRound>) => onChange(rounds.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const endDrag = () => {
    setDragId(null);
    setDropAt(null);
    setArmed(null);
  };
  const onKey = (e: KeyboardEvent, i: number, id: string) => {
    if (e.key === "ArrowUp" && i > 0) {
      e.preventDefault();
      move(i, i - 1);
      setFocusId(id);
    } else if (e.key === "ArrowDown" && i < rounds.length - 1) {
      e.preventDefault();
      move(i, i + 2);
      setFocusId(id);
    }
  };

  return (
    <section className="rounded-card bg-surface p-6 shadow-soft">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-bold">Rounds</h2>
          <p className="text-xs text-primary/55">Played in this order. Drag the handle (or use ↑/↓) to reorder.</p>
        </div>
        <span className="text-xs font-semibold text-primary/55 tabular-nums">{rounds.length} rounds</span>
      </div>

      {rounds.length === 0 ? (
        <div
          className={`flex flex-col items-center gap-2 rounded-card border-2 border-dashed py-10 text-center ${
            showErrors && roundsError ? "border-danger/50" : "border-primary/15"
          }`}
        >
          <div className="font-bold">No rounds yet</div>
          <p className="text-sm text-primary/60">Add a CodeLine round and a quiz round from your Question Bank.</p>
          {showErrors && roundsError && <p className="text-sm font-semibold text-danger">{roundsError}</p>}
        </div>
      ) : (
        <ol
          className="flex flex-col gap-3"
          onDragOver={(e) => dragId && e.preventDefault()}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            const from = rounds.findIndex((r) => r.id === dragId);
            if (from >= 0 && dropAt !== null) move(from, dropAt);
            endDrag();
          }}
        >
          {rounds.map((r, i) => {
            const set = setById.get(r.setId)!;
            return (
              <li
                key={r.id}
                draggable={armed === r.id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", r.id);
                  setDragId(r.id);
                }}
                onDragEnd={endDrag}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  const box = e.currentTarget.getBoundingClientRect();
                  setDropAt(e.clientY < box.top + box.height / 2 ? i : i + 1);
                }}
                className={`relative ${dragId === r.id ? "opacity-40" : ""}`}
              >
                {dragId && dropAt === i && <span className="absolute inset-x-0 -top-2 h-1 rounded-full bg-accent" aria-hidden />}
                {dragId && dropAt === rounds.length && i === rounds.length - 1 && (
                  <span className="absolute inset-x-0 -bottom-2 h-1 rounded-full bg-accent" aria-hidden />
                )}
                <RoundCard
                  n={i + 1}
                  round={r}
                  set={set}
                  units={units}
                  unitWord={unitWord}
                  showErrors={showErrors}
                  onChange={(p) => update(r.id, p)}
                  onRemove={() => onChange(rounds.filter((x) => x.id !== r.id))}
                  handle={
                    <button
                      ref={(el) => {
                        if (el) handles.current.set(r.id, el);
                      }}
                      onPointerDown={() => setArmed(r.id)}
                      onPointerUp={() => !dragId && setArmed(null)}
                      onKeyDown={(e) => onKey(e, i, r.id)}
                      aria-label={`Reorder round ${i + 1} (drag, or use arrow keys)`}
                      title="Drag to reorder · ↑/↓ with keyboard"
                      className="grid size-10 cursor-grab place-items-center rounded-chip text-primary/45 hover:bg-primary/6 hover:text-primary active:cursor-grabbing"
                    >
                      <Icon name="grip" size={18} />
                    </button>
                  }
                />
              </li>
            );
          })}
        </ol>
      )}

      <Button variant="secondary" icon={<Icon name="plus" />} className="mt-4" onClick={onAdd}>
        Add round
      </Button>
    </section>
  );
}

function RoundCard({
  n,
  round,
  set,
  units,
  unitWord,
  showErrors,
  onChange,
  onRemove,
  handle,
}: {
  n: number;
  round: SessionRound;
  set: QuestionSet;
  units: number;
  unitWord: string;
  showErrors: boolean;
  onChange: (p: Partial<SessionRound>) => void;
  onRemove: () => void;
  handle: ReactNode;
}) {
  const codeline = set.mode === "codeline";
  const fewSteps = codeline && set.steps.length < units;
  return (
    <div className="rounded-card border-2 border-primary/10 bg-surface">
      <div className="flex items-center gap-3 border-b border-primary/8 py-2 pl-2 pr-3">
        {handle}
        <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-primary text-sm font-bold text-white">{n}</span>
        <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-accent/12 text-accent">
          <ModeIcon mode={set.mode} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{set.title}</div>
          <div className="text-xs text-primary/55">
            {modeInfo(set.mode).label} · {itemCount(set).label} · {set.topic}
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove round ${n}`}
          title="Remove round"
          className="grid size-10 cursor-pointer place-items-center rounded-chip text-primary/45 hover:bg-danger/10 hover:text-danger"
        >
          <Icon name="trash" size={17} />
        </button>
      </div>

      <div className={`grid items-start gap-4 p-4 ${codeline ? "grid-cols-4" : "grid-cols-[1fr_2fr]"}`}>
        <TimerField
          label={codeline ? "Timer" : "Round timer"}
          seconds={round.timerSec}
          onChange={(timerSec) => onChange({ timerSec })}
          showErrors={showErrors}
          hint={codeline ? undefined : `≈ ${fmtTime(Math.round(round.timerSec / Math.max(1, itemCount(set).n)))} per question`}
        />
        {codeline ? (
          <>
            <NumberField label="Base points" value={round.base} onChange={(base) => onChange({ base })} prefix="+" />
            <NumberField label="Speed bonus up to" value={round.speed} onChange={(speed) => onChange({ speed })} prefix="+" />
            <NumberField label="Wrong penalty" value={round.penalty} onChange={(penalty) => onChange({ penalty })} prefix="−" />
          </>
        ) : (
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 self-end rounded-chip bg-bg px-4 py-2">
            <span>
              <span className="block text-sm font-semibold">Retries allowed</span>
              <span className="block text-xs text-primary/55">Students may change their answer until the question closes</span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input type="checkbox" role="switch" checked={round.retries} onChange={(e) => onChange({ retries: e.target.checked })} className="peer sr-only" />
              <span className="h-6 w-10 rounded-full bg-primary/20 transition-colors peer-checked:bg-success peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
              <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        )}
      </div>

      {fewSteps && (
        <p className="mx-4 mb-4 flex items-start gap-2 rounded-chip bg-accent/10 px-3 py-2 text-sm text-[#8A4A0B]">
          <span aria-hidden>▲</span>
          {groupingWarning(set.steps.length, units, unitWord)}
        </p>
      )}
    </div>
  );
}

function TimerField({
  label,
  seconds,
  onChange,
  showErrors,
  hint,
}: {
  label: string;
  seconds: number;
  onChange: (s: number) => void;
  showErrors: boolean;
  hint?: string;
}) {
  const [text, setText] = useState(fmtTime(seconds));
  const [touched, setTouched] = useState(false);
  useEffect(() => setText(fmtTime(seconds)), [seconds]);
  const parsed = parseTime(text);
  const err =
    parsed === null
      ? "Use mm:ss, e.g. 5:00"
      : parsed < MIN_TIMER
        ? `At least ${fmtTime(MIN_TIMER)}`
        : parsed > MAX_TIMER
          ? `At most ${fmtTime(MAX_TIMER)}`
          : undefined;
  const show = (touched || showErrors) && err;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">
        {label}
        <input
          value={text}
          inputMode="numeric"
          onChange={(e) => {
            setText(e.target.value);
            const p = parseTime(e.target.value);
            if (p !== null) onChange(p);
          }}
          onBlur={() => {
            setTouched(true);
            if (parsed !== null) setText(fmtTime(parsed));
          }}
          aria-invalid={!!show || undefined}
          className={`mt-1.5 block min-h-11 w-full rounded-chip border-2 bg-surface px-3 font-mono text-base font-semibold tabular-nums outline-none focus:border-accent ${
            show ? "border-danger" : "border-primary/20"
          }`}
        />
      </label>
      {show ? <p className="mt-1 text-xs font-semibold text-danger">{err}</p> : hint && <p className="mt-1 text-xs text-primary/55">{hint}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1.5 flex min-h-11 items-center rounded-chip border-2 border-primary/20 bg-surface pl-3 focus-within:border-accent">
        <span className="font-mono text-primary/50">{prefix}</span>
        <input
          type="number"
          min={0}
          max={1000}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(1000, Math.round(Number(e.target.value) || 0))))}
          className="w-full bg-transparent px-1.5 font-mono text-base font-semibold tabular-nums outline-none"
        />
      </span>
    </label>
  );
}

/* ---------------- summary ---------------- */
function Summary({
  d,
  rounds,
  setById,
  units,
  unitWord,
  warnings,
  errorCount,
  onCreate,
}: {
  d: Details;
  rounds: SessionRound[];
  setById: Map<string, QuestionSet>;
  units: number;
  unitWord: string;
  warnings: number;
  errorCount: number;
  onCreate: () => void;
}) {
  const totalSec = rounds.reduce((n, r) => n + r.timerSec, 0);
  const maxTotal = rounds.reduce((n, r) => n + maxPoints(setById.get(r.setId)!, r), 0);
  const when = d.date && d.time ? new Date(`${d.date}T${d.time}`) : null;
  return (
    <section className="flex flex-col rounded-card bg-surface shadow-soft" aria-label="Session summary">
      <div className="border-b border-primary/10 p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-primary/50">Session summary</div>
        <div className="mt-1 text-lg font-extrabold leading-tight">{d.title.trim() || "Untitled session"}</div>
        <div className="mt-1 text-xs text-primary/60">
          {d.className}
          {when && ` · ${when.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${d.time}`}
        </div>
      </div>

      <dl className="grid grid-cols-3 border-b border-primary/10">
        <Stat label="Rounds" value={String(rounds.length)} />
        <Stat label="Total time" value={fmtTime(totalSec)} />
        <Stat label={d.playMode === "team" ? "Teams" : "Students"} value={Number.isFinite(units) ? String(units) : "—"} />
      </dl>

      <div className="p-5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary/50">Scoring preview</div>
        {rounds.length === 0 ? (
          <p className="text-sm text-primary/50">Add rounds to see how points add up.</p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {rounds.map((r, i) => {
              const set = setById.get(r.setId)!;
              return (
                <li key={r.id} className="text-sm">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="text-primary/50">R{i + 1}</span>
                    <ModeIcon mode={set.mode} size={14} />
                    <span className="truncate">{modeInfo(set.mode).short}</span>
                    <span className="ml-auto font-mono text-xs text-primary/60">{fmtTime(r.timerSec)}</span>
                  </div>
                  <div className="font-mono text-[11px] text-primary/65">{scoringLine(set, r)}</div>
                  <div className="text-[11px] text-primary/50">max {maxPoints(set, r)} pts per {unitWord === "teams" ? "team" : "student"}</div>
                </li>
              );
            })}
          </ol>
        )}
        {rounds.length > 0 && (
          <div className="mt-3 flex items-baseline justify-between border-t border-primary/10 pt-3">
            <span className="text-sm font-semibold">Max possible</span>
            <span className="font-mono text-xl font-extrabold tabular-nums">{maxTotal} pts</span>
          </div>
        )}
        {warnings > 0 && (
          <p className="mt-3 rounded-chip bg-accent/10 px-3 py-2 text-xs font-semibold text-[#8A4A0B]">
            ▲ {warnings} CodeLine round{warnings === 1 ? " has" : "s have"} fewer steps than {unitWord}
          </p>
        )}
      </div>

      <div className="border-t border-primary/10 p-5">
        <Button fullWidth onClick={onCreate} icon={<Icon name="check" />}>
          Create session
        </Button>
        {errorCount > 0 && (
          <p className="mt-2 text-center text-sm font-semibold text-danger" aria-live="polite">
            ● {errorCount} problem{errorCount === 1 ? "" : "s"} to fix
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-primary/10 px-4 py-3 last:border-r-0">
      <dt className="text-[11px] font-semibold text-primary/55">{label}</dt>
      <dd className="font-mono text-xl font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}

/* ---------------- add round picker ---------------- */
function RoundPicker({
  open,
  onClose,
  sets,
  usedIds,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  sets: QuestionSet[];
  usedIds: string[];
  onPick: (set: QuestionSet) => void;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"" | SetMode>("");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setMode("");
      setSelected(null);
    }
  }, [open]);

  const list = sets.filter(
    (s) => (!mode || s.mode === mode) && (!q.trim() || `${s.title} ${s.topic}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const pick = sets.find((s) => s.id === selected);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a round"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!pick} onClick={() => pick && onPick(pick)} icon={<Icon name="plus" />}>
            Add round
          </Button>
        </>
      }
    >
      <div className="mb-3 flex gap-3">
        <div className="relative flex-1">
          <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/45" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sets"
            aria-label="Search question sets"
            data-autofocus
            className="min-h-11 w-full rounded-chip border-2 border-primary/20 pl-10 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <Select
          aria-label="Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "" | SetMode)}
          options={[["", "All modes"], ...MODES.map((m) => [m.id, m.short] as const)]}
          className="w-48"
        />
      </div>

      <div role="radiogroup" aria-label="Question sets" className="flex flex-col gap-2">
        {list.length === 0 && <p className="py-8 text-center text-sm text-primary/55">No sets match.</p>}
        {list.map((s) => {
          const draft = s.status === "draft";
          const usedAt = usedIds.indexOf(s.id);
          const isSel = selected === s.id;
          return (
            <button
              key={s.id}
              role="radio"
              aria-checked={isSel}
              disabled={draft}
              onClick={() => setSelected(s.id)}
              onDoubleClick={() => !draft && onPick(s)}
              className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-card border-2 px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSel ? "border-accent bg-accent/6" : "border-primary/10 hover:border-primary/35"
              }`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-chip ${isSel ? "bg-accent text-white" : "bg-accent/12 text-accent"}`}>
                <ModeIcon mode={s.mode} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{s.title}</span>
                <span className="block text-xs text-primary/55">
                  {modeInfo(s.mode).label} · {itemCount(s).label} · {s.topic} · {s.className}
                </span>
              </span>
              {draft ? (
                <span className="rounded-full border border-primary/25 px-2 py-0.5 text-[11px] font-bold text-primary/60">Draft — finish it first</span>
              ) : (
                <>
                  {usedAt >= 0 && <span className="text-xs font-semibold text-primary/50">Already round {usedAt + 1}</span>}
                  <DifficultyChip value={s.difficulty} />
                </>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ---------------- created → class code ---------------- */
function CreatedModal({
  session,
  onOpenLobby,
  onConsole,
  onClose,
}: {
  session: StaffSession | null;
  onOpenLobby: () => void;
  onConsole: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
    } catch {
      // clipboard blocked (e.g. insecure context) — select the code so ⌘C works
      const el = document.getElementById("class-code");
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };

  return (
    <Modal
      open={!!session}
      onClose={onClose}
      title="Session created"
      size="md"
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={onConsole}>
            Lecturer console
          </Button>
          <Button onClick={onOpenLobby} data-autofocus>
            Open lobby →
          </Button>
        </>
      }
    >
      {session && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-[15px] text-primary/70">
            <strong className="text-primary">{session.title}</strong> · {session.rounds.length} round{session.rounds.length === 1 ? "" : "s"}
          </p>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary/50">Class code</div>
          <div id="class-code" className="flex gap-2" aria-label={`Class code ${session.code.split("").join(" ")}`}>
            {session.code.split("").map((c, i) => (
              <span key={i} className="grid h-20 w-16 place-items-center rounded-card border-2 border-primary bg-bg font-mono text-5xl font-bold">
                {c}
              </span>
            ))}
          </div>
          <Button variant="secondary" onClick={copy} icon={<Icon name={copied ? "check" : "copy"} />}>
            {copied ? "Copied!" : "Copy code"}
          </Button>
          <p className="max-w-sm text-sm text-primary/60">
            Students go to <span className="font-mono">/join</span> and enter this code. They'll see “Session hasn't started yet” until you open the lobby.
          </p>
        </div>
      )}
    </Modal>
  );
}
