"use client"

import { addDays, startOfDay } from "date-fns"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { nextOn, type Rule } from "./repeat"

export type PillarId = "mind" | "muscle" | "money" | "music"

export const PILLARS: { id: PillarId; name: string }[] = [
  { id: "mind", name: "MIND" },
  { id: "muscle", name: "MUSCLE" },
  { id: "money", name: "MONEY" },
  { id: "music", name: "MUSIC" },
]

/**
 * One list holds three kinds of line:
 * - a one-off line: `completedAt` is set when it's ticked;
 * - a repeating line: has `repeat` and `due`, and is never completed itself. Ticking it logs a record and moves `due` on;
 * - a record of a repeating line being done: has `of` (the line's id), `createdAt` = the day it was due, and `completedAt`.
 */
export interface Task {
  id: string
  pillar: PillarId
  text: string
  createdAt: number
  completedAt?: number
  repeat?: Rule & { start: number }
  /** Repeating line: start of the day it is next due, or still due if missed. */
  due?: number
  of?: string
}

interface FourM {
  tasks: Task[]
  /** On: ticked lines stay crossed out until tomorrow. Off: they leave the list right away. */
  autoClean: boolean
  add: (pillar: PillarId, text: string, repeat?: Rule) => Task | undefined
  toggle: (id: string) => void
  remove: (id: string) => void
  setAutoClean: (on: boolean) => void
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const useFourM = create<FourM>()(
  persist(
    (set) => ({
      tasks: [],
      autoClean: false,
      add: (pillar, text, rule) => {
        const t = text.trim()
        if (!t) return undefined
        const now = Date.now()
        const task: Task = { id: uid(), pillar, text: t, createdAt: now }
        if (rule) {
          const start = startOfDay(now).getTime()
          task.repeat = { ...rule, start }
          task.due = nextOn(task.repeat, start)
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return task
      },
      toggle: (id) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === id)
          if (!t) return s
          const now = Date.now()
          if (t.repeat) {
            // Done: log it, and move on to the next day it falls on after today. A missed day is covered by this tick.
            const due = t.due ?? startOfDay(now).getTime()
            const next = nextOn(t.repeat, addDays(Math.max(startOfDay(now).getTime(), due), 1))
            const record: Task = { id: uid(), pillar: t.pillar, text: t.text, createdAt: due, completedAt: now, of: t.id }
            return { tasks: [...s.tasks.map((x) => (x.id === id ? { ...x, due: next } : x)), record] }
          }
          if (t.of) {
            // Unticking a repeating line's record: drop it, and the line is due again from the day it was due.
            return { tasks: s.tasks.filter((x) => x.id !== id).map((x) => (x.id === t.of ? { ...x, due: t.createdAt } : x)) }
          }
          return { tasks: s.tasks.map((x) => (x.id === id ? { ...x, completedAt: x.completedAt ? undefined : now } : x)) }
        }),
      remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      setAutoClean: (on) => set({ autoClean: on }),
    }),
    // Keep version 1: the new fields are optional, and a version bump without a migration would drop saved lines.
    { name: "fourm-v1", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)
