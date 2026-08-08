import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Asset,
  BrandNote,
  BudgetItem,
  ContentItem,
  OSState,
  Release,
  Settings,
  Song,
  Task,
  VaultItem,
  WeeklyReview,
} from "../types/os";
import { buildSeedData } from "./seed";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ts() {
  return new Date().toISOString();
}

// Older saved releases have the reels item as a plain checkbox — upgrade it to a counter.
export function normalizeChecklistItem(item: import("../types/os").ChecklistItem) {
  if (item.target === undefined && /reel style hook videos/i.test(item.label)) {
    return { ...item, label: "Reel style hook videos", target: 28, count: item.done ? 28 : 0 };
  }
  return item;
}

function checklistProgress(release: Release): number {
  const all = [
    ...release.preReleaseChecklist,
    ...release.releaseDayChecklist,
    ...release.postReleaseChecklist,
  ].map(normalizeChecklistItem);
  if (all.length === 0) return 0;
  const total = all.reduce((sum, i) => {
    if (i.target && i.target > 0) return sum + Math.min(1, (i.count ?? 0) / i.target);
    return sum + (i.done ? 1 : 0);
  }, 0);
  return Math.round((total / all.length) * 100);
}

interface OSActions {
  addSong: (song: Omit<Song, "id" | "createdAt" | "updatedAt">) => void;
  updateSong: (id: string, patch: Partial<Song>) => void;
  deleteSong: (id: string) => void;
  toggleSongChecklistItem: (songId: string, itemId: string) => void;
  adjustSongChecklistCount: (songId: string, itemId: string, delta: number) => void;

  addRelease: (release: Omit<Release, "id" | "createdAt" | "updatedAt">) => void;
  updateRelease: (id: string, patch: Partial<Release>) => void;
  deleteRelease: (id: string) => void;
  toggleChecklistItem: (
    releaseId: string,
    list: "preReleaseChecklist" | "releaseDayChecklist" | "postReleaseChecklist",
    itemId: string
  ) => void;
  adjustChecklistCount: (
    releaseId: string,
    list: "preReleaseChecklist" | "releaseDayChecklist" | "postReleaseChecklist",
    itemId: string,
    delta: number
  ) => void;

  addContent: (item: Omit<ContentItem, "id" | "createdAt" | "updatedAt">) => void;
  updateContent: (id: string, patch: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;

  addAsset: (asset: Omit<Asset, "id" | "createdAt" | "updatedAt">) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  addVaultItem: (item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">) => void;
  updateVaultItem: (id: string, patch: Partial<VaultItem>) => void;
  deleteVaultItem: (id: string) => void;

  updateBrandNote: (id: string, patch: Partial<BrandNote>) => void;

  addWeeklyReview: (review: Omit<WeeklyReview, "id" | "createdAt" | "updatedAt">) => void;
  updateWeeklyReview: (id: string, patch: Partial<WeeklyReview>) => void;
  deleteWeeklyReview: (id: string) => void;

  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addNotToday: (text: string) => void;
  updateNotToday: (id: string, text: string) => void;
  deleteNotToday: (id: string) => void;

  setTodayPriority: (text: string) => void;

  addPriorityItem: (text: string) => void;
  togglePriorityItem: (id: string) => void;
  deletePriorityItem: (id: string) => void;

  addBudgetItem: (item: Omit<BudgetItem, "id" | "createdAt">) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  deleteBudgetItem: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  exportData: () => string;
  importData: (json: string) => boolean;
  resetToSeed: () => void;
}

export type OSStore = OSState & OSActions;

const seed = buildSeedData();

export const useOSStore = create<OSStore>()(
  persist(
    (set, get) => ({
      ...seed,

      addSong: (song) =>
        set((state) => ({
          songs: [...state.songs, { ...song, id: uid("song"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateSong: (id, patch) =>
        set((state) => ({
          songs: state.songs.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: ts() } : s)),
        })),
      deleteSong: (id) => set((state) => ({ songs: state.songs.filter((s) => s.id !== id) })),
      toggleSongChecklistItem: (songId, itemId) =>
        set((state) => ({
          songs: state.songs.map((s) =>
            s.id === songId
              ? {
                  ...s,
                  checklist: (s.checklist ?? []).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)),
                  updatedAt: ts(),
                }
              : s
          ),
        })),
      adjustSongChecklistCount: (songId, itemId, delta) =>
        set((state) => ({
          songs: state.songs.map((s) => {
            if (s.id !== songId) return s;
            const checklist = (s.checklist ?? []).map((raw) => {
              if (raw.id !== itemId) return raw;
              const item = normalizeChecklistItem(raw);
              const target = item.target ?? 0;
              const count = Math.max(0, Math.min(target, (item.count ?? 0) + delta));
              return { ...item, count, done: target > 0 && count >= target };
            });
            return { ...s, checklist, updatedAt: ts() };
          }),
        })),

      addRelease: (release) =>
        set((state) => ({
          releases: [...state.releases, { ...release, id: uid("release"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateRelease: (id, patch) =>
        set((state) => ({
          releases: state.releases.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: ts() } : r)),
        })),
      deleteRelease: (id) => set((state) => ({ releases: state.releases.filter((r) => r.id !== id) })),
      toggleChecklistItem: (releaseId, list, itemId) =>
        set((state) => ({
          releases: state.releases.map((r) => {
            if (r.id !== releaseId) return r;
            const updatedList = r[list].map((item) =>
              item.id === itemId ? { ...item, done: !item.done } : item
            );
            const next = { ...r, [list]: updatedList, updatedAt: ts() };
            return { ...next, progress: checklistProgress(next) };
          }),
        })),
      adjustChecklistCount: (releaseId, list, itemId, delta) =>
        set((state) => ({
          releases: state.releases.map((r) => {
            if (r.id !== releaseId) return r;
            const updatedList = r[list].map((raw) => {
              if (raw.id !== itemId) return raw;
              const item = normalizeChecklistItem(raw);
              const target = item.target ?? 0;
              const count = Math.max(0, Math.min(target, (item.count ?? 0) + delta));
              return { ...item, count, done: target > 0 && count >= target };
            });
            const next = { ...r, [list]: updatedList, updatedAt: ts() };
            return { ...next, progress: checklistProgress(next) };
          }),
        })),

      addContent: (item) =>
        set((state) => ({
          content: [...state.content, { ...item, id: uid("content"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateContent: (id, patch) =>
        set((state) => ({
          content: state.content.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: ts() } : c)),
        })),
      deleteContent: (id) => set((state) => ({ content: state.content.filter((c) => c.id !== id) })),

      addAsset: (asset) =>
        set((state) => ({
          assets: [...state.assets, { ...asset, id: uid("asset"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateAsset: (id, patch) =>
        set((state) => ({
          assets: state.assets.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: ts() } : a)),
        })),
      deleteAsset: (id) => set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

      addVaultItem: (item) =>
        set((state) => ({
          vault: [...state.vault, { ...item, id: uid("vault"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateVaultItem: (id, patch) =>
        set((state) => ({
          vault: state.vault.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: ts() } : v)),
        })),
      deleteVaultItem: (id) => set((state) => ({ vault: state.vault.filter((v) => v.id !== id) })),

      updateBrandNote: (id, patch) =>
        set((state) => ({
          brand: state.brand.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: ts() } : b)),
        })),

      addWeeklyReview: (review) =>
        set((state) => ({
          weeklyReviews: [...state.weeklyReviews, { ...review, id: uid("review"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateWeeklyReview: (id, patch) =>
        set((state) => ({
          weeklyReviews: state.weeklyReviews.map((w) => (w.id === id ? { ...w, ...patch, updatedAt: ts() } : w)),
        })),
      deleteWeeklyReview: (id) =>
        set((state) => ({ weeklyReviews: state.weeklyReviews.filter((w) => w.id !== id) })),

      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, { ...task, id: uid("task"), createdAt: ts(), updatedAt: ts() }],
        })),
      updateTask: (id, patch) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: ts() } : t)),
        })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

      addNotToday: (text) => set((state) => ({ notToday: [...state.notToday, { id: uid("nt"), text }] })),
      updateNotToday: (id, text) =>
        set((state) => ({ notToday: state.notToday.map((n) => (n.id === id ? { ...n, text } : n)) })),
      deleteNotToday: (id) => set((state) => ({ notToday: state.notToday.filter((n) => n.id !== id) })),

      setTodayPriority: (text) => set({ todayPriority: text }),

      addPriorityItem: (text) =>
        set((state) => ({ priorityItems: [...state.priorityItems, { id: uid("pi"), text, done: false }] })),
      togglePriorityItem: (id) =>
        set((state) => ({
          priorityItems: state.priorityItems.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
        })),
      deletePriorityItem: (id) =>
        set((state) => ({ priorityItems: state.priorityItems.filter((p) => p.id !== id) })),

      addBudgetItem: (item) =>
        set((state) => ({
          budgetItems: [...state.budgetItems, { ...item, id: uid("budget"), createdAt: ts() }],
        })),
      updateBudgetItem: (id, patch) =>
        set((state) => ({
          budgetItems: state.budgetItems.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBudgetItem: (id) =>
        set((state) => ({ budgetItems: state.budgetItems.filter((b) => b.id !== id) })),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      exportData: () => {
        const state = get();
        const data: OSState = {
          songs: state.songs,
          releases: state.releases,
          content: state.content,
          assets: state.assets,
          vault: state.vault,
          brand: state.brand,
          weeklyReviews: state.weeklyReviews,
          tasks: state.tasks,
          notToday: state.notToday,
          todayPriority: state.todayPriority,
          priorityItems: state.priorityItems,
          budgetItems: state.budgetItems,
          settings: state.settings,
        };
        return JSON.stringify(data, null, 2);
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json) as Partial<OSState>;
          if (!data || typeof data !== "object") return false;
          set((state) => ({
            songs: data.songs ?? state.songs,
            releases: data.releases ?? state.releases,
            content: data.content ?? state.content,
            assets: data.assets ?? state.assets,
            vault: data.vault ?? state.vault,
            brand: data.brand ?? state.brand,
            weeklyReviews: data.weeklyReviews ?? state.weeklyReviews,
            tasks: data.tasks ?? state.tasks,
            notToday: data.notToday ?? state.notToday,
            todayPriority: data.todayPriority ?? state.todayPriority,
            priorityItems: data.priorityItems ?? state.priorityItems,
            budgetItems: data.budgetItems ?? state.budgetItems,
            settings: data.settings ?? state.settings,
          }));
          return true;
        } catch {
          return false;
        }
      },
      resetToSeed: () => set(buildSeedData()),
    }),
    {
      name: "6am-os-storage",
      version: 2,
      // v2: unified model — everything is a release (Main/Side/Brand) on the board.
      // Migrate legacy separate releases/content into board items so nothing scheduled is lost.
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown> & Partial<OSState>;
        if (!state || typeof state !== "object") return persisted as OSState;

        const typeMap: Record<string, string> = {
          Song: "Main Release",
          "Music Video": "Side Release",
          Project: "Brand Release",
        };

        if (state.settings?.itemTypes) {
          state.settings.itemTypes = [
            ...new Set(state.settings.itemTypes.map((t: string) => typeMap[t] ?? t)),
          ];
        }

        if (Array.isArray(state.songs)) {
          state.songs = state.songs.map((s) => ({
            ...s,
            itemType: typeMap[s.itemType ?? "Song"] ?? s.itemType ?? "Main Release",
          }));
        }

        const now = new Date().toISOString();
        const extra: Song[] = [];

        if (Array.isArray(state.releases)) {
          for (const r of state.releases) {
            if (!r.releaseDate) continue;
            extra.push({
              id: `migrated-${r.id}`,
              title: r.title,
              stage: r.phase === "Released" || r.phase === "Archived" ? "Released" : "Production",
              itemType: "Main Release",
              priority: "High",
              releaseDate: r.releaseDate,
              checklist: r.preReleaseChecklist,
              tags: [],
              vibe: "",
              theme: "",
              genre: "",
              bpm: "",
              key: "",
              collaborators: "",
              producer: "",
              nextAction: "",
              releasePotential: "High",
              notes: r.notes ?? "",
              fileLinks: "",
              createdAt: r.createdAt ?? now,
              updatedAt: r.updatedAt ?? now,
            });
          }
        }

        if (Array.isArray(state.content)) {
          for (const c of state.content) {
            if (!c.postDate) continue;
            extra.push({
              id: `migrated-${c.id}`,
              title: c.title,
              stage: c.status === "Posted" || c.status === "Reviewed" ? "Released" : "Production",
              itemType: "Brand Release",
              priority: "Medium",
              releaseDate: c.postDate,
              tags: [],
              vibe: "",
              theme: "",
              genre: "",
              bpm: "",
              key: "",
              collaborators: "",
              producer: "",
              nextAction: "",
              releasePotential: "Medium",
              notes: c.caption ?? "",
              fileLinks: "",
              createdAt: c.createdAt ?? now,
              updatedAt: c.updatedAt ?? now,
            });
          }
        }

        // Avoid double-migrating if the same linked song already exists with that date.
        const existingTitles = new Set((state.songs ?? []).map((s) => `${s.title}|${s.releaseDate ?? ""}`));
        state.songs = [
          ...(state.songs ?? []),
          ...extra.filter((e) => !existingTitles.has(`${e.title}|${e.releaseDate ?? ""}`)),
        ];
        state.releases = [];
        state.content = [];

        return state as OSState;
      },
    }
  )
);
