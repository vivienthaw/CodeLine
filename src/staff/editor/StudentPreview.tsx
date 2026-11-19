import { useMemo, useState } from "react";
import { DropSlot, SnippetChip } from "../../components";
import type { CodeLineStep } from "../data";

/** Stable pseudo-shuffle: order by a hash of the step id so chips don't jump around while typing. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Live "what students see" panel for the CodeLine editor. */
export function StudentPreview({ statement, steps }: { statement: string; steps: CodeLineStep[] }) {
  const [answers, setAnswers] = useState(false);
  const chips = useMemo(
    () => steps.filter((s) => s.java.trim()).sort((a, b) => hash(a.id) - hash(b.id)),
    [steps],
  );

  return (
    <section className="flex max-h-[calc(100vh-7.5rem)] flex-col overflow-hidden rounded-card bg-surface shadow-soft" aria-label="Student preview">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-extrabold">Student preview</h2>
          <p className="text-xs text-primary/55">Updates as you type</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold">
          <span className="relative inline-flex">
            <input
              type="checkbox"
              role="switch"
              checked={answers}
              onChange={(e) => setAnswers(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-10 rounded-full bg-primary/20 transition-colors peer-checked:bg-success peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
            <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </span>
          Show answer key
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-bg p-4">
        {statement.trim() ? (
          <p className="mb-3 rounded-chip bg-surface p-3 text-xs leading-relaxed text-primary/80 shadow-soft">{statement}</p>
        ) : (
          <p className="mb-3 rounded-chip border border-dashed border-primary/20 p-3 text-xs italic text-primary/45">
            Problem statement appears here
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {steps.map((st, i) => (
            <div key={st.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-2 rounded-chip bg-surface p-2 shadow-soft">
              <div className="flex min-w-0 items-start gap-1.5 font-mono text-[11px] leading-snug">
                <span className="w-4 shrink-0 text-right text-muted">{i + 1}</span>
                <span
                  className={`min-w-0 break-words ${st.pseudo.trim() ? "" : "italic text-primary/35"}`}
                  style={{ paddingLeft: `${(st.indent ?? 0) * 2}ch` }}
                >
                  {st.pseudo.trim() || "(no pseudocode)"}
                </span>
              </div>
              <DropSlot state={answers && st.java.trim() ? "filled" : "empty"} className="min-w-0 [&_code]:text-[11px] [&>div]:min-h-9 [&_span]:text-[11px]">
                {answers && st.java.trim() ? <SnippetChip code={st.java} state="locked" className="min-h-9 py-1" /> : null}
              </DropSlot>
            </div>
          ))}
        </div>

        {!answers && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-primary/50">
              Snippet chips · shuffled · one per student
            </div>
            {chips.length ? (
              <div className="flex flex-col gap-1.5">
                {chips.map((st) => (
                  <SnippetChip key={st.id} code={st.java} className="min-h-9 py-1 [&_code]:text-[11px]" tabIndex={-1} />
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-primary/45">Add Java snippets to see the chips.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
