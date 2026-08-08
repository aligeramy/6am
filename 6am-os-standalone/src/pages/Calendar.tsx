import { useMemo, useState } from "react";
import { useOSStore, normalizeChecklistItem } from "../lib/store";
import { SectionHeader, Modal, FormInput, TextArea, Select, PrimaryButton, SecondaryButton } from "../components/ui";
import { ChevronLeft, ChevronRight, Trash2, Check, Minus, Plus } from "lucide-react";
import { buildReleaseChecklist } from "../lib/seed";
import { categoryChip, categoryDot, parseTags, tagsToInput } from "../lib/categories";
import { Song } from "../types/os";

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarSection() {
  const songs = useOSStore((s) => s.songs);
  const settings = useOSStore((s) => s.settings);
  const addSong = useOSStore((s) => s.addSong);
  const updateSong = useOSStore((s) => s.updateSong);
  const deleteSong = useOSStore((s) => s.deleteSong);
  const toggleSongChecklistItem = useOSStore((s) => s.toggleSongChecklistItem);
  const adjustSongChecklistCount = useOSStore((s) => s.adjustSongChecklistCount);

  const [cursor, setCursor] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", itemType: "Main Release", date: "", tags: "", notes: "" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const editing = editingId ? songs.find((s) => s.id === editingId) ?? null : null;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Song[]>();
    for (const s of songs) {
      if (!s.releaseDate) continue;
      const key = s.releaseDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [songs]);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  function openCreate(dateKey: string) {
    if (dragId) return;
    setEditingId(null);
    setForm({ title: "", itemType: settings.itemTypes[0] ?? "Main Release", date: dateKey, tags: "", notes: "" });
    setModalOpen(true);
  }

  function openEdit(s: Song) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      itemType: s.itemType ?? "Main Release",
      date: (s.releaseDate ?? "").slice(0, 10),
      tags: tagsToInput(s.tags),
      notes: s.notes,
    });
    setModalOpen(true);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.title.trim()) return;
    const base = {
      title: form.title,
      itemType: form.itemType,
      releaseDate: form.date,
      tags: parseTags(form.tags),
      notes: form.notes,
    };
    if (editing) {
      const patch: Partial<Song> = { ...base };
      if (form.itemType === "Main Release" && !editing.checklist?.length) patch.checklist = buildReleaseChecklist();
      updateSong(editing.id, patch);
    } else {
      addSong({
        ...base,
        stage: settings.stages[0] ?? "Idea",
        priority: settings.priorities[0] ?? "High",
        checklist: form.itemType === "Main Release" ? buildReleaseChecklist() : undefined,
        vibe: "",
        theme: "",
        genre: "",
        bpm: "",
        key: "",
        collaborators: "",
        producer: "",
        nextAction: "",
        releasePotential: "Medium",
        fileLinks: "",
      });
    }
    setModalOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    deleteSong(editing.id);
    setModalOpen(false);
  }

  function handleDrop(dateKey: string) {
    if (dragId) updateSong(dragId, { releaseDate: dateKey });
    setDragId(null);
    setDragOver(null);
  }

  const todayKey = toDateKey(new Date());
  const currentMonth = cursor.getMonth();

  return (
    <div>
      <SectionHeader
        title="Calendar"
        subtitle="What's coming out when. Click a day to add, drag to reschedule."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date())}
              className="rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
            >
              Today
            </button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-1.5 text-[#f5f5f5] hover:bg-[#1c1c1c]">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium text-[#f5f5f5]">{monthLabel(cursor)}</span>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-1.5 text-[#f5f5f5] hover:bg-[#1c1c1c]">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#a3a3a3]">
        {settings.itemTypes.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${categoryDot(t)}`} />
            {t}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#2a2a2a]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-[#0c0c0c] px-2 py-1.5 text-center text-xs font-medium text-[#a3a3a3]">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = toDateKey(d);
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = d.getMonth() === currentMonth;
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              onClick={() => openCreate(key)}
              onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(key)}
              className={`min-h-[96px] cursor-pointer p-1.5 transition-colors ${
                dragOver === key ? "bg-violet-500/10" : "bg-[#0c0c0c] hover:bg-[#111111]"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <div className={`mb-1 text-xs ${isToday ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/90 font-semibold text-white" : "text-[#a3a3a3]"}`}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.map((s) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(ev) => { ev.stopPropagation(); setDragId(s.id); }}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onClick={(ev) => { ev.stopPropagation(); openEdit(s); }}
                    className={`cursor-grab truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium active:cursor-grabbing ${categoryChip(s.itemType)}`}
                  >
                    {s.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Release" : "New Release"}>
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
            <FormInput type="date" label="Date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <FormInput
            label="Hashtags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="#june26 #video"
          />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          {editing && (editing.checklist?.length ?? 0) > 0 && (
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-[#a3a3a3]">Release To-Do</div>
              <ul className="space-y-1">
                {(editing.checklist ?? []).map(normalizeChecklistItem).map((item) =>
                  item.target ? (
                    <li key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          item.done ? "border-violet-500 bg-violet-500/90 text-white" : "border-[#2a2a2a]"
                        }`}
                      >
                        {item.done && <Check size={11} />}
                      </span>
                      <span className={`flex-1 ${item.done ? "text-[#a3a3a3] line-through" : "text-[#f5f5f5]"}`}>{item.label}</span>
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustSongChecklistCount(editing.id, item.id, -1)}
                          className="rounded-md border border-[#2a2a2a] bg-[#151515] p-1 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
                        >
                          <Minus size={12} />
                        </button>
                        <span className={`min-w-[52px] text-center text-xs font-semibold ${item.done ? "text-emerald-400" : "text-violet-300"}`}>
                          {item.count ?? 0} / {item.target}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustSongChecklistCount(editing.id, item.id, 1)}
                          className="rounded-md border border-[#2a2a2a] bg-[#151515] p-1 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
                        >
                          <Plus size={12} />
                        </button>
                      </span>
                    </li>
                  ) : (
                    <li
                      key={item.id}
                      onClick={() => toggleSongChecklistItem(editing.id, item.id)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#1c1c1c]"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          item.done ? "border-violet-500 bg-violet-500/90 text-white" : "border-[#2a2a2a]"
                        }`}
                      >
                        {item.done && <Check size={11} />}
                      </span>
                      <span className={item.done ? "text-[#a3a3a3] line-through" : "text-[#f5f5f5]"}>{item.label}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {editing ? (
              <button type="button" onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-[#1c1c1c]">
                <Trash2 size={14} /> Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit">{editing ? "Save" : "Create"}</PrimaryButton>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
