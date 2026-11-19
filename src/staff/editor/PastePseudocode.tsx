import { useState, type ClipboardEvent, type ReactNode } from "react";
import { Button, Icon, Modal, useToast } from "../../components";
import type { CodeLineStep } from "../data";
import { PasteJava } from "./PasteJava";
import {
  applySplit,
  hasContent,
  mergeWithNext,
  removeLine,
  splitLines,
  type ApplyMode,
  type SplitLine,
} from "./splitPseudocode";

const EXAMPLE = `1. SET sum TO 0
2. FOR i FROM 1 TO n
      IF i MOD 2 = 0 THEN
         ADD i TO sum
3. PRINT sum`;

type PasteTab = "pseudo" | "java";

/** The paste card above the step table: pseudocode → steps, or Java → snippets for those steps. */
export function PasteSection({ steps, onSteps }: { steps: CodeLineStep[]; onSteps: (s: CodeLineStep[]) => void }) {
  const [tab, setTab] = useState<PasteTab>("pseudo");
  const tabs: [PasteTab, string][] = [
    ["pseudo", "Paste pseudocode"],
    ["java", "Paste Java code"],
  ];
  return (
    <section className="rounded-card bg-surface p-5 shadow-soft">
      <div role="tablist" aria-label="Paste" className="mb-3 inline-flex rounded-chip bg-bg p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`paste-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`paste-panel-${id}`}
            onClick={() => setTab(id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const other = id === "pseudo" ? "java" : "pseudo";
                setTab(other);
                document.getElementById(`paste-tab-${other}`)?.focus();
              }
            }}
            tabIndex={tab === id ? 0 : -1}
            className={`cursor-pointer rounded-[8px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === id ? "bg-surface text-primary shadow-soft" : "text-primary/55 hover:text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Panel id="pseudo" active={tab === "pseudo"}>
        <PastePseudocode steps={steps} onSteps={onSteps} />
      </Panel>
      <Panel id="java" active={tab === "java"}>
        <PasteJava steps={steps} onSteps={onSteps} />
      </Panel>
    </section>
  );
}

/** Both panels stay mounted so switching tabs keeps what was typed. */
function Panel({ id, active, children }: { id: PasteTab; active: boolean; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`paste-panel-${id}`} aria-labelledby={`paste-tab-${id}`} hidden={!active}>
      {children}
    </div>
  );
}

/** "Paste pseudocode" box → preview → steps. */
export function PastePseudocode({ steps, onSteps }: { steps: CodeLineStep[]; onSteps: (s: CodeLineStep[]) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<SplitLine[] | null>(null);
  const [empty, setEmpty] = useState(false); // "Split" found nothing usable

  const open = (value: string) => {
    const lines = splitLines(value);
    setEmpty(!lines.length);
    if (lines.length) setPreview(lines);
  };

  // pasting several lines at once splits straight away (the text still lands in the box)
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!/[\r\n]/.test(pasted.trim())) return; // single line: just a normal paste
    e.preventDefault();
    const el = e.currentTarget;
    const next = text.slice(0, el.selectionStart) + pasted + text.slice(el.selectionEnd);
    setText(next);
    open(next);
  };

  const apply = (lines: SplitLine[], mode: ApplyMode) => {
    onSteps(applySplit(steps, lines, mode));
    setPreview(null);
    setText("");
    toast("correct", `${lines.length} step${lines.length === 1 ? "" : "s"} ${mode === "append" ? "added" : "created"} — now add a Java snippet to each`);
  };

  return (
    <>
      <label htmlFor="cl-paste" className="sr-only">
        Paste pseudocode
      </label>
      <p className="mb-2 text-xs text-primary/55">
        One step per line. Numbering and bullets are removed; indentation is kept. Pasting several lines splits them
        automatically.
      </p>
      <textarea
        id="cl-paste"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setEmpty(false);
        }}
        onPaste={onPaste}
        rows={8}
        spellCheck={false}
        placeholder={EXAMPLE}
        className="w-full resize-y rounded-chip border-2 border-primary/20 bg-[#F7F9FC] px-3 py-2 font-mono text-[13px] leading-relaxed text-primary outline-none transition-colors placeholder:text-muted/70 focus:border-accent"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {empty && (
          <span role="alert" className="mr-auto text-xs font-semibold text-danger">
            ● No steps found — only numbers or bullets on every line
          </span>
        )}
        {text && (
          <Button variant="ghost" onClick={() => setText("")}>
            Clear
          </Button>
        )}
        <Button variant="secondary" disabled={!text.trim()} onClick={() => open(text)}>
          Split into steps
        </Button>
      </div>

      {preview && (
        <SplitPreview
          initial={preview}
          askMode={hasContent(steps)}
          existing={steps.filter((s) => s.pseudo.trim() || s.java.trim() || s.explanation.trim()).length}
          onCancel={() => setPreview(null)}
          onApply={apply}
        />
      )}
    </>
  );
}

function SplitPreview({
  initial,
  askMode,
  existing,
  onCancel,
  onApply,
}: {
  initial: SplitLine[];
  askMode: boolean;
  existing: number;
  onCancel: () => void;
  onApply: (lines: SplitLine[], mode: ApplyMode) => void;
}) {
  const [lines, setLines] = useState(initial);
  const [mode, setMode] = useState<ApplyMode>("append");
  const edited = lines !== initial;

  return (
    <Modal
      open
      onClose={onCancel}
      size="lg"
      title={`${lines.length} step${lines.length === 1 ? "" : "s"} detected`}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button data-autofocus disabled={!lines.length} onClick={() => onApply(lines, askMode ? mode : "replace")}>
            Apply
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm text-primary/65">
          Check the split. Merge a line into the next one if it was wrapped, or delete lines that aren't steps.
        </p>
        {edited && (
          <button
            onClick={() => setLines(initial)}
            className="shrink-0 cursor-pointer text-sm font-semibold text-primary/60 underline-offset-2 hover:text-primary hover:underline"
          >
            Undo changes
          </button>
        )}
      </div>

      {lines.length ? (
        <ol className="flex flex-col divide-y divide-primary/8 rounded-chip border border-primary/12" aria-label="Detected steps">
          {lines.map((l, i) => (
            <li key={`${i}-${l.text}`} className="group flex items-center gap-3 px-3 py-2 hover:bg-bg/60" data-split-row>
              <span className="w-6 shrink-0 text-right font-mono text-sm font-bold text-muted tabular-nums">{i + 1}</span>
              <div className="flex min-w-0 flex-1 items-stretch self-stretch">
                {Array.from({ length: l.indent }, (_, k) => (
                  <span key={k} aria-hidden className="ml-1.5 w-4 shrink-0 border-l-2 border-primary/12" />
                ))}
                <code className="min-w-0 self-center break-words font-mono text-[13px] text-primary">{l.text}</code>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  l.indent ? "bg-accent/12 text-[#B5600F]" : "bg-primary/6 text-primary/50"
                }`}
              >
                indent {l.indent}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setLines(mergeWithNext(lines, i))}
                  disabled={i === lines.length - 1}
                  aria-label={`Merge step ${i + 1} with step ${i + 2}`}
                  title="Merge with the next line"
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-chip px-2 text-xs font-semibold text-primary/60 hover:bg-primary/8 hover:text-primary disabled:invisible"
                >
                  <MergeIcon /> Merge ↓
                </button>
                <button
                  onClick={() => setLines(removeLine(lines, i))}
                  aria-label={`Delete step ${i + 1}`}
                  title="Delete this line"
                  className="grid size-8 cursor-pointer place-items-center rounded-chip text-primary/45 hover:bg-danger/10 hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-chip border border-dashed border-primary/20 px-4 py-8 text-center text-sm text-primary/55">
          Every line was deleted. Cancel, or undo your changes.
        </p>
      )}

      {askMode && (
        <fieldset className="mt-5 rounded-chip border border-accent/40 bg-accent/5 px-4 py-3">
          <legend className="px-1 text-sm font-bold">
            The step table already has {existing} step{existing === 1 ? "" : "s"}
          </legend>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
            {(
              [
                ["append", "Append to end", `Keep the ${existing} existing, add ${lines.length} after them`],
                ["replace", "Replace existing steps", `Remove the ${existing} existing steps and their snippets`],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="split-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={`block text-xs ${value === "replace" ? "text-danger" : "text-primary/55"}`}>{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Modal>
  );
}

const MergeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 4v5a5 5 0 0 0 5 5 5 5 0 0 0 5-5V4M12 14v6" />
  </svg>
);
