"use client";

import { useState } from "react";
import { useOSStore } from "@/lib/os/store";
import {
  DashboardCard,
  SectionHeader,
  StatusPill,
  ProgressBar,
  EmptyState,
  Modal,
  FormInput,
  TextArea,
  Select,
  DateInput,
  Checklist,
  PrimaryButton,
  SecondaryButton,
  IconButton,
} from "@/components/os/ui";
import { RELEASE_PHASES, Release, ReleasePhase } from "@/types/os";
import { Plus, Trash2, Pencil } from "lucide-react";

const emptyChecklist = (labels: string[]) =>
  labels.map((label, i) => ({ id: `${label}-${i}`.replace(/\s+/g, "-"), label, done: false }));

const PRE_LABELS = [
  "final master complete",
  "cover art complete",
  "metadata complete",
  "uploaded to distributor",
  "Spotify pitch complete",
  "pre-save link ready",
  "visualizer/canvas ready",
  "teaser clips selected",
  "caption ideas written",
  "announcement post planned",
  "playlist pitching started",
];
const DAY_LABELS = [
  "main post published",
  "stories posted",
  "bio/links updated",
  "friends/fans messaged",
  "comments engaged with",
  "post pinned",
  "performance checked once",
];
const POST_LABELS = [
  "repurpose clips",
  "behind-the-song post",
  "lyric content",
  "performance content",
  "acoustic/live version idea",
  "remix/DJ angle",
  "weekly analytics review",
  "learnings documented",
];

export default function ReleasesPage() {
  const releases = useOSStore((s) => s.releases);
  const songs = useOSStore((s) => s.songs);
  const addRelease = useOSStore((s) => s.addRelease);
  const updateRelease = useOSStore((s) => s.updateRelease);
  const deleteRelease = useOSStore((s) => s.deleteRelease);
  const toggleChecklistItem = useOSStore((s) => s.toggleChecklistItem);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Release | null>(null);
  const [form, setForm] = useState({
    title: "",
    linkedSongId: "",
    releaseDate: "",
    phase: "Planning" as ReleasePhase,
    progress: 0,
    notes: "",
  });

  function openCreate() {
    setEditing(null);
    setForm({ title: "", linkedSongId: "", releaseDate: "", phase: "Planning", progress: 0, notes: "" });
    setModalOpen(true);
  }

  function openEdit(release: Release) {
    setEditing(release);
    setForm({
      title: release.title,
      linkedSongId: release.linkedSongId ?? "",
      releaseDate: release.releaseDate,
      phase: release.phase,
      progress: release.progress,
      notes: release.notes,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editing) {
      updateRelease(editing.id, {
        title: form.title,
        linkedSongId: form.linkedSongId || null,
        releaseDate: form.releaseDate,
        phase: form.phase,
        progress: form.progress,
        notes: form.notes,
      });
    } else {
      addRelease({
        title: form.title,
        linkedSongId: form.linkedSongId || null,
        releaseDate: form.releaseDate,
        phase: form.phase,
        progress: form.progress,
        notes: form.notes,
        preReleaseChecklist: emptyChecklist(PRE_LABELS),
        releaseDayChecklist: emptyChecklist(DAY_LABELS),
        postReleaseChecklist: emptyChecklist(POST_LABELS),
      });
    }
    setModalOpen(false);
  }

  return (
    <div>
      <SectionHeader
        title="Releases"
        subtitle="Plan and track each release from idea to post-release."
        action={
          <PrimaryButton onClick={openCreate}>
            <span className="flex items-center gap-1.5">
              <Plus size={16} /> New Release
            </span>
          </PrimaryButton>
        }
      />

      {releases.length === 0 ? (
        <EmptyState title="No releases yet" subtitle="Create your first release to start planning a rollout." />
      ) : (
        <div className="space-y-4">
          {releases
            .slice()
            .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
            .map((release) => {
              const linkedSong = songs.find((s) => s.id === release.linkedSongId);
              return (
                <DashboardCard key={release.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[#f5f5f5]">{release.title}</h3>
                        <StatusPill status={release.phase} />
                      </div>
                      <div className="mt-1 text-sm text-[#a3a3a3]">
                        {linkedSong ? `${linkedSong.title} · ` : ""}
                        {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString() : "No date set"}
                      </div>
                      {release.notes && <p className="mt-2 max-w-xl text-sm text-[#a3a3a3]">{release.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton onClick={() => openEdit(release)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton onClick={() => deleteRelease(release.id)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-[#a3a3a3]">
                      <span>Progress</span>
                      <span>{release.progress}%</span>
                    </div>
                    <ProgressBar value={release.progress} />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-[#a3a3a3]">Pre-release</div>
                      <Checklist
                        items={release.preReleaseChecklist}
                        onToggle={(id) => toggleChecklistItem(release.id, "preReleaseChecklist", id)}
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-[#a3a3a3]">Release Day</div>
                      <Checklist
                        items={release.releaseDayChecklist}
                        onToggle={(id) => toggleChecklistItem(release.id, "releaseDayChecklist", id)}
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-[#a3a3a3]">Post-release</div>
                      <Checklist
                        items={release.postReleaseChecklist}
                        onToggle={(id) => toggleChecklistItem(release.id, "postReleaseChecklist", id)}
                      />
                    </div>
                  </div>
                </DashboardCard>
              );
            })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Release" : "New Release"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormInput
            label="Release title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            label="Linked song"
            value={form.linkedSongId}
            onChange={(e) => setForm({ ...form, linkedSongId: e.target.value })}
          >
            <option value="">None</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="Release date"
              value={form.releaseDate}
              onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
            />
            <Select
              label="Phase"
              value={form.phase}
              onChange={(e) => setForm({ ...form, phase: e.target.value as ReleasePhase })}
            >
              {RELEASE_PHASES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <FormInput
            label="Progress (%)"
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
          />
          <TextArea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
