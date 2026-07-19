import { useState } from "react";
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
import { Priority, SONG_STAGES, Song, SongStage } from "../types/os";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";

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

const emptyForm = {
  title: "",
  stage: "Idea" as SongStage,
  priority: "Medium" as Priority,
  vibe: "",
  theme: "",
  genre: "",
  bpm: "",
  key: "",
  collaborators: "",
  producer: "",
  nextAction: "",
  releasePotential: "Medium" as Priority,
  notes: "",
  fileLinks: "",
};

export default function SongsPage() {
  const songs = useOSStore((s) => s.songs);
  const addSong = useOSStore((s) => s.addSong);
  const updateSong = useOSStore((s) => s.updateSong);
  const deleteSong = useOSStore((s) => s.deleteSong);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

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
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editing) {
      updateSong(editing.id, form);
    } else {
      addSong(form);
    }
    setModalOpen(false);
  }

  const filtered = songs.filter((s) =>
    `${s.title} ${s.genre} ${s.theme} ${s.vibe}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <SectionHeader
        title="Songs"
        subtitle="Track every song from idea to release."
        action={
          <PrimaryButton onClick={openCreate}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> New Song
            </span>
          </PrimaryButton>
        }
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search songs by title, genre, theme..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No songs found" subtitle="Add a song to start the pipeline." />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {SONG_STAGES.map((stage) => {
            const stageSongs = filtered.filter((s) => s.stage === stage);
            if (stageSongs.length === 0) return null;
            return (
              <div key={stage} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-medium text-[#f5f5f5]">{stage}</h3>
                  <span className="text-xs text-[#a3a3a3]">{stageSongs.length}</span>
                </div>
                <div className="space-y-3">
                  {stageSongs.map((song) => (
                    <div key={song.id} className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 transition-colors hover:border-[#3a3a3a]">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[#f5f5f5]">{song.title}</h4>
                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton onClick={() => openEdit(song)}>
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton onClick={() => deleteSong(song.id)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <PriorityPill priority={song.priority} />
                        {song.genre && <span className="rounded-full bg-[#1c1c1c] px-2.5 py-0.5 text-xs text-[#a3a3a3]">{song.genre}</span>}
                      </div>
                      {song.nextAction && (
                        <div className="mt-2 text-xs text-[#a3a3a3]">
                          Next: <span className="text-[#f5f5f5]">{song.nextAction}</span>
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
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Song" : "New Song"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as SongStage })}>
              {SONG_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
          </div>
          <FormInput label="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
          <FormInput label="Next action" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
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
