import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Asset,
  BrandNote,
  BudgetItem,
  ContentItem,
  OSState,
  Release,
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

interface OSActions {
  addSong: (song: Omit<Song, "id" | "createdAt" | "updatedAt">) => void;
  updateSong: (id: string, patch: Partial<Song>) => void;
  deleteSong: (id: string) => void;

  addRelease: (release: Omit<Release, "id" | "createdAt" | "updatedAt">) => void;
  updateRelease: (id: string, patch: Partial<Release>) => void;
  deleteRelease: (id: string) => void;
  toggleChecklistItem: (
    releaseId: string,
    list: "preReleaseChecklist" | "releaseDayChecklist" | "postReleaseChecklist",
    itemId: string
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
            const all = [
              ...(list === "preReleaseChecklist" ? updatedList : r.preReleaseChecklist),
              ...(list === "releaseDayChecklist" ? updatedList : r.releaseDayChecklist),
              ...(list === "postReleaseChecklist" ? updatedList : r.postReleaseChecklist),
            ];
            const progress = all.length > 0 ? Math.round((all.filter((i) => i.done).length / all.length) * 100) : 0;
            return { ...r, [list]: updatedList, progress, updatedAt: ts() };
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
    }
  )
);
