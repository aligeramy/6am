import { useMemo, useState } from "react";
import { useOSStore, normalizeChecklistItem } from "../lib/store";
import {
  DashboardCard,
  StatCard,
  SectionHeader,
  EmptyState,
  IconButton,
} from "../components/ui";
import { Plus, Trash2, Check, Lightbulb } from "lucide-react";
import { categoryChip } from "../lib/categories";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

export default function HomeSection() {
  const songs = useOSStore((s) => s.songs);
  const vault = useOSStore((s) => s.vault);

  const priorityItems = useOSStore((s) => s.priorityItems);
  const addPriorityItem = useOSStore((s) => s.addPriorityItem);
  const togglePriorityItem = useOSStore((s) => s.togglePriorityItem);
  const deletePriorityItem = useOSStore((s) => s.deletePriorityItem);
  const addVaultItem = useOSStore((s) => s.addVaultItem);
  const deleteVaultItem = useOSStore((s) => s.deleteVaultItem);

  const [priorityDraft, setPriorityDraft] = useState("");
  const [capture, setCapture] = useState("");

  const todayStr = dateKey(new Date());

  const nextMain = useMemo(() => {
    return songs
      .filter(
        (s) =>
          (s.itemType ?? "Main Release") === "Main Release" &&
          s.releaseDate &&
          s.releaseDate.slice(0, 10) >= todayStr &&
          s.stage !== "Released" &&
          s.stage !== "Archived"
      )
      .sort((a, b) => (a.releaseDate! > b.releaseDate! ? 1 : -1))[0];
  }, [songs, todayStr]);

  const nextTasks = useMemo(() => {
    if (!nextMain?.checklist) return [];
    return nextMain.checklist.map(normalizeChecklistItem).filter((i) => !i.done).slice(0, 3);
  }, [nextMain]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      return {
        key,
        isToday: i === 0,
        weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
        dayNum: d.getDate(),
        events: songs.filter((s) => s.releaseDate?.slice(0, 10) === key),
      };
    });
  }, [songs]);

  const recentIdeas = useMemo(
    () => [...vault].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 5),
    [vault]
  );

  const upcoming = (type: string) =>
    songs.filter(
      (s) => (s.itemType ?? "Main Release") === type && s.releaseDate && s.releaseDate.slice(0, 10) >= todayStr
    ).length;

  const activeCount = songs.filter((s) => s.stage !== "Released" && s.stage !== "Archived").length;

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
        <DashboardCard title="Next Main Release" className="lg:col-span-2">
          {nextMain ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold text-[#f5f5f5]">{nextMain.title}</div>
                  <div className="mt-1 text-sm text-[#a3a3a3]">
                    Drops {new Date(nextMain.releaseDate!).toLocaleDateString()} ·{" "}
                    {daysUntil(nextMain.releaseDate!) === 0 ? "today" : `${daysUntil(nextMain.releaseDate!)} days to go`}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryChip(nextMain.itemType)}`}>
                  {nextMain.stage}
                </span>
              </div>

              {nextTasks.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-[#a3a3a3]">Next Up</div>
                  <ul className="space-y-1.5 text-sm text-[#f5f5f5]">
                    {nextTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        {t.label}
                        {t.target ? (
                          <span className="text-xs font-semibold text-violet-300">
                            {t.count ?? 0} / {t.target}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <button onClick={() => scrollToSection("calendar")} className="text-sm font-medium text-cyan-300 hover:underline">
                  View on calendar ↓
                </button>
              </div>
            </div>
          ) : (
            <EmptyState title="No main release scheduled" subtitle="Add one on the calendar below — one song a month." />
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
        <DashboardCard title="This Week">
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day) => (
              <button
                key={day.key}
                onClick={() => scrollToSection("calendar")}
                className={`min-h-[72px] rounded-xl border p-1.5 text-left transition-colors hover:border-[#3a3a3a] ${
                  day.isToday ? "border-violet-500/50 bg-violet-500/5" : "border-[#2a2a2a] bg-[#0c0c0c]"
                }`}
              >
                <div className={`text-[10px] uppercase ${day.isToday ? "font-semibold text-violet-300" : "text-[#6b6b6b]"}`}>
                  {day.weekday} {day.dayNum}
                </div>
                <div className="mt-1 space-y-0.5">
                  {day.events.slice(0, 3).map((s) => (
                    <div key={s.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${categoryChip(s.itemType)}`}>
                      {s.title}
                    </div>
                  ))}
                  {day.events.length > 3 && <div className="text-[10px] text-[#6b6b6b]">+{day.events.length - 3} more</div>}
                </div>
              </button>
            ))}
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

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Projects" value={activeCount} onClick={() => scrollToSection("board")} />
        <StatCard label="Main Upcoming" value={upcoming("Main Release")} accent="text-violet-300" onClick={() => scrollToSection("calendar")} />
        <StatCard label="Side Upcoming" value={upcoming("Side Release")} accent="text-cyan-300" onClick={() => scrollToSection("calendar")} />
        <StatCard label="Brand Upcoming" value={upcoming("Brand Release")} accent="text-amber-300" onClick={() => scrollToSection("calendar")} />
      </div>
    </div>
  );
}
