import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Input, Modal, Professor, Select, useToast } from "../../components";
import { Link, navigate, useNavigationGuard } from "../../router";
import {
  CLASSES,
  DIFFICULTIES,
  LANGUAGES,
  MODES,
  TOPICS,
  activeQuestions,
  blankQuestion,
  itemCount,
  modeInfo,
  type QuestionSet,
  type SetMode,
} from "../data";
import { StaffLayout } from "../StaffLayout";
import { flashSet, getSet, saveSet } from "../store";
import { DEMO_SET } from "../demo";
import { useDevAction } from "../../devBus";
import { ModeIcon } from "../ui";
import { validateSet } from "../validate";
import { CodeLineEditor, newStep } from "./CodeLineEditor";
import { QuestionsEditor } from "./QuestionsEditor";
import { StudentPreview } from "./StudentPreview";

function blankSet(): QuestionSet {
  return {
    id: "",
    title: "",
    topic: "Loops",
    language: "Java",
    difficulty: "Medium",
    className: CLASSES[0]!,
    mode: "codeline",
    status: "draft",
    statement: "",
    steps: [newStep(), newStep()],
    questions: [],
    updatedAt: 0,
    updatedBy: "",
    usedIn: 0,
  };
}

/** Carries the open step across the remount when a new set's first save moves the URL to /:id/edit. */
let carryStep: 1 | 2 | null = null;

/** /staff/questions/new and /staff/questions/:id/edit */
export default function QuestionEditor({ id }: { id?: string }) {
  const existing = id ? getSet(id) : undefined;
  if (id && !existing) {
    return (
      <StaffLayout>
        <div className="flex flex-col items-center gap-3 px-10 py-24 text-center">
          <Professor className="h-32" mood="heal" />
          <h1 className="text-2xl font-extrabold">Question set not found</h1>
          <p className="text-primary/60">It may have been deleted.</p>
          <Link to="/staff/questions" className="font-semibold text-accent underline underline-offset-2">
            Back to the Question Bank
          </Link>
        </div>
      </StaffLayout>
    );
  }
  return <Editor key={id ?? "new"} initial={existing ? structuredClone(existing) : blankSet()} isNew={!id} />;
}

function Editor({ initial, isNew }: { initial: QuestionSet; isNew: boolean }) {
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [step, setStep] = useState<1 | 2>(() => {
    const s = carryStep ?? (isNew ? 1 : 2);
    carryStep = null;
    return s;
  });
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [scrollToError, setScrollToError] = useState(0);

  const dirty = JSON.stringify(draft) !== baseline;
  const issues = useMemo(() => validateSet(draft), [draft]);
  const dupeCount = Object.keys(issues.dupes).length;
  const warnCount = Object.values(issues.warnings).reduce((n, w) => n + Object.keys(w).length, 0);
  const patch = (p: Partial<QuestionSet>) => setDraft((d) => ({ ...d, ...p }));

  useNavigationGuard(dirty, (to) => setLeaveTo(to));

  // after a failed Save, bring the first invalid field into view
  useEffect(() => {
    if (!scrollToError) return;
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [scrollToError]);

  const persist = (status: "draft" | "ready") => {
    const saved = saveSet({ ...draft, title: draft.title.trim() || "Untitled set", status });
    setDraft(saved);
    setBaseline(JSON.stringify(saved));
    return saved;
  };

  const saveDraft = (then?: string) => {
    const saved = persist("draft");
    toast("correct", "Draft saved");
    if (then) navigate(then, { force: true });
    else if (isNew) {
      carryStep = step;
      navigate(`/staff/questions/${saved.id}/edit`, { replace: true, force: true });
    }
  };

  const save = () => {
    setShowAllErrors(true);
    if (issues.errorCount) {
      setStep(issues.title ? 1 : 2); // title lives on step 1; everything else on step 2
      setScrollToError((n) => n + 1);
      toast("wrong", `Fix ${issues.errorCount} problem${issues.errorCount === 1 ? "" : "s"} before saving`);
      return;
    }
    const saved = persist("ready");
    flashSet(saved.id);
    toast("correct", `Saved “${saved.title}”`);
    navigate("/staff/questions", { force: true });
  };

  // dev panel click-through: type a sample CodeLine set in, then Save like a user would
  useDevAction((a) => {
    if (a === "staff:fillSet") {
      setDraft((d) => ({ ...d, ...structuredClone(DEMO_SET) }));
      setStep(2);
      toast("correct", "Sample set filled in — check it, then Save");
    } else if (a === "staff:save") save();
  });

  const count = itemCount(draft);

  /** Step 2 — a quiz mode with nothing written yet starts with one blank question. */
  const goToQuestions = () => {
    if (draft.mode !== "codeline" && !activeQuestions(draft).length) {
      patch({ questions: [...draft.questions, blankQuestion(draft.mode)] });
    }
    setStep(2);
  };

  return (
    <StaffLayout>
      <div className="flex min-h-screen flex-col">
        {/* ---------- header ---------- */}
        <div className="px-10 pt-6">
          <Link to="/staff/questions" className="text-sm font-semibold text-primary/60 hover:text-primary">
            ← Question Bank
          </Link>
        </div>
        <header className="flex items-end justify-between gap-6 px-10 pb-5 pt-3">
          <div className="min-w-0">
            <h1 className="truncate text-[28px] font-extrabold leading-tight">
              {isNew && !draft.id ? "New question set" : draft.title.trim() || "Untitled set"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-primary/60">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  draft.status === "ready" && draft.id ? "bg-success/12 text-success" : "border border-primary/25 text-primary/60"
                }`}
              >
                {draft.status === "ready" && draft.id ? "Saved" : "Draft"}
              </span>
              <span>
                {modeInfo(draft.mode).label} · {count.label}
              </span>
              {dirty && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#B5600F]">
                  <span className="size-2 rounded-full bg-accent" /> Unsaved changes
                </span>
              )}
            </div>
          </div>

          {/* stepper */}
          <nav className="flex shrink-0 rounded-chip bg-surface p-1 shadow-soft" aria-label="Editor steps">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => (n === 2 ? goToQuestions() : setStep(1))}
                aria-current={step === n ? "step" : undefined}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[6px] px-4 text-sm font-semibold transition-colors ${
                  step === n ? "bg-primary text-white" : "text-primary/60 hover:text-primary"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${
                    step === n ? "bg-white text-primary" : "bg-primary/10"
                  }`}
                >
                  {n}
                </span>
                {n === 1 ? "Set info" : `${modeInfo(draft.mode).label} ${draft.mode === "codeline" ? "steps" : "questions"}`}
              </button>
            ))}
          </nav>
        </header>

        {/* ---------- body ---------- */}
        <div className="flex-1 px-10 pb-28">
          {step === 1 ? (
            <SetInfo draft={draft} patch={patch} titleError={showAllErrors ? issues.title : undefined} onNext={goToQuestions} />
          ) : draft.mode === "codeline" ? (
            <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
              <CodeLineEditor
                statement={draft.statement}
                steps={draft.steps}
                issues={issues}
                showAllErrors={showAllErrors}
                onStatement={(statement) => patch({ statement })}
                onSteps={(steps) => patch({ steps })}
              />
              <div className="sticky top-6">
                <StudentPreview statement={draft.statement} steps={draft.steps} />
              </div>
            </div>
          ) : (
            <QuestionsEditor
              mode={draft.mode}
              questions={draft.questions}
              issues={issues}
              showAllErrors={showAllErrors}
              onQuestions={(questions) => patch({ questions })}
            />
          )}
        </div>

        {/* ---------- footer ---------- */}
        <footer className="sticky bottom-0 z-20 flex items-center justify-between gap-4 border-t border-primary/10 bg-surface/95 px-10 py-3 backdrop-blur">
          <div className="text-sm" aria-live="polite">
            {showAllErrors && issues.errorCount > 0 ? (
              <button onClick={() => setScrollToError((n) => n + 1)} className="cursor-pointer font-semibold text-danger hover:underline">
                ● {issues.errorCount} problem{issues.errorCount === 1 ? "" : "s"} to fix
              </button>
            ) : dupeCount > 0 && draft.mode === "codeline" ? (
              <span className="font-semibold text-[#B5600F]">▲ {dupeCount} steps share a snippet — Save still works</span>
            ) : warnCount > 0 && draft.mode !== "codeline" ? (
              <span className="font-semibold text-[#B5600F]">▲ {warnCount} duplicate {warnCount === 1 ? "entry" : "entries"} — Save still works</span>
            ) : (
              <span className="text-primary/50">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/staff/questions")}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => saveDraft()}>
              Save draft
            </Button>
            <Button onClick={save} icon={<Icon name="check" />}>
              Save
            </Button>
          </div>
        </footer>
      </div>

      {/* ---------- unsaved changes ---------- */}
      <Modal
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        title="Leave without saving?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" className="mr-auto text-danger!" onClick={() => leaveTo && navigate(leaveTo, { force: true })}>
              Discard changes
            </Button>
            <Button variant="secondary" onClick={() => setLeaveTo(null)} data-autofocus>
              Keep editing
            </Button>
            <Button onClick={() => leaveTo && saveDraft(leaveTo)}>Save draft &amp; leave</Button>
          </>
        }
      >
        <p className="text-[15px]">
          You have unsaved changes to <strong>“{draft.title.trim() || "Untitled set"}”</strong>. If you leave now they'll be lost.
        </p>
      </Modal>
    </StaffLayout>
  );
}

/* ---------------- step 1: set info ---------------- */
function SetInfo({
  draft,
  patch,
  titleError,
  onNext,
}: {
  draft: QuestionSet;
  patch: (p: Partial<QuestionSet>) => void;
  titleError?: string;
  onNext: () => void;
}) {
  const topics = TOPICS.includes(draft.topic) ? TOPICS : [draft.topic, ...TOPICS];
  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <section className="grid grid-cols-2 gap-5 rounded-card bg-surface p-6 shadow-soft">
        <Input
          label="Title"
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="e.g. Week 10 – While loops"
          error={titleError}
          className="col-span-2"
          autoFocus={!draft.title}
        />
        <Select label="Topic" value={draft.topic} onChange={(e) => patch({ topic: e.target.value })} options={topics.map((t) => [t, t] as const)} />
        <Select
          label="Language"
          value={draft.language}
          onChange={(e) => patch({ language: e.target.value as "Java" })}
          options={LANGUAGES.map((l) => [l, l] as const)}
        />
        <div>
          <div className="mb-1.5 text-sm font-semibold">Difficulty</div>
          <div className="grid grid-cols-3 rounded-chip bg-bg p-1" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                role="radio"
                aria-checked={draft.difficulty === d}
                onClick={() => patch({ difficulty: d })}
                className={`min-h-10 cursor-pointer rounded-[6px] text-sm font-semibold transition-colors ${
                  draft.difficulty === d ? "bg-surface shadow-soft" : "text-primary/60 hover:text-primary"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <Select label="Class" value={draft.className} onChange={(e) => patch({ className: e.target.value })} options={CLASSES.map((c) => [c, c] as const)} />
      </section>

      <section className="rounded-card bg-surface p-6 shadow-soft">
        <h2 className="text-sm font-bold">Mode</h2>
        <p className="mb-4 text-xs text-primary/55">How students answer this set. Switching keeps what you've already written for other modes.</p>
        <div className="grid grid-cols-5 gap-3" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <ModeCard key={m.id} mode={m.id} selected={draft.mode === m.id} onSelect={() => patch({ mode: m.id })} />
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={onNext}>
          Next: {draft.mode === "codeline" ? "write the steps" : "write the questions"} →
        </Button>
      </div>
    </div>
  );
}

function ModeCard({ mode, selected, onSelect }: { mode: SetMode; selected: boolean; onSelect: () => void }) {
  const m = modeInfo(mode);
  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`relative flex min-h-44 cursor-pointer flex-col items-start gap-2 rounded-card border-2 p-4 text-left transition-colors ${
        selected ? "border-accent bg-accent/6" : "border-primary/12 hover:border-primary/40"
      }`}
    >
      <span className={`grid size-11 place-items-center rounded-card ${selected ? "bg-accent text-white" : "bg-primary/8 text-primary"}`}>
        <ModeIcon mode={mode} size={22} />
      </span>
      <span className="text-[15px] font-extrabold leading-tight">{m.label}</span>
      <span className="text-xs leading-snug text-primary/60">{m.blurb}</span>
      {selected && (
        <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-accent text-white">
          <Icon name="check" size={14} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
