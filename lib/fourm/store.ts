"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type PillarId = "mind" | "muscle" | "money" | "music"

export const PILLARS: { id: PillarId; name: string }[] = [
  { id: "mind", name: "MIND" },
  { id: "muscle", name: "MUSCLE" },
  { id: "money", name: "MONEY" },
  { id: "music", name: "MUSIC" },
]

export interface Task {
  id: string
  pillar: PillarId
  text: string
  createdAt: number
  completedAt?: number
}

interface FourM {
  tasks: Task[]
  add: (pillar: PillarId, text: string) => void
  toggle: (id: string) => void
  remove: (id: string) => void
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const useFourM = create<FourM>()(
  persist(
    (set) => ({
      tasks: [],
      add: (pillar, text) => {
        const t = text.trim()
        if (!t) return
        set((s) => ({ tasks: [...s.tasks, { id: uid(), pillar, text: t, createdAt: Date.now() }] }))
      },
      toggle: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, completedAt: t.completedAt ? undefined : Date.now() } : t)) })),
      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    }),
    { name: "fourm-v1", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)
