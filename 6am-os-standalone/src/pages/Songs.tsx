import { useMemo, useState } from "react";
import { useOSStore } from "../lib/store";
import {
  SectionHeader,
  PriorityPill,
  EmptyState,
  Modal,
  FormInput,
  TextArea,
  Select,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  SearchBar,
} from "../components/ui";
import { Song } from "../types/os";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { categoryChip, categoryDot, parseTags, tagsToInput, investedForTags, fmtMoney } from "../lib/categories";
import { buildReleaseChecklist } from "../lib/seed";

function parseLinks(fileLinks: string): string[] {
  return fileLinks
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

function linkLabel(url: string): string {
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) return "Google Drive";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

export default function BoardSection() {
  const songs = useOSStore((s) => s.songs);
  const settings = useOSStore((s) => s.settings);
  const budgetItems = useOSStore((s) => s.budgetItems);
  const addSong = useOSStore((s) => s.addSong);
  const updateSong = useOSStore((s) => s.updateSong);
  const deleteSong = useOSStore((s) => s.deleteSong);

  const emptyForm = useMemo(
    () => ({
      title: "",
      stage: settings.stages[0] ?? "Idea",
      itemType: settings.itemTypes[0] ?? "Song",
      priority: settings.priorities[1] ?? settings.priorities[0] ?? "Medium",
      vibe: "",
      theme: "",
      genre: "",
      bpm: "",
      key: "",
      collaborators: "",
      producer: "",
      nextAction: "",
      releasePotential: "Medium",
      notes: "",
      fileLinks: "",
      custom: {} as Record<string, string>,
      releaseDate: "",
      tags: "",
    }),
    [settings]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [groupByType, setGroupByType] = useState(true);
  const [archiveOpen, setArchiveOpen] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(song: Song) {
    setEditing(song);
    setForm({
      title: song.title,
      stage: song.stage,
      itemType: song.itemType ?? "Song",
      priority: song.priority,
      vibe: song.vibe,
      theme: song.theme,
      genre: song.genre,
      bpm: song.bpm,
      key: song.key,
      collaborators: song.collaborators,
      producer: song.producer,
      nextAction: song.nextAction,
      releasePotential: song.releasePotential,
      notes: song.notes,
      fileLinks: song.fileLinks,
      custom: { ...(song.custom ?? {}) },
      releaseDate: (song.releaseDate ?? "").slice(0, 10),
      tags: tagsToInput(song.tags),
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload: Partial<Song> & Omit<Song, "id" | "createdAt" | "updatedAt"> = {
      ...form,
      tags: parseTags(form.tags),
    };
    if (form.itemType === "Main Release" && !(editing?.checklist?.length)) {
      payload.checklist = buildReleaseChecklist();
    }
    if (editing) {
      updateSong(editing.id, payload);
    } else {
      addSong(payload);
    }
    setModalOpen(false);
  }

  function handleDrop(stage: string) {
    if (dragId) updateSong(dragId, { stage });
    setDragId(null);
    setDragOverStage(null);
  }

  const filtered = songs.filter((s) =>
    `${s.title} ${s.genre} ${s.itemType ?? ""} ${s.nextAction}`.toLowerCase().includes(search.toLowerCase())
  );

  // Finished items untouched for 30+ days move to the collapsible archive below the board.
  const ARCHIVE_AFTER_MS = 30 * 86_400_000;
  const isArchived = (s: Song) =>
    (s.stage === "Released" || s.stage === "Archived") &&
    Date.now() - new Date(s.updatedAt).getTime() > ARCHIVE_AFTER_MS;
  const activeItems = filtered.filter((s) => !isArchived(s));
  const archivedItems = filtered.filter(isArchived);

  // Show configured stages plus any stage still used by an item but removed from settings.
  const columns = useMemo(() => {
    const extra = [...new Set(songs.map((s) => s.stage))].filter((st) => !settings.stages.includes(st));
    return [...settings.stages, ...extra];
  }, [songs, settings.stages]);

  const typeLanes = useMemo(() => {
    const lanes = settings.itemTypes.filter((t) => activeItems.some((s) => (s.itemType ?? "Song") === t));
    const known = new Set(settings.itemTypes);
    if (activeItems.some((s) => !known.has(s.itemType ?? "Song"))) lanes.push("Other");
    return lanes;
  }, [activeItems, settings.itemTypes]);

  function laneItems(lane: string) {
    const known = new Set(settings.itemTypes);
    return lane === "Other"
      ? activeItems.filter((s) => !known.has(s.itemType ?? "Song"))
      : activeItems.filter((s) => (s.itemType ?? "Song") === lane);
  }

  function renderBoard(items: Song[]) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((stage) => {
          const stageSongs = items.filter((s) => s.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={() => handleDrop(stage)}
              className={`w-72 shrink-0 rounded-2xl p-1 transition-colors ${
                dragOverStage === stage ? "bg-violet-500/10" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <h3 className="text-sm font-medium text-[#f5f5f5]">{stage}</h3>
                <span className="text-xs text-[#a3a3a3]">{stageSongs.length}</span>
              </div>
              <div className="min-h-[60px] space-y-3">
                {stageSongs.map((song) => (
                  <div
                    key={song.id}
                    draggable
                    onDragStart={() => setDragId(song.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverStage(null);
                    }}
                    onClick={() => openEdit(song)}
                    className="cursor-grab rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 transition-colors hover:border-[#3a3a3a] active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#f5f5f5]">{song.title}</h4>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(song);
                          }}
                        >
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSong(song.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!groupByType && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryChip(song.itemType)}`}>
                          {song.itemType ?? "Main Release"}
                        </span>
                      )}
                      <PriorityPill priority={song.priority} />
                      {song.releaseDate && (
                        <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">
                          {new Date(song.releaseDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {investedForTags(budgetItems, song.tags) > 0 && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-300">
                          {fmtMoney(investedForTags(budgetItems, song.tags))} in
                        </span>
                      )}
                    </div>
                    {(song.tags ?? []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-cyan-300/80">
                        {(song.tags ?? []).map((t) => (
                          <span key={t}>#{t}</span>
                        ))}
                      </div>
                    )}
                    {song.nextAction && (
                      <div className="mt-2 text-xs text-[#a3a3a3]">
                        Next: <span className="text-[#f5f5f5]">{song.nextAction}</span>
                      </div>
                    )}
                    {settings.customFields.some((f) => song.custom?.[f.id]) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {settings.customFields
                          .filter((f) => song.custom?.[f.id])
                          .map((f) => (
                            <span key={f.id} className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-[11px] text-[#a3a3a3]">
                              {f.name}: <span className="text-[#f5f5f5]">{song.custom![f.id]}</span>
                            </span>
                          ))}
                      </div>
                    )}
                    {parseLinks(song.fileLinks).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#2a2a2a] pt-2">
                        {parseLinks(song.fileLinks).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-full border border-[#2a2a2a] bg-[#151515] px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-[#1c1c1c]"
                          >
                            <ExternalLink size={10} /> {linkLabel(url)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Board"
        subtitle="Songs, music videos, and projects. Drag cards between stages."
        action={
          <PrimaryButton onClick={openCreate}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> New Item
            </span>
          </PrimaryButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search the board..." />
        </div>
        <button
          onClick={() => setGroupByType((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            groupByType
              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
              : "border-[#2a2a2a] bg-[#151515] text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
          }`}
        >
          {groupByType ? "Grouped by type" : "Group by type"}
        </button>
      </div>

      {songs.length === 0 ? (
        <EmptyState title="Nothing on the board" subtitle="Add a song, video, or project to get started." />
      ) : groupByType ? (
        <div className="space-y-6">
          {typeLanes.map((lane) => (
            <div key={lane}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f5f5f5]">
                <span className={`h-2.5 w-2.5 rounded-sm ${categoryDot(lane)}`} />
                {lane}
              </h3>
              {renderBoard(laneItems(lane))}
            </div>
          ))}
        </div>
      ) : (
        renderBoard(activeItems)
      )}

      {archivedItems.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[#2a2a2a] bg-[#0c0c0c]">
          <button
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[#a3a3a3] hover:text-[#f5f5f5]"
          >
            <span>Archive · {archivedItems.length} finished {archivedItems.length === 1 ? "item" : "items"}</span>
            <span className="text-xs">{archiveOpen ? "Hide" : "Show"}</span>
          </button>
          {archiveOpen && (
            <ul className="divide-y divide-[#1c1c1c] border-t border-[#1c1c1c]">
              {archivedItems.map((song) => (
                <li
                  key={song.id}
                  onClick={() => openEdit(song)}
                  className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-[#151515]"
                >
                  <span className="text-[#f5f5f5]">{song.title}</span>
                  <span className="flex items-center gap-2 text-xs text-[#a3a3a3]">
                    {song.itemType && song.itemType !== "Song" && <span>{song.itemType}</span>}
                    <span>{song.stage}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Item" : "New Item"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })}>
              {settings.itemTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {columns.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {settings.priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <FormInput type="date" label="Release date" value={form.releaseDate} onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} />
          </div>
          <FormInput
            label="Hashtags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="#june26 — budget entries with the same tag count toward this release"
          />
          <FormInput label="Next action" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
          {settings.customFields.map((f) => (
            <FormInput
              key={f.id}
              label={f.name}
              value={form.custom[f.id] ?? ""}
              onChange={(e) => setForm({ ...form, custom: { ...form.custom, [f.id]: e.target.value } })}
            />
          ))}
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <TextArea
            label="Google Drive / file links (one per line)"
            value={form.fileLinks}
            onChange={(e) => setForm({ ...form, fileLinks: e.target.value })}
            placeholder={"https://drive.google.com/...\nPaste share links to stems, masters, cover art..."}
            className="min-h-[60px]"
          />
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">{editing ? "Save" : "Create"}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
