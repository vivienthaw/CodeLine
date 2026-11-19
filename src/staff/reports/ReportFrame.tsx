import type { ReactNode } from "react";
import { Select } from "../../components";
import { StaffHeader, StaffLayout } from "../StaffLayout";
import { CLASS, KIND_LABEL, type RoundKind } from "./data";
import { DEFAULT_FILTERS, filteredSessions, RANGE_LABEL, setFilters, useFilters, type RangePreset } from "./metrics";

/** Every report page: staff layout + the sticky global filter bar. */
export function ReportFrame({
  title,
  subtitle,
  actions,
  back,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
  children: ReactNode;
}) {
  return (
    <StaffLayout>
      <FilterBar />
      {back && <div className="px-10 pt-5 print:hidden">{back}</div>}
      <StaffHeader title={title} subtitle={subtitle} actions={<div className="flex items-center gap-2 print:hidden">{actions}</div>} />
      <div className="flex flex-col gap-5 px-10 pb-12">{children}</div>
    </StaffLayout>
  );
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-chip bg-bg p-1">
      {options.map(([v, l]) => (
        <button
          key={v}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`min-h-8 cursor-pointer whitespace-nowrap rounded-[8px] px-3 text-xs font-semibold transition-colors ${
            value === v ? "bg-primary text-white" : "text-primary/60 hover:text-primary"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function FilterBar() {
  const f = useFilters();
  const count = filteredSessions(f).length;
  const changed = JSON.stringify(f) !== JSON.stringify(DEFAULT_FILTERS);
  return (
    <div className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 px-10 py-3 shadow-soft backdrop-blur print:static print:shadow-none" data-filter-bar>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Class"
          className="w-56"
          value={f.classId}
          onChange={(e) => setFilters({ classId: e.target.value })}
          options={[[CLASS.id, CLASS.name]]}
        />
        <Seg<RangePreset>
          label="Date range"
          value={f.range}
          onChange={(range) => setFilters({ range })}
          options={(Object.keys(RANGE_LABEL) as RangePreset[]).map((k) => [k, RANGE_LABEL[k]])}
        />
        <Select
          aria-label="Mode"
          className="w-44"
          value={f.mode}
          onChange={(e) => setFilters({ mode: e.target.value as "all" | RoundKind })}
          options={[["all", "All modes"], ...(Object.keys(KIND_LABEL) as RoundKind[]).map((k): [string, string] => [k, KIND_LABEL[k]])]}
        />
        <Seg
          label="Play type"
          value={f.play}
          onChange={(play) => setFilters({ play })}
          options={[
            ["all", "All"],
            ["individual", "Individual"],
            ["team", "Team"],
          ]}
        />
        <span className="ml-auto text-sm text-primary/60" data-filter-count>
          <b className="text-primary">{count}</b> of 10 sessions
        </span>
        {changed && (
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="cursor-pointer text-sm font-semibold text-primary/60 underline-offset-2 hover:text-primary hover:underline">
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}

export function Card({ label, value, sub, hint }: { label: string; value: ReactNode; sub?: ReactNode; hint?: string }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-soft" title={hint}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-primary/50">{label}</div>
      <div className="mt-1.5 text-[28px] font-extrabold leading-none tabular-nums">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-primary/55">{sub}</div>}
    </div>
  );
}
