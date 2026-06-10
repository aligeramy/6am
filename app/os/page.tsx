"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useOSStore } from "@/lib/os/store";
import {
  DashboardCard,
  StatCard,
  ProgressBar,
  StatusPill,
  PriorityPill,
  SectionHeader,
  EmptyState,
  IconButton,
} from "@/components/os/ui";
import { Plus, Trash2, Check } from "lucide-react";
import { TaskArea } from "@/types/os";

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const EXECUTE_AREAS: { area: TaskArea; label: string }[] = [
  { area: "Release", label: "Release Task" },
  { area: "Content", label: "Content Task" },
  { area: "Creative", label: "Creative Task" },
];

export default function TodayPage() {
  const releases = useOSStore((s) => s.releases);
  const songs = useOSStore((s) => s.songs);
  const content = useOSStore((s) => s.content);
  const vault = useOSStore((s) => s.vault);
  const tasks = useOSStore((s) => s.tasks);
  const notToday = useOSStore((s) => s.notToday);
  const todayPriority = useOSStore((s) => s.todayPriority);

  const setTodayPriority = useOSStore((s) => s.setTodayPriority);
  const addVaultItem = useOSStore((s) => s.addVaultItem);
  const addNotToday = useOSStore((s) => s.addNotToday);
  const deleteNotToday = useOSStore((s) => s.deleteNotToday);
  const updateTask = useOSStore((s) => s.updateTask);

  const [priorityDraft, setPriorityDraft] = useState(todayPriority);
  const [capture, setCapture] = useState("");
  const [newNotToday, setNewNotToday] = useState("");

  const activeRelease = useMemo(() => {
    const active = releases.filter((r) => r.phase !== "Released" && r.phase !== "Archived" && r.phase !== "Post-release");
    return active.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())[0];
  }, [releases]);

  const linkedSong = activeRelease ? songs.find((s) => s.id === activeRelease.linkedSongId) : undefined;

  const nextReleaseTasks = useMemo(() => {
    if (!activeRelease) return [];
    const all = [
      ...activeRelease.preReleaseChecklist,
      ...activeRelease.releaseDayChecklist,
      ...activeRelease.postReleaseChecklist,
    ];
    return all.filter((i) => !i.done).slice(0, 3);
  }, [activeRelease]);

  const upcomingReleasesCount = releases.filter((r) => r.phase !== "Released" && r.phase !== "Archived").length;
  const contentReadyCount = content.filter((c) => c.status === "Idea" || c.status === "Scripted").length;
  const tasksDueThisWeek = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    return tasks.filter((t) => {
      if (t.status === "Done" || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= weekFromNow;
    }).length;
  }, [tasks]);

  function handleCapture() {
    const text = capture.trim();
    if (!text) return;
    addVaultItem({
      category: "Random note",
      text,
      mood: "",
      linkedSongId: null,
      priority: "Medium",
      status: "Raw",
    });
    setCapture("");
  }

  function handleAddNotToday() {
    const text = newNotToday.trim();
    if (!text) return;
    addNotToday(text);
    setNewNotToday("");
  }

  return (
    <div>
      <SectionHeader title="Today" subtitle="Your music command center for right now." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Active Release */}
        <DashboardCard title="Current Active Release" className="lg:col-span-2">
          {activeRelease ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold text-[#f5f5f5]">
                    {linkedSong?.title ?? activeRelease.title}
                  </div>
                  <div className="mt-1 text-sm text-[#a3a3a3]">
                    Releases {new Date(activeRelease.releaseDate).toLocaleDateString()} ·{" "}
                    {daysUntil(activeRelease.releaseDate)} days to go
                  </div>
                </div>
                <StatusPill status={activeRelease.phase} />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-[#a3a3a3]">
                  <span>Progress</span>
                  <span>{activeRelease.progress}%</span>
                </div>
                <ProgressBar value={activeRelease.progress} />
              </div>

              {nextReleaseTasks.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-[#a3a3a3]">Next 3 Tasks</div>
                  <ul className="space-y-1.5 text-sm text-[#f5f5f5]">
                    {nextReleaseTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        {t.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <Link href="/os/releases" className="text-sm font-medium text-cyan-300 hover:underline">
                  View release →
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState title="No active release" subtitle="Add a release on the Releases page to see it here." />
          )}
        </DashboardCard>

        {/* Today's priority */}
        <DashboardCard title="Today's Music Priority">
          <p className="mb-3 text-xs text-[#a3a3a3]">
            One thing only. What is the next correct music move?
          </p>
          <textarea
            value={priorityDraft}
            onChange={(e) => setPriorityDraft(e.target.value)}
            onBlur={() => setTodayPriority(priorityDraft)}
            className="min-h-[100px] w-full resize-y rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            placeholder="e.g. Create one TikTok for the June 26 song"
          />
        </DashboardCard>
      </div>

      {/* Execute Today */}
      <div className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-[#a3a3a3]">Execute Today</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {EXECUTE_AREAS.map(({ area, label }) => {
            const task = tasks
              .filter((t) => t.area === area && t.status !== "Done")
              .sort((a, b) => new Date(a.dueDate || "9999").getTime() - new Date(b.dueDate || "9999").getTime())[0];
            const linkedSongTitle = task?.linkedSongId
              ? songs.find((s) => s.id === task.linkedSongId)?.title
              : undefined;
            const linkedReleaseTitle = task?.linkedReleaseId
              ? releases.find((r) => r.id === task.linkedReleaseId)?.title
              : undefined;
            const linked = linkedSongTitle ?? linkedReleaseTitle;

            return (
              <DashboardCard key={area} title={label}>
                {task ? (
                  <div>
                    <div className="text-sm font-medium text-[#f5f5f5]">{task.title}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill status={task.status} />
                      <PriorityPill priority={task.priority} />
                    </div>
                    {linked && (
                      <div className="mt-2 text-xs text-[#a3a3a3]">Linked: {linked}</div>
                    )}
                    <button
                      onClick={() => updateTask(task.id, { status: "Done" })}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#151515] px-3 py-1.5 text-xs font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
                    >
                      <Check size={14} /> Mark done
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[#a3a3a3]">Nothing queued. Enjoy the breathing room.</p>
                )}
              </DashboardCard>
            );
          })}
        </div>
      </div>

      {/* Quick Capture + Not Today */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard title="Quick Capture">
          <p className="mb-3 text-xs text-[#a3a3a3]">
            Dump any idea — lyric, content, visual, rollout. It goes straight to the Vault.
          </p>
          <div className="flex gap-2">
            <input
              value={capture}
              onChange={(e) => setCapture(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCapture()}
              placeholder="Type an idea and hit enter..."
              className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <button
              onClick={handleCapture}
              className="rounded-lg bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              <Plus size={16} />
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Not Today">
          <p className="mb-3 text-xs text-[#a3a3a3]">Things you're intentionally not focusing on today.</p>
          <ul className="space-y-1.5">
            {notToday.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm text-[#f5f5f5] hover:bg-[#1c1c1c]">
                <span>{item.text}</span>
                <IconButton onClick={() => deleteNotToday(item.id)}>
                  <Trash2 size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={newNotToday}
              onChange={(e) => setNewNotToday(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNotToday()}
              placeholder="Add something to leave alone today..."
              className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <button
              onClick={handleAddNotToday}
              className="rounded-lg border border-[#2a2a2a] bg-[#151515] px-3 py-2 text-sm font-medium text-[#f5f5f5] hover:bg-[#1c1c1c]"
            >
              <Plus size={16} />
            </button>
          </div>
        </DashboardCard>
      </div>

      {/* Snapshot */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Active Songs" value={songs.filter((s) => s.stage !== "Released" && s.stage !== "Archived").length} />
        <StatCard label="Upcoming Releases" value={upcomingReleasesCount} />
        <StatCard label="Content Ready" value={contentReadyCount} />
        <StatCard label="Tasks Due This Week" value={tasksDueThisWeek} accent="text-amber-300" />
        <StatCard label="Vault Ideas" value={vault.length} />
      </div>
    </div>
  );
}
