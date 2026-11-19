import { useEffect, useMemo, useState } from "react";
import { Button, Icon, Modal, Professor, Select, useToast, type IconName } from "../components";
import { Link, navigate } from "../router";
import { CLASSES, DIFFICULTIES, LANGUAGES, MODES, itemCount, modeInfo, type QuestionSet } from "./data";
import { SetPreview } from "./SetPreview";
import { StaffHeader, StaffLayout } from "./StaffLayout";
import { deleteSet, duplicateSet, setStaff, useQuestionSets, useStaff } from "./store";
import { DifficultyChip, ModeIcon, timeAgo } from "./ui";

type Filters = { q: string; language: string; topic: string; mode: string; difficulty: string; className: string };
const NO_FILTERS: Filters = { q: "", language: "", topic: "", mode: "", difficulty: "", className: "" };

export default function QuestionBank() {
  const toast = useToast();
  const sets = useQuestionSets();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // the set that was just saved or duplicated glows for a moment (set via the store, so it survives navigation)
  const flash = useStaff((s) => s.flash);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    if (!flash || Date.now() - flash.at > 4000) return;
    setFlashId(flash.id);
    requestAnimationFrame(() => document.querySelector(`[data-set-row="${CSS.escape(flash.id)}"]`)?.scrollIntoView({ block: "nearest" }));
    const t = setTimeout(() => {
      setFlashId(null);
      setStaff({ flash: null });
    }, 2200);
    return () => clearTimeout(t);
  }, [flash]);

  const topics = useMemo(() => [...new Set(sets.map((s) => s.topic))].sort(), [sets]);
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return sets.filter(
      (s) =>
        (!q || s.title.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q)) &&
        (!filters.language || s.language === filters.language) &&
        (!filters.topic || s.topic === filters.topic) &&
        (!filters.mode || s.mode === filters.mode) &&
        (!filters.difficulty || s.difficulty === filters.difficulty) &&
        (!filters.className || s.className === filters.className),
    );
  }, [sets, filters]);

  const filtering = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const set = (k: keyof Filters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const preview = sets.find((s) => s.id === previewId) ?? null;
  const toDelete = sets.find((s) => s.id === deleteId) ?? null;
  const drafts = sets.filter((s) => s.status === "draft").length;

  const duplicate = (s: QuestionSet) => {
    const copy = duplicateSet(s.id);
    if (!copy) return;
    toast("correct", `Duplicated as “${copy.title}”`);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteSet(toDelete.id);
    toast("wrong", `Deleted “${toDelete.title}”`);
    setDeleteId(null);
  };

  return (
    <StaffLayout>
      <StaffHeader
        title="Question Bank"
        subtitle={sets.length ? `${sets.length} sets${drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}` : undefined}
        actions={
          <Button icon={<Icon name="plus" />} onClick={() => navigate("/staff/questions/new")}>
            New question set
          </Button>
        }
      />

      <div className="px-10 pb-12">
        {sets.length === 0 ? (
          <EmptyBank />
        ) : (
          <>
            {/* ---------- filter bar ---------- */}
            <div className="mb-4 grid grid-cols-[minmax(220px,1.6fr)_repeat(5,minmax(0,1fr))] gap-3 rounded-card bg-surface p-4 shadow-soft">
              <div className="relative">
                <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/45" />
                <input
                  type="search"
                  value={filters.q}
                  onChange={(e) => set("q")(e.target.value)}
                  placeholder="Search title or topic"
                  aria-label="Search question sets"
                  className="min-h-11 w-full rounded-chip border-2 border-primary/20 bg-surface pl-10 pr-3 text-sm outline-none placeholder:text-muted focus:border-accent"
                />
              </div>
              <Select
                aria-label="Language"
                value={filters.language}
                onChange={(e) => set("language")(e.target.value)}
                options={[["", "All languages"], ...LANGUAGES.map((l) => [l, l] as const)]}
              />
              <Select
                aria-label="Topic"
                value={filters.topic}
                onChange={(e) => set("topic")(e.target.value)}
                options={[["", "All topics"], ...topics.map((t) => [t, t] as const)]}
              />
              <Select
                aria-label="Mode"
                value={filters.mode}
                onChange={(e) => set("mode")(e.target.value)}
                options={[["", "All modes"], ...MODES.map((m) => [m.id, m.short] as const)]}
              />
              <Select
                aria-label="Difficulty"
                value={filters.difficulty}
                onChange={(e) => set("difficulty")(e.target.value)}
                options={[["", "Any difficulty"], ...DIFFICULTIES.map((d) => [d, d] as const)]}
              />
              <Select
                aria-label="Class"
                value={filters.className}
                onChange={(e) => set("className")(e.target.value)}
                options={[["", "All classes"], ...CLASSES.map((c) => [c, c] as const)]}
              />
            </div>

            <div className="mb-2 flex h-6 items-center justify-between px-1 text-sm text-primary/60">
              <span aria-live="polite">
                {filtering ? `${filtered.length} of ${sets.length} sets match` : `${sets.length} sets`}
              </span>
              {filtering && (
                <button onClick={() => setFilters(NO_FILTERS)} className="cursor-pointer font-semibold text-accent hover:underline">
                  Clear filters
                </button>
              )}
            </div>

            {/* ---------- table ---------- */}
            <div className="overflow-hidden rounded-card bg-surface shadow-soft">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col />
                  <col className="w-[108px]" />
                  <col className="w-[158px]" />
                  <col className="w-[104px]" />
                  <col className="w-[110px]" />
                  <col className="w-[136px]" />
                  <col className="w-[104px]" />
                  <col className="w-[196px]" />
                </colgroup>
                <thead className="border-b border-primary/10 bg-bg/60 text-xs font-bold uppercase tracking-wider text-primary/50">
                  <tr>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-3 py-3">Topic</th>
                    <th className="px-3 py-3">Mode</th>
                    <th className="px-3 py-3">Difficulty</th>
                    <th className="px-3 py-3">Items</th>
                    <th className="px-3 py-3">Last edited</th>
                    <th className="px-3 py-3">Used in</th>
                    <th className="px-5 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/8">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      data-set-row={s.id}
                      className={`transition-colors duration-700 ${flashId === s.id ? "bg-accent/12" : "hover:bg-bg/60"}`}
                    >
                      <td className="px-5 py-3">
                        <Link
                          to={`/staff/questions/${s.id}/edit`}
                          className="line-clamp-2 text-[15px] font-bold leading-snug text-primary hover:text-accent"
                          title={s.title}
                        >
                          {s.title}
                        </Link>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-primary/50">
                          {s.status === "draft" && (
                            <span className="shrink-0 rounded-full border border-primary/25 px-1.5 text-[10px] font-bold uppercase tracking-wide text-primary/60">
                              Draft
                            </span>
                          )}
                          <span className="truncate">
                            {s.language} · {s.className}
                          </span>
                        </div>
                      </td>
                      <td className="truncate px-3 py-3">{s.topic}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <span className="grid size-7 place-items-center rounded-chip bg-accent/12 text-accent">
                            <ModeIcon mode={s.mode} size={16} />
                          </span>
                          {modeInfo(s.mode).short}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <DifficultyChip value={s.difficulty} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">{itemCount(s).label}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div>{timeAgo(s.updatedAt)}</div>
                        <div className="text-xs text-primary/50">{s.updatedBy}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                        {s.usedIn ? `${s.usedIn} session${s.usedIn === 1 ? "" : "s"}` : <span className="text-primary/40">Not used</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <RowAction icon="eye" label={`Preview ${s.title}`} onClick={() => setPreviewId(s.id)} />
                          <RowAction icon="pencil" label={`Edit ${s.title}`} onClick={() => navigate(`/staff/questions/${s.id}/edit`)} />
                          <RowAction icon="copy" label={`Duplicate ${s.title}`} onClick={() => duplicate(s)} />
                          <RowAction icon="trash" label={`Delete ${s.title}`} danger onClick={() => setDeleteId(s.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <div className="font-bold">No sets match these filters</div>
                  <button onClick={() => setFilters(NO_FILTERS)} className="cursor-pointer text-sm font-semibold text-accent hover:underline">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ---------- preview ---------- */}
      <Modal
        open={!!preview}
        onClose={() => setPreviewId(null)}
        title={preview?.title ?? ""}
        size="lg"
        footer={
          preview && (
            <>
              <Button variant="ghost" onClick={() => setPreviewId(null)} data-autofocus>
                Close
              </Button>
              <Button icon={<Icon name="pencil" />} onClick={() => navigate(`/staff/questions/${preview.id}/edit`)}>
                Edit set
              </Button>
            </>
          )
        }
      >
        {preview && <SetPreview set={preview} />}
      </Modal>

      {/* ---------- delete confirm ---------- */}
      <Modal
        open={!!toDelete}
        onClose={() => setDeleteId(null)}
        title="Delete question set?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)} data-autofocus>
              Cancel
            </Button>
            <Button className="border-danger! bg-danger! hover:bg-[#C93C41]!" icon={<Icon name="trash" />} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        {toDelete && (
          <div className="flex flex-col gap-3 text-[15px]">
            <p>
              <strong>“{toDelete.title}”</strong> and its {itemCount(toDelete).label} will be removed from the bank. This can't be undone.
            </p>
            {toDelete.usedIn > 0 && (
              <p className="rounded-chip bg-accent/10 px-3 py-2 text-sm">
                It's used in {toDelete.usedIn} session{toDelete.usedIn === 1 ? "" : "s"} — those sessions keep their own copy.
              </p>
            )}
          </div>
        )}
      </Modal>
    </StaffLayout>
  );
}

function RowAction({ icon, label, onClick, danger = false }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label.split(" ")[0]}
      className={`grid size-10 cursor-pointer place-items-center rounded-chip text-primary/55 transition-colors ${
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-primary/8 hover:text-primary"
      }`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function EmptyBank() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card bg-surface py-20 text-center shadow-soft">
      <Professor className="h-36" tapping />
      <h2 className="mt-2 text-xl font-extrabold">No question sets yet</h2>
      <p className="max-w-sm text-sm text-primary/60">
        Write a CodeLine problem or a quiz once, then reuse it across sessions and classes.
      </p>
      <Button className="mt-2" icon={<Icon name="plus" />} onClick={() => navigate("/staff/questions/new")}>
        Create your first set
      </Button>
    </div>
  );
}
