"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { todayKey, uid } from "./dates"
import type {
  ChatMessage,
  Habit,
  JarvisData,
  JournalEntry,
  LogEntry,
  Mission,
  PillarId,
  Project,
  Settings,
  Transaction,
} from "./types"
import { METRIC_BY_ID } from "./pillars"

export const DEFAULT_SETTINGS: Settings = {
  address: "Sir",
  name: "",
  wakeTime: "06:00",
  briefingEnabled: true,
  voiceEnabled: true,
  voiceRate: 1,
  voicePitch: 0.9,
  wakeWordEnabled: false,
  bootSequence: true,
  currency: "$",
  weightUnit: "lb",
  monthlyBudget: 3000,
  vision: "",
  values: [],
  targets: {
    sleep: 8,
    workout: 4,
    water: 8,
    reading: 30,
    meditation: 10,
    learning: 30,
    deepwork: 15,
    gratitude: 7,
    savingsRate: 20,
  },
}

const EMPTY: Omit<JarvisData, "settings"> = {
  logs: [],
  transactions: [],
  habits: [],
  missions: [],
  projects: [],
  journal: [],
  chat: [],
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

interface UIState {
  activePillar: PillarId | null
  settingsOpen: boolean
  briefingOpen: boolean
  briefingText: string
}

interface Actions {
  addLog: (e: { metric: string; value: number; note?: string; date?: string }) => LogEntry | null
  deleteLog: (id: string) => void
  addTransaction: (t: Omit<Transaction, "id" | "ts" | "date"> & { date?: string }) => Transaction
  deleteTransaction: (id: string) => void
  addHabit: (name: string) => Habit
  toggleHabit: (id: string, date?: string, force?: boolean) => void
  renameHabit: (id: string, name: string) => void
  deleteHabit: (id: string) => void
  addMission: (m: Omit<Mission, "id" | "createdAt" | "status" | "progress" | "milestones"> & { milestones?: string[] }) => Mission
  updateMission: (id: string, patch: Partial<Mission>) => void
  toggleMilestone: (missionId: string, milestoneId: string) => void
  addMilestone: (missionId: string, title: string) => void
  deleteMission: (id: string) => void
  addProject: (p: { name: string; status?: Project["status"]; progress?: number; note?: string; due?: string }) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  addJournal: (kind: JournalEntry["kind"], text: string) => JournalEntry
  deleteJournal: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  pushChat: (m: Omit<ChatMessage, "id" | "ts">) => ChatMessage
  clearChat: () => void
  importData: (data: Partial<JarvisData>) => void
  resetAll: () => void
  setUI: (patch: Partial<UIState>) => void
}

export type JarvisStore = JarvisData & UIState & Actions

/** Missions whose progress is derived from milestones when they have any. */
const withMilestoneProgress = (m: Mission): Mission =>
  m.milestones.length
    ? { ...m, progress: Math.round((m.milestones.filter((x) => x.done).length / m.milestones.length) * 100) }
    : m

export const useJarvis = create<JarvisStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      settings: DEFAULT_SETTINGS,
      activePillar: null,
      settingsOpen: false,
      briefingOpen: false,
      briefingText: "",

      addLog: ({ metric, value, note, date }) => {
        const def = METRIC_BY_ID[metric]
        if (!def || !Number.isFinite(value)) return null
        const entry: LogEntry = {
          id: uid(),
          pillar: def.pillar,
          metric,
          value: clamp(value, def.min, def.max),
          note,
          date: date || todayKey(),
          ts: Date.now(),
        }
        set((s) => ({ logs: [...s.logs, entry] }))
        return entry
      },
      deleteLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),

      addTransaction: (t) => {
        const tx: Transaction = {
          id: uid(),
          kind: t.kind,
          amount: Math.abs(t.amount),
          category: (t.category || "other").toLowerCase(),
          note: t.note,
          date: t.date || todayKey(),
          ts: Date.now(),
        }
        set((s) => ({ transactions: [...s.transactions, tx] }))
        return tx
      },
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      addHabit: (name) => {
        const h: Habit = { id: uid(), name: name.trim(), createdAt: Date.now(), completions: [] }
        set((s) => ({ habits: [...s.habits, h] }))
        return h
      },
      toggleHabit: (id, date = todayKey(), force) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h
            const has = h.completions.includes(date)
            const next = force ?? !has
            if (next === has) return h
            return {
              ...h,
              completions: next ? [...h.completions, date] : h.completions.filter((d) => d !== date),
            }
          }),
        })),
      renameHabit: (id, name) => set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, name } : h)) })),
      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      addMission: (m) => {
        const mission: Mission = withMilestoneProgress({
          id: uid(),
          title: m.title.trim(),
          pillar: m.pillar,
          horizon: m.horizon,
          due: m.due,
          progress: 0,
          status: "active",
          createdAt: Date.now(),
          milestones: (m.milestones || []).filter(Boolean).map((title) => ({ id: uid(), title, done: false })),
        })
        set((s) => ({ missions: [...s.missions, mission] }))
        return mission
      },
      updateMission: (id, patch) =>
        set((s) => ({
          missions: s.missions.map((m) => {
            if (m.id !== id) return m
            const next = { ...m, ...patch }
            if (patch.progress !== undefined) next.progress = clamp(Math.round(patch.progress), 0, 100)
            if (next.progress >= 100 && patch.status === undefined) next.status = "done"
            return next
          }),
        })),
      toggleMilestone: (missionId, milestoneId) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === missionId
              ? withMilestoneProgress({
                  ...m,
                  milestones: m.milestones.map((x) => (x.id === milestoneId ? { ...x, done: !x.done } : x)),
                })
              : m,
          ),
        })),
      addMilestone: (missionId, title) =>
        set((s) => ({
          missions: s.missions.map((m) =>
            m.id === missionId
              ? withMilestoneProgress({ ...m, milestones: [...m.milestones, { id: uid(), title, done: false }] })
              : m,
          ),
        })),
      deleteMission: (id) => set((s) => ({ missions: s.missions.filter((m) => m.id !== id) })),

      addProject: (p) => {
        const project: Project = {
          id: uid(),
          name: p.name.trim(),
          status: p.status || "active",
          progress: clamp(p.progress ?? 0, 0, 100),
          note: p.note,
          due: p.due,
          createdAt: Date.now(),
        }
        set((s) => ({ projects: [...s.projects, project] }))
        return project
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, ...patch, progress: patch.progress !== undefined ? clamp(patch.progress, 0, 100) : p.progress }
              : p,
          ),
        })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addJournal: (kind, text) => {
        const entry: JournalEntry = { id: uid(), kind, text: text.trim(), date: todayKey(), ts: Date.now() }
        set((s) => ({ journal: [...s.journal, entry] }))
        return entry
      },
      deleteJournal: (id) => set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),

      updateSettings: (patch) =>
        set((s) => ({
          settings: { ...s.settings, ...patch, targets: { ...s.settings.targets, ...(patch.targets || {}) } },
        })),

      pushChat: (m) => {
        const msg: ChatMessage = { ...m, id: uid(), ts: Date.now() }
        set((s) => ({ chat: [...s.chat, msg].slice(-80) }))
        return msg
      },
      clearChat: () => set({ chat: [] }),

      importData: (data) =>
        set((s) => ({
          logs: data.logs ?? s.logs,
          transactions: data.transactions ?? s.transactions,
          habits: data.habits ?? s.habits,
          missions: data.missions ?? s.missions,
          projects: data.projects ?? s.projects,
          journal: data.journal ?? s.journal,
          chat: data.chat ?? s.chat,
          settings: data.settings
            ? {
                ...DEFAULT_SETTINGS,
                ...data.settings,
                apiKey: data.settings.apiKey ?? s.settings.apiKey,
                targets: { ...DEFAULT_SETTINGS.targets, ...data.settings.targets },
              }
            : s.settings,
        })),
      resetAll: () => set({ ...EMPTY, settings: { ...DEFAULT_SETTINGS, address: get().settings.address } }),

      setUI: (patch) => set(patch),
    }),
    {
      name: "jarvis-life-os",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        logs: s.logs,
        transactions: s.transactions,
        habits: s.habits,
        missions: s.missions,
        projects: s.projects,
        journal: s.journal,
        chat: s.chat,
        settings: s.settings,
      }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<JarvisData>
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings || {}),
            targets: { ...DEFAULT_SETTINGS.targets, ...(p.settings?.targets || {}) },
          },
        }
      },
    },
  ),
)

export const exportData = (): JarvisData => {
  const s = useJarvis.getState()
  return {
    logs: s.logs,
    transactions: s.transactions,
    habits: s.habits,
    missions: s.missions,
    projects: s.projects,
    journal: s.journal,
    chat: s.chat,
    settings: s.settings,
  }
}

/** Data for a backup file: everything except your API key. */
export const backupData = (): JarvisData => {
  const data = exportData()
  const { apiKey: _omit, ...settings } = data.settings
  void _omit
  return { ...data, settings }
}
