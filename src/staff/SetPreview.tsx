import { Icon } from "../components";
import { activeQuestions, itemCount, modeInfo, type QuestionSet, type SetQuestion } from "./data";
import { DifficultyChip, ModeIcon } from "./ui";

/** Read-only view of a whole set — what's in it and what the answers are. */
export function SetPreview({ set }: { set: QuestionSet }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 font-semibold">
          <ModeIcon mode={set.mode} size={15} /> {modeInfo(set.mode).label}
        </span>
        <DifficultyChip value={set.difficulty} />
        <span className="text-primary/60">
          {set.topic} · {set.language} · {set.className} · {itemCount(set).label}
        </span>
      </div>

      {set.mode === "codeline" ? (
        <>
          {set.statement && <p className="rounded-card bg-bg p-4 text-[15px] leading-relaxed">{set.statement}</p>}
          <table className="w-full border-separate border-spacing-y-1 text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wider text-primary/50">
                <th className="w-8 px-2 py-1">#</th>
                <th className="px-2 py-1">Pseudocode</th>
                <th className="px-2 py-1">Java snippet</th>
              </tr>
            </thead>
            <tbody>
              {set.steps.map((st, i) => (
                <tr key={st.id} className="align-top">
                  <td className="px-2 py-1.5 font-mono text-muted">{i + 1}</td>
                  <td className="whitespace-pre px-2 py-1.5 font-mono">{"    ".repeat(st.indent ?? 0) + st.pseudo}</td>
                  <td className="px-2 py-1.5">
                    <code className="rounded-[6px] bg-success/10 px-2 py-1 font-mono">{st.java}</code>
                    {st.explanation && <div className="mt-1 text-xs text-primary/60">{st.explanation}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <ol className="flex flex-col gap-3">
          {activeQuestions(set).map((q, i) => (
            <li key={q.id} className="rounded-card border border-primary/10 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary/50">Question {i + 1}</div>
              <QuestionPreview q={q} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Code({ code, blank }: { code: string; blank?: boolean }) {
  if (!code) return null;
  return (
    <pre className="mt-2 overflow-x-auto rounded-chip bg-[#0F1E33] px-4 py-3 font-mono text-[13px] leading-6 text-[#E3E9F2]">
      {blank
        ? code.split("___").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && <span className="rounded bg-accent/30 px-1.5 text-accent">___</span>}
            </span>
          ))
        : code}
    </pre>
  );
}

function QuestionPreview({ q }: { q: SetQuestion }) {
  switch (q.kind) {
    case "mc":
      return (
        <>
          <div className="font-semibold">{q.prompt}</div>
          <Code code={q.code} />
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {q.options.map((o, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-chip border-2 px-3 py-2 text-sm ${
                  i === q.answer ? "border-success bg-success/8" : "border-primary/10"
                }`}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded text-xs font-bold text-white ${i === q.answer ? "bg-success" : "bg-primary"}`}>
                  {"ABCD"[i]}
                </span>
                <span className="font-mono">{o}</span>
                {i === q.answer && <Icon name="check" size={16} strokeWidth={3} className="ml-auto text-success" />}
              </li>
            ))}
          </ul>
        </>
      );
    case "tf":
      return (
        <>
          <div className="font-semibold">{q.statement}</div>
          <Code code={q.code} />
          <div className="mt-3 text-sm">
            Answer:{" "}
            <span className={`rounded-full px-2.5 py-0.5 font-bold ${q.answer ? "bg-success/12 text-success" : "bg-danger/12 text-danger"}`}>
              {q.answer ? "True" : "False"}
            </span>
          </div>
        </>
      );
    case "match":
      return (
        <>
          <div className="font-semibold">{q.prompt}</div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {q.pairs.map((p) => (
              <li key={p.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                <code className="rounded-[6px] bg-bg px-2 py-1 font-mono">{p.left}</code>
                <span className="text-accent">⟷</span>
                <span>{p.right}</span>
              </li>
            ))}
          </ul>
        </>
      );
    case "fill":
      return (
        <>
          <div className="font-semibold">{q.prompt}</div>
          <Code code={q.code} blank />
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
            Accepted:
            {q.accept.map((a) => (
              <code key={a} className="rounded-[6px] bg-success/12 px-2 py-0.5 font-mono text-success">
                {a}
              </code>
            ))}
          </div>
        </>
      );
  }
}
