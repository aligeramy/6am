"use client";

import { useState } from "react";
import { useOSStore } from "@/lib/os/store";
import {
  SectionHeader,
  PriorityPill,
  StatusPill,
  EmptyState,
  Modal,
  FormInput,
  TextArea,
  Select,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  SearchBar,
  FilterBar,
  DashboardCard,
} from "@/components/os/ui";
import { Priority, VAULT_CATEGORIES, VAULT_STATUSES, VaultCategory, VaultItem, VaultStatus } from "@/types/os";
import { Plus, Trash2, Pencil, ArrowUpRight } from "lucide-react";

const emptyForm = {
  category: "Random note" as VaultCategory,
  text: "",
  mood: "",
  linkedSongId: "",
  priority: "Medium" as Priority,
  status: "Raw" as VaultStatus,
};

export default function VaultPage() {
  const vault = useOSStore((s) => s.vault);
  const songs = useOSStore((s) => s.songs);
  const addVaultItem = useOSStore((s) => s.addVaultItem);
  const updateVaultItem = useOSStore((s) => s.updateVaultItem);
  const deleteVaultItem = useOSStore((s) => s.deleteVaultItem);
  const addSong = useOSStore((s) => s.addSong);
  const addContent = useOSStore((s) => s.addContent);
  const addTask = useOSStore((s) => s.addTask);
  const updateBrandNote = useOSStore((s) => s.updateBrandNote);
  const brand = useOSStore((s) => s.brand);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: VaultItem) {
    setEditing(item);
    setForm({
      category: item.category,
      text: item.text,
      mood: item.mood,
      linkedSongId: item.linkedSongId ?? "",
      priority: item.priority,
      status: item.status,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) return;
    const payload = {
      category: form.category,
      text: form.text,
      mood: form.mood,
      linkedSongId: form.linkedSongId || null,
      priority: form.priority,
      status: form.status,
    };
    if (editing) {
      updateVaultItem(editing.id, payload);
    } else {
      addVaultItem(payload);
    }
    setModalOpen(false);
  }

  function promote(item: VaultItem, target: "song" | "content" | "task" | "brand") {
    if (target === "song") {
      addSong({
        title: item.text.slice(0, 60),
        stage: "Idea",
        priority: item.priority,
        vibe: item.mood,
        theme: "",
        genre: "",
        bpm: null,
        key: "",
        collaborators: "",
        producer: "",
        nextAction: "Develop this idea",
        releasePotential: "Medium",
        notes: item.text,
        fileLinks: "",
      });
    } else if (target === "content") {
      addContent({
        title: item.text.slice(0, 60),
        platform: "TikTok",
        linkedSongId: item.linkedSongId,
        format: "other",
        status: "Idea",
        caption: item.text,
        filmingNotes: "",
        postDate: "",
        metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
        learning: "",
      });
    } else if (target === "task") {
      addTask({
        title: item.text.slice(0, 80),
        area: "Creative",
        linkedSongId: item.linkedSongId,
        linkedReleaseId: null,
        linkedContentId: null,
        dueDate: "",
        priority: item.priority,
        status: "Not Started",
        notes: item.text,
      });
    } else if (target === "brand") {
      const note = brand.find((b) => b.section === "Copy Bank");
      if (note) {
        updateBrandNote(note.id, { content: `${note.content}\n- ${item.text}` });
      }
    }
    updateVaultItem(item.id, { status: "Promoted" });
  }

  const filtered = vault.filter((v) => {
    if (categoryFilter !== "All" && v.category !== categoryFilter) return false;
    if (statusFilter !== "All" && v.status !== statusFilter) return false;
    if (search && !v.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <SectionHeader
        title="Vault"
        subtitle="Storage for ideas, not a to-do list. Pressure-free."
        action={
          <PrimaryButton onClick={openCreate}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> New Idea
            </span>
          </PrimaryButton>
        }
      />

      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search vault..." />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="max-w-[180px]">
          <option value="All">All categories</option>
          {VAULT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[180px]">
          <option value="All">All statuses</option>
          {VAULT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="The vault is empty" subtitle="Capture an idea — it's just storage, no pressure." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const linkedSong = songs.find((s) => s.id === item.linkedSongId);
            return (
              <DashboardCard key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{item.category}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton onClick={() => openEdit(item)}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton onClick={() => deleteVaultItem(item.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#f5f5f5]">{item.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <PriorityPill priority={item.priority} />
                  <StatusPill status={item.status} />
                  {item.mood && <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{item.mood}</span>}
                  {linkedSong && <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{linkedSong.title}</span>}
                </div>
                {item.status !== "Promoted" && item.status !== "Archived" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button onClick={() => promote(item, "song")} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-xs text-[#f5f5f5] hover:bg-[#1c1c1c]">
                      <ArrowUpRight size={12} /> Song
                    </button>
                    <button onClick={() => promote(item, "content")} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-xs text-[#f5f5f5] hover:bg-[#1c1c1c]">
                      <ArrowUpRight size={12} /> Content
                    </button>
                    <button onClick={() => promote(item, "task")} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-xs text-[#f5f5f5] hover:bg-[#1c1c1c]">
                      <ArrowUpRight size={12} /> Release task
                    </button>
                    <button onClick={() => promote(item, "brand")} className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-xs text-[#f5f5f5] hover:bg-[#1c1c1c]">
                      <ArrowUpRight size={12} /> Brand note
                    </button>
                  </div>
                )}
              </DashboardCard>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Idea" : "New Idea"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <TextArea label="Idea" required value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VaultCategory })}>
              {VAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <FormInput label="Mood" value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VaultStatus })}>
              {VAULT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Linked song" value={form.linkedSongId} onChange={(e) => setForm({ ...form, linkedSongId: e.target.value })}>
            <option value="">None</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
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
