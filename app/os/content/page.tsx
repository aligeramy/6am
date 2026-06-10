"use client";

import { useMemo, useState } from "react";
import { useOSStore } from "@/lib/os/store";
import {
  SectionHeader,
  StatusPill,
  EmptyState,
  Modal,
  FormInput,
  TextArea,
  Select,
  DateInput,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  SearchBar,
  FilterBar,
  DashboardCard,
} from "@/components/os/ui";
import {
  CONTENT_FORMATS,
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  ContentFormat,
  ContentItem,
  ContentPlatform,
  ContentStatus,
} from "@/types/os";
import { Plus, Trash2, Pencil } from "lucide-react";

const emptyForm = {
  title: "",
  platform: "TikTok" as ContentPlatform,
  linkedSongId: "",
  format: "performance/lip sync" as ContentFormat,
  status: "Idea" as ContentStatus,
  caption: "",
  filmingNotes: "",
  postDate: "",
  views: "0",
  likes: "0",
  comments: "0",
  shares: "0",
  saves: "0",
  learning: "",
};

export default function ContentPage() {
  const content = useOSStore((s) => s.content);
  const songs = useOSStore((s) => s.songs);
  const addContent = useOSStore((s) => s.addContent);
  const updateContent = useOSStore((s) => s.updateContent);
  const deleteContent = useOSStore((s) => s.deleteContent);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setForm({
      title: item.title,
      platform: item.platform,
      linkedSongId: item.linkedSongId ?? "",
      format: item.format,
      status: item.status,
      caption: item.caption,
      filmingNotes: item.filmingNotes,
      postDate: item.postDate,
      views: String(item.metrics.views),
      likes: String(item.metrics.likes),
      comments: String(item.metrics.comments),
      shares: String(item.metrics.shares),
      saves: String(item.metrics.saves),
      learning: item.learning,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      platform: form.platform,
      linkedSongId: form.linkedSongId || null,
      format: form.format,
      status: form.status,
      caption: form.caption,
      filmingNotes: form.filmingNotes,
      postDate: form.postDate,
      metrics: {
        views: Number(form.views) || 0,
        likes: Number(form.likes) || 0,
        comments: Number(form.comments) || 0,
        shares: Number(form.shares) || 0,
        saves: Number(form.saves) || 0,
      },
      learning: form.learning,
    };
    if (editing) {
      updateContent(editing.id, payload);
    } else {
      addContent(payload);
    }
    setModalOpen(false);
  }

  const filtered = content.filter((c) => {
    if (platformFilter !== "All" && c.platform !== platformFilter) return false;
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    if (search && !`${c.title} ${c.caption}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const scheduled = content.filter((c) => c.status === "Scheduled" && c.postDate);
  const posted = content.filter((c) => c.status === "Posted" || c.status === "Reviewed");

  const calendarDays = useMemo(() => {
    const days: { date: Date; items: ContentItem[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const items = scheduled.filter((c) => {
        const pd = new Date(c.postDate);
        return pd.toDateString() === d.toDateString();
      });
      days.push({ date: d, items });
    }
    return days;
  }, [scheduled]);

  return (
    <div>
      <SectionHeader
        title="Content"
        subtitle="Manage TikTok, Reels, Shorts and promo ideas."
        action={
          <PrimaryButton onClick={openCreate}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> New Content Idea
            </span>
          </PrimaryButton>
        }
      />

      {/* Calendar */}
      <DashboardCard title="Content Calendar (next 7 days)" className="mb-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {calendarDays.map(({ date, items }) => (
            <div key={date.toISOString()} className="rounded-xl border border-[#2a2a2a] bg-[#0c0c0c] p-2 min-h-[80px]">
              <div className="text-xs font-medium text-[#a3a3a3]">
                {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
              </div>
              <div className="mt-1 space-y-1">
                {items.map((i) => (
                  <div key={i.id} className="truncate rounded bg-violet-500/15 px-1.5 py-0.5 text-[11px] text-violet-200">
                    {i.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search content..." />
        <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="max-w-[180px]">
          <option value="All">All platforms</option>
          {CONTENT_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[180px]">
          <option value="All">All statuses</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No content ideas found" subtitle="Add an idea to start filling your content engine." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const linkedSong = songs.find((s) => s.id === item.linkedSongId);
            return (
              <DashboardCard key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#f5f5f5]">{item.title}</h4>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton onClick={() => openEdit(item)}>
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton onClick={() => deleteContent(item.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusPill status={item.status} />
                  <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{item.platform}</span>
                  <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{item.format}</span>
                </div>
                {linkedSong && <div className="mt-2 text-xs text-[#a3a3a3]">Linked: {linkedSong.title}</div>}
                {item.caption && <p className="mt-2 text-sm text-[#a3a3a3] line-clamp-2">{item.caption}</p>}
                {item.postDate && (
                  <div className="mt-2 text-xs text-[#6b6b6b]">Post date: {new Date(item.postDate).toLocaleDateString()}</div>
                )}
              </DashboardCard>
            );
          })}
        </div>
      )}

      {/* Posted content review */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-[#a3a3a3]">Posted Content / Performance Notes</h2>
        {posted.length === 0 ? (
          <EmptyState title="Nothing posted yet" subtitle="Once you post content, review it here — framed as learning, not judgment." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {posted.map((item) => (
              <DashboardCard key={item.id} title={item.title}>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{item.platform}</span>
                  <StatusPill status={item.status} />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[#f5f5f5]">{item.metrics.views}</div>
                    <div className="text-[#6b6b6b]">views</div>
                  </div>
                  <div>
                    <div className="text-[#f5f5f5]">{item.metrics.likes}</div>
                    <div className="text-[#6b6b6b]">likes</div>
                  </div>
                  <div>
                    <div className="text-[#f5f5f5]">{item.metrics.comments}</div>
                    <div className="text-[#6b6b6b]">comments</div>
                  </div>
                  <div>
                    <div className="text-[#f5f5f5]">{item.metrics.shares}</div>
                    <div className="text-[#6b6b6b]">shares</div>
                  </div>
                  <div>
                    <div className="text-[#f5f5f5]">{item.metrics.saves}</div>
                    <div className="text-[#6b6b6b]">saves</div>
                  </div>
                </div>
                {item.learning && (
                  <div className="mt-3 rounded-lg bg-[#0c0c0c] p-3 text-sm text-[#a3a3a3]">
                    <span className="text-xs uppercase tracking-wide text-cyan-300">What did this teach me?</span>
                    <p className="mt-1 text-[#f5f5f5]">{item.learning}</p>
                  </div>
                )}
              </DashboardCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Content Idea" : "New Content Idea"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput label="Title / hook" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as ContentPlatform })}>
              {CONTENT_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Select label="Format" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as ContentFormat })}>
              {CONTENT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Linked song" value={form.linkedSongId} onChange={(e) => setForm({ ...form, linkedSongId: e.target.value })}>
              <option value="">None</option>
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </Select>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <TextArea label="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          <TextArea label="Filming notes" value={form.filmingNotes} onChange={(e) => setForm({ ...form, filmingNotes: e.target.value })} />
          <DateInput label="Post date" value={form.postDate} onChange={(e) => setForm({ ...form, postDate: e.target.value })} />
          <div>
            <span className="mb-1 block text-xs font-medium text-[#a3a3a3]">Metrics</span>
            <div className="grid grid-cols-5 gap-2">
              <FormInput type="number" placeholder="Views" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} />
              <FormInput type="number" placeholder="Likes" value={form.likes} onChange={(e) => setForm({ ...form, likes: e.target.value })} />
              <FormInput type="number" placeholder="Comments" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
              <FormInput type="number" placeholder="Shares" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} />
              <FormInput type="number" placeholder="Saves" value={form.saves} onChange={(e) => setForm({ ...form, saves: e.target.value })} />
            </div>
          </div>
          <TextArea label="What did this teach me?" value={form.learning} onChange={(e) => setForm({ ...form, learning: e.target.value })} />
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
