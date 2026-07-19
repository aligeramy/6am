import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOSStore } from "../lib/store";
import {
  DashboardCard,
  StatCard,
  ProgressBar,
  StatusPill,
  SectionHeader,
  EmptyState,
  IconButton,
} from "../components/ui";
import { Plus, Trash2, Check, Lightbulb } from "lucide-react";

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TodayPage() {
  const navigate = useNavigate();
  const releases = useOSStore((s) => s.releases);
  const songs = useOSStore((s) => s.songs);
  const content = useOSStore((s) => s.content);
  const tasks = useOSStore((s) => s.tasks);
  const vault = useOSStore((s) => s.vault);

  const priorityItems = useOSStore((s) => s.priorityItems);
  const addPriorityItem = useOSStore((s) => s.addPriorityItem);
  const togglePriorityItem = useOSStore((s) => s.togglePriorityItem);
  const deletePriorityItem = useOSStore((s) => s.deletePriorityItem);
  const addVaultItem = useOSStore((s) => s.addVaultItem);
  const deleteVaultItem = useOSStore((s) => s.deleteVaultItem);

  const [priorityDraft, setPriorityDraft] = useState("");
  const [capture, setCapture] = useState("");
  const [tasksOpen, setTasksOpen] = useState(false);

  const activeRelease = useMemo(() => {
    const active = releases.filter((r) => r.phase !== "Released" && r.phase !== "Archived" && r.phase !== "Post-release");
    return active.sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())[0];
  }, [releases]);

  const linkedSong = activeRelease ? songs.find((s) => s.id === activeRelease.linkedSongId) : undefined;

  const nextReleaseTasks = useMemo(() => {
    if (!activeRelease) return [];
    const all = [...activeRelease.preReleaseChecklist, ...activeRelease.releaseDayChecklist, ...activeRelease.postReleaseChecklist];
    return all.filter((i) => !i.done).slice(0, 3);
  }, [activeRelease]);

  const recentIdeas = useMemo(
    () => [...vault].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 5),
    [vault]
  );

  const upcomingReleasesCount = releases.filter((r) => r.phase !== "Released" && r.phase !== "Archived").length;
  const contentReadyCount = content.filter((c) => c.status === "Idea" || c.status === "Scripted").length;
  const tasksDueThisWeekList = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    return tasks.filter((t) => {
      if (t.status === "Done" || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= weekFromNow;
    });
  }, [tasks]);

  function handleAddPriority() {
    const text = priorityDraft.trim();
    if (!text) return;
    addPriorityItem(text);
    setPriorityDraft("");
  }

  function handleCapture() {
    const text = capture.trim();
    if (!text) return;
    addVaultItem({ category: "Random note", text, mood: "", linkedSongId: null, priority: "Medium", status: "Raw" });
    setCapture("");
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <SectionHeader title="Home" subtitle={todayLabel} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title="Current Active Release" className="lg:col-span-2">
          {activeRelease ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold text-[#f5f5f5]">{linkedSong?.title ?? activeRelease.title}</div>
                  <div className="mt-1 text-sm text-[#a3a3a3]">
                    Releases {new Date(activeRelease.releaseDate).toLocaleDateString()} · {daysUntil(activeRelease.releaseDate)} days to go
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
                  <div className="mb-2 text-xs uppercase tracking-wide text-[#a3a3a3]">Next Up</div>
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
                <Link to="/calendar" className="text-sm font-medium text-cyan-300 hover:underline">
                  View on calendar →
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState title="No active release" subtitle="Add a release from the Calendar page to see it here." />
          )}
        </DashboardCard>

        <DashboardCard title="Today's Priorities">
          <ul className="mb-3 space-y-1.5">
            {priorityItems.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-[#1c1c1c]">
                <button
                  onClick={() => togglePriorityItem(item.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    item.done ? "border-violet-500 bg-violet-500/90 text-white" : "border-[#2a2a2a] hover:border-violet-400"
                  }`}
                >
                  {item.done && <Check size={11} />}
                </button>
                <span className={`flex-1 text-sm ${item.done ? "text-[#a3a3a3] line-through" : "text-[#f5f5f5]"}`}>
                  {item.text}
                </span>
                <IconButton onClick={() => deletePriorityItem(item.id)}>
                  <Trash2 size={13} />
                </IconButton>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={priorityDraft}
              onChange={(e) => setPriorityDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPriority()}
              placeholder="Add a priority..."
              className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <button onClick={handleAddPriority} className="rounded-lg bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
              <Plus size={16} />
            </button>
          </div>
        </DashboardCard>
      </div>

      <div className="mt-4">
        <DashboardCard title="Quick Capture">
          <p className="mb-3 text-xs text-[#a3a3a3]">Dump any idea — lyric, content, visual, rollout. It's saved instantly so nothing gets lost.</p>
          <div className="flex gap-2">
            <input
              value={capture}
              onChange={(e) => setCapture(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCapture()}
              placeholder="Type an idea and hit enter..."
              className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] px-3 py-2 text-sm text-[#f5f5f5] placeholder:text-[#6b6b6b] focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
            />
            <button onClick={handleCapture} className="rounded-lg bg-violet-500/90 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
              <Plus size={16} />
            </button>
          </div>
          {recentIdeas.length > 0 && (
            <ul className="mt-3 space-y-1">
              {recentIdeas.map((idea) => (
                <li key={idea.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[#1c1c1c]">
                  <span className="flex items-center gap-2 text-[#f5f5f5]">
                    <Lightbulb size={13} className="shrink-0 text-amber-300/80" />
                    {idea.text}
                  </span>
                  <IconButton onClick={() => deleteVaultItem(idea.id)}>
                    <Trash2 size={13} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Active Songs"
          value={songs.filter((s) => s.stage !== "Released" && s.stage !== "Archived").length}
          onClick={() => navigate("/songs")}
        />
        <StatCard label="Upcoming Releases" value={upcomingReleasesCount} onClick={() => navigate("/calendar")} />
        <StatCard label="Content Ready" value={contentReadyCount} onClick={() => navigate("/calendar")} />
        <StatCard
          label="Tasks Due This Week"
          value={tasksDueThisWeekList.length}
          accent="text-amber-300"
          onClick={() => setTasksOpen((v) => !v)}
        />
      </div>

      {tasksOpen && (
        <DashboardCard title="Tasks Due This Week" className="mt-4">
          {tasksDueThisWeekList.length === 0 ? (
            <p className="text-sm text-[#a3a3a3]">Nothing due this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {tasksDueThisWeekList.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm text-[#f5f5f5] hover:bg-[#1c1c1c]">
                  <span>{t.title}</span>
                  <span className="text-xs text-[#a3a3a3]">{new Date(t.dueDate).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      )}
    </div>
  );
}
