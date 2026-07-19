import { useMemo, useState } from "react";
import { useOSStore } from "../lib/store";
import { SectionHeader, Modal, FormInput, TextArea, Select, PrimaryButton, SecondaryButton } from "../components/ui";
import { ChevronLeft, ChevronRight, Trash2, Check } from "lucide-react";
import { buildReleaseChecklist } from "../lib/seed";
import { normalizeChecklistItem } from "../lib/store";
import { Minus, Plus } from "lucide-react";

type EventKind = "release" | "content" | "studio";

interface CalEvent {
  id: string;
  kind: EventKind;
  title: string;
  date: string;
  notes: string;
}

const KIND_STYLES: Record<EventKind, string> = {
  release: "bg-violet-500/20 text-violet-300",
  content: "bg-cyan-500/20 text-cyan-300",
  studio: "bg-amber-500/20 text-amber-300",
};

const KIND_LABELS: Record<EventKind, string> = {
  release: "Release",
  content: "Content",
  studio: "Studio session",
};

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const releases = useOSStore((s) => s.releases);
  const content = useOSStore((s) => s.content);
  const addRelease = useOSStore((s) => s.addRelease);
  const addContent = useOSStore((s) => s.addContent);
  const updateRelease = useOSStore((s) => s.updateRelease);
  const updateContent = useOSStore((s) => s.updateContent);
  const deleteRelease = useOSStore((s) => s.deleteRelease);
  const deleteContent = useOSStore((s) => s.deleteContent);
  const toggleChecklistItem = useOSStore((s) => s.toggleChecklistItem);
  const adjustChecklistCount = useOSStore((s) => s.adjustChecklistCount);

  const [cursor, setCursor] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [draftDate, setDraftDate] = useState("");
  const [form, setForm] = useState({ kind: "content" as EventKind, title: "", notes: "" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const events: CalEvent[] = useMemo(() => {
    const r: CalEvent[] = releases.map((x) => ({ id: x.id, kind: "release" as EventKind, title: x.title, date: x.releaseDate, notes: x.notes }));
    const c: CalEvent[] = content.map((x) => ({
      id: x.id,
      kind: (x.format === "studio clip" ? "studio" : "content") as EventKind,
      title: x.title,
      date: x.postDate,
      notes: x.caption,
    }));
    return [...r, ...c].filter((e) => e.date);
  }, [releases, content]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

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
    setEditing(null);
    setDraftDate(dateKey);
    setForm({ kind: "content", title: "", notes: "" });
    setModalOpen(true);
  }

  function openEdit(e: CalEvent) {
    setEditing(e);
    setDraftDate(e.date.slice(0, 10));
    setForm({ kind: e.kind, title: e.title, notes: e.notes });
    setModalOpen(true);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.title.trim()) return;
    if (editing) {
      if (editing.kind === "release") updateRelease(editing.id, { title: form.title, releaseDate: draftDate, notes: form.notes });
      else updateContent(editing.id, { title: form.title, postDate: draftDate, caption: form.notes });
    } else if (form.kind === "release") {
      addRelease({
        title: form.title,
        linkedSongId: null,
        releaseDate: draftDate,
        phase: "Planning",
        progress: 0,
        notes: form.notes,
        preReleaseChecklist: buildReleaseChecklist(),
        releaseDayChecklist: [],
        postReleaseChecklist: [],
      });
    } else {
      addContent({
        title: form.title,
        platform: "TikTok",
        linkedSongId: null,
        format: form.kind === "studio" ? "studio clip" : "other",
        status: "Idea",
        caption: form.notes,
        filmingNotes: "",
        postDate: draftDate,
        metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
        learning: "",
      });
    }
    setModalOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    if (editing.kind === "release") deleteRelease(editing.id);
    else deleteContent(editing.id);
    setModalOpen(false);
  }

  function handleDrop(dateKey: string) {
    if (!dragId) return;
    const e = events.find((ev) => ev.id === dragId);
    if (e) {
      if (e.kind === "release") updateRelease(e.id, { releaseDate: dateKey });
      else updateContent(e.id, { postDate: dateKey });
    }
    setDragId(null);
    setDragOver(null);
  }

  const todayKey = toDateKey(new Date());
  const currentMonth = cursor.getMonth();

  const editingRelease = editing && editing.kind === "release" ? releases.find((r) => r.id === editing.id) : null;

  return (
    <div>
      <SectionHeader
        title="Calendar"
        subtitle="Click a day to add. Drag anything to reschedule."
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
        {(Object.keys(KIND_LABELS) as EventKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${KIND_STYLES[k].split(" ")[0]}`} />
            {KIND_LABELS[k]}
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
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={(ev) => { ev.stopPropagation(); setDragId(e.id); }}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                    className={`cursor-grab truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium active:cursor-grabbing ${KIND_STYLES[e.kind]}`}
                  >
                    {e.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Event" : "New Event"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!editing && (
            <Select label="Type" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}>
              <option value="content">Content post</option>
              <option value="studio">Studio session</option>
              <option value="release">Release</option>
            </Select>
          )}
          <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FormInput type="date" label="Date" required value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
          <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          {editingRelease && (
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-[#a3a3a3]">Release To-Do</div>
              <ul className="space-y-1">
                {editingRelease.preReleaseChecklist.map(normalizeChecklistItem).map((item) =>
                  item.target ? (
                    <li key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          item.done ? "border-violet-500 bg-violet-500/90 text-white" : "border-[#2a2a2a]"
                        }`}
                      >
                        {item.done && <Check size={11} />}
                      </span>
                      <span className={`flex-1 ${item.done ? "text-[#a3a3a3] line-through" : "text-[#f5f5f5]"}`}>
                        {item.label}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustChecklistCount(editingRelease.id, "preReleaseChecklist", item.id, -1)}
                          className="rounded-md border border-[#2a2a2a] bg-[#151515] p-1 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
                        >
                          <Minus size={12} />
                        </button>
                        <span className={`min-w-[52px] text-center text-xs font-semibold ${item.done ? "text-emerald-400" : "text-violet-300"}`}>
                          {item.count ?? 0} / {item.target}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustChecklistCount(editingRelease.id, "preReleaseChecklist", item.id, 1)}
                          className="rounded-md border border-[#2a2a2a] bg-[#151515] p-1 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]"
                        >
                          <Plus size={12} />
                        </button>
                      </span>
                    </li>
                  ) : (
                    <li
                      key={item.id}
                      onClick={() => toggleChecklistItem(editingRelease.id, "preReleaseChecklist", item.id)}
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
