import { useMemo, useState, type ClipboardEvent, type ReactNode } from "react";
import { Button, Icon, Modal, useToast } from "../../components";
import type { CodeLineStep } from "../data";
import {
  assignJava,
  hasContent,
  isBlankStep,
  overwrittenSnippets,
  pairByOrder,
  splitJava,
  type JavaTarget,
} from "./splitPseudocode";

const EXAMPLE = `int sum = 0;
for (int i = 1; i <= n; i++) {
    if (i % 2 == 0) {   // comments are skipped
        sum += i;
    }
}
System.out.println(sum);`;

/** "Paste Java code" box → pairing dialog → snippets in the step table. */
export function PasteJava({ steps, onSteps }: { steps: CodeLineStep[]; onSteps: (s: CodeLineStep[]) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [skipBraces, setSkipBraces] = useState(true);
  const [lines, setLines] = useState<string[] | null>(null);
  const [empty, setEmpty] = useState(false);

  const open = (value: string) => {
    const found = splitJava(value, { skipBraces });
    setEmpty(!found.length);
    if (found.length) setLines(found);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!/[\r\n]/.test(pasted.trim())) return;
    e.preventDefault();
    const el = e.currentTarget;
    const next = text.slice(0, el.selectionStart) + pasted + text.slice(el.selectionEnd);
    setText(next);
    open(next);
  };

  // untouched blank rows (a brand-new set) aren't real steps to pair with
  const base = hasContent(steps) ? steps : [];

  const apply = (targets: JavaTarget[]) => {
    if (!lines) return;
    onSteps(assignJava(base, lines, targets));
    const used = targets.filter((t) => t !== "skip").length;
    const added = targets.filter((t) => t === "new").length;
    setLines(null);
    setText("");
    toast(
      "correct",
      `${used} Java line${used === 1 ? "" : "s"} placed${added ? ` · ${added === 1 ? "1 new step needs" : `${added} new steps need`} pseudocode` : ""}`,
    );
  };

  return (
    <>
      <label htmlFor="cl-paste-java" className="sr-only">
        Paste Java code
      </label>
      <p className="mb-2 text-xs text-primary/55">
        One snippet per line. Blank lines and comments are skipped. If there's one line per step, they can be paired
        automatically.
      </p>
      <textarea
        id="cl-paste-java"
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
      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-primary/75">
          <input
            type="checkbox"
            checked={skipBraces}
            onChange={(e) => setSkipBraces(e.target.checked)}
            className="size-4 accent-primary"
          />
          Skip lines that are only <code className="font-mono">{"{"}</code> or <code className="font-mono">{"}"}</code>
          <span className="text-xs text-primary/45">(untick if a step like END FOR is a lone brace)</span>
        </label>
        {empty && (
          <span role="alert" className="text-xs font-semibold text-danger">
            ● No Java lines found — only comments, braces or blank lines
          </span>
        )}
        <div className="flex gap-2">
          {text && (
            <Button variant="ghost" onClick={() => setText("")}>
              Clear
            </Button>
          )}
          <Button variant="secondary" disabled={!text.trim()} onClick={() => open(text)}>
            Split Java
          </Button>
        </div>
      </div>

      {lines && <JavaPairing steps={base} lines={lines} onCancel={() => setLines(null)} onApply={apply} />}
    </>
  );
}

function JavaPairing({
  steps,
  lines,
  onCancel,
  onApply,
}: {
  steps: CodeLineStep[];
  lines: string[];
  onCancel: () => void;
  onApply: (targets: JavaTarget[]) => void;
}) {
  const byOrder = useMemo(() => pairByOrder(lines.length, steps.length, steps.length ? "skip" : "new"), [lines, steps]);
  const [targets, setTargets] = useState<JavaTarget[]>(byOrder);
  const match = steps.length > 0 && lines.length === steps.length;
  const isByOrder = targets.every((t, k) => t === byOrder[k]);

  const overwritten = overwrittenSnippets(steps, lines, targets);
  const counts = new Map<number, number>();
  targets.forEach((t) => typeof t === "number" && counts.set(t, (counts.get(t) ?? 0) + 1));
  const uncovered = steps.flatMap((s, i) => (!counts.has(i) && !s.java.trim() && !isBlankStep(s) ? [i + 1] : []));
  const joined = [...counts].filter(([, n]) => n > 1).map(([i]) => i + 1);
  const used = targets.filter((t) => t !== "skip").length;

  const options: [string, string][] = [
    ...steps.map((s, i): [string, string] => [String(i), `Step ${i + 1} · ${clip(s.pseudo) || "(no pseudocode)"}`]),
    ["new", "New step at the end"],
    ["skip", "Skip this line"],
  ];

  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <Modal
      open
      onClose={onCancel}
      size="lg"
      title={`${plural(lines.length, "Java line")} detected`}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button data-autofocus disabled={!used} onClick={() => onApply(targets)}>
            {match && isByOrder ? "Pair line-by-line" : "Apply"}
          </Button>
        </>
      }
    >
      {/* status */}
      {!steps.length ? (
        <Banner tone="info">
          There are no steps yet, so each line becomes a new step. Add the pseudocode afterwards — or paste the
          pseudocode first and come back.
        </Banner>
      ) : match ? (
        <Banner tone="ok">
          {plural(lines.length, "line")} for {plural(steps.length, "step")} — Java line <i>i</i> goes into step <i>i</i>.
          Check the pairs below, change any that are off, then pair them.
        </Banner>
      ) : (
        <Banner tone="warn">
          <strong>
            {plural(lines.length, "Java line")} for {plural(steps.length, "step")}.
          </strong>{" "}
          The counts don't match, so choose a step for each line. Two lines sent to the same step are joined into one
          snippet; extra lines can start a new step or be skipped.
        </Banner>
      )}

      <div className="mt-4 mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-primary/45">Java line → step</span>
        {!isByOrder && (
          <button
            onClick={() => setTargets(byOrder)}
            className="cursor-pointer text-sm font-semibold text-primary/60 underline-offset-2 hover:text-primary hover:underline"
          >
            Reset to line-by-line
          </button>
        )}
      </div>

      <ol className="flex flex-col divide-y divide-primary/8 rounded-chip border border-primary/12" aria-label="Java lines">
        {lines.map((line, k) => {
          const t = targets[k]!;
          const target = typeof t === "number" ? steps[t] : undefined;
          return (
            <li
              key={k}
              data-java-row
              className={`grid grid-cols-[24px_minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-3 px-3 py-2 ${t === "skip" ? "bg-bg/60" : ""}`}
            >
              <span className="text-right font-mono text-sm font-bold text-muted tabular-nums">{k + 1}</span>
              <code className={`min-w-0 break-words font-mono text-[13px] ${t === "skip" ? "text-primary/35 line-through" : "text-primary"}`}>
                {line}
              </code>
              <span aria-hidden className="text-primary/35">
                →
              </span>
              <div className="min-w-0">
                <div className="relative">
                  <select
                    value={String(t)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = [...targets];
                      next[k] = v === "new" || v === "skip" ? v : Number(v);
                      setTargets(next);
                    }}
                    aria-label={`Java line ${k + 1} goes to`}
                    className="min-h-10 w-full cursor-pointer appearance-none truncate rounded-chip border-2 border-primary/20 bg-surface pl-3 pr-8 text-sm font-medium text-primary outline-none focus:border-accent"
                  >
                    {options.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevron" size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/50" />
                </div>
                {target?.java.trim() && target.java !== line && (counts.get(t as number) ?? 0) === 1 && (
                  <p className="mt-1 truncate text-xs text-[#B5600F]">
                    ▲ replaces <code className="font-mono">{target.java}</code>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* consequences */}
      {(uncovered.length > 0 || joined.length > 0 || overwritten.length > 0) && (
        <ul className="mt-3 flex flex-col gap-1 text-xs font-semibold text-[#B5600F]">
          {joined.length > 0 && <li>▲ {listSteps(joined)} get{joined.length === 1 ? "s" : ""} several lines — they'll be joined into one snippet</li>}
          {overwritten.length > 0 && (
            <li>
              ▲ Replaces the snippet you already wrote for {listSteps(overwritten.map((i) => i + 1))}
            </li>
          )}
          {uncovered.length > 0 && <li>▲ {listSteps(uncovered)} still need{uncovered.length === 1 ? "s" : ""} a Java snippet</li>}
        </ul>
      )}
    </Modal>
  );
}

function Banner({ tone, children }: { tone: "ok" | "warn" | "info"; children: ReactNode }) {
  const style =
    tone === "ok"
      ? "border-success/40 bg-success/8"
      : tone === "warn"
        ? "border-accent/50 bg-accent/8"
        : "border-primary/15 bg-bg";
  const mark = tone === "ok" ? "✓" : tone === "warn" ? "▲" : "i";
  return (
    <div role={tone === "warn" ? "alert" : "status"} className={`flex gap-3 rounded-chip border px-4 py-3 text-sm text-primary/85 ${style}`}>
      <span
        aria-hidden
        className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${
          tone === "ok" ? "bg-success" : tone === "warn" ? "bg-accent" : "bg-primary/50"
        }`}
      >
        {mark}
      </span>
      <p>{children}</p>
    </div>
  );
}

const clip = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const listSteps = (ns: number[]) => (ns.length === 1 ? `Step ${ns[0]}` : `Steps ${ns.slice(0, -1).join(", ")} and ${ns.at(-1)}`);
