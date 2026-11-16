"use client"

import { addDays, startOfDay } from "date-fns"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import { nextOn, sameRule, type Rule } from "./repeat"

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
  /** The id of the line's term (short, medium, long, or one of your own); none if unset. */
  term?: string
}

/** A goal term, used like a tag. Short, medium and long come built in; all of them can be renamed or removed. */
export interface Term {
  id: string
  name: string
}

export const DEFAULT_TERMS: Term[] = [
  { id: "short", name: "short" },
  { id: "medium", name: "medium" },
  { id: "long", name: "long" },
]

interface FourM {
  tasks: Task[]
  terms: Term[]
  /** On: ticked lines stay crossed out until tomorrow. Off: they leave the list right away. */
  autoClean: boolean
  add: (pillar: PillarId, text: string, repeat?: Rule, term?: string) => Task | undefined
  /** Change an open line's words, how it repeats (no rule = a one-off line) and its term. */
  edit: (id: string, text: string, repeat?: Rule, term?: string) => Task | undefined
  toggle: (id: string) => void
  remove: (id: string) => void
  setAutoClean: (on: boolean) => void
  /** Adds a term, or returns the one that already has this name. */
  addTerm: (name: string) => Term | undefined
  /** False if the name is empty or another term already has it. */
  renameTerm: (id: string, name: string) => boolean
  /** Removes the term; its lines stay, without a term. */
  removeTerm: (id: string) => void
}

const TERM_MAX = 24
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const useFourM = create<FourM>()(
  persist(
    (set, get) => ({
      tasks: [],
      terms: DEFAULT_TERMS,
      autoClean: false,
      add: (pillar, text, rule, term) => {
        const t = text.trim()
        if (!t) return undefined
        const now = Date.now()
        const task: Task = { id: uid(), pillar, text: t, createdAt: now }
        if (term) task.term = term
        if (rule) {
          const start = startOfDay(now).getTime()
          task.repeat = { ...rule, start }
          task.due = nextOn(task.repeat, start)
        }
        set((s) => ({ tasks: [...s.tasks, task] }))
        return task
      },
      edit: (id, text, rule, term) => {
        let updated: Task | undefined
        set((s) => ({
          tasks: s.tasks.map((x) => {
            if (x.id !== id) return x
            const now = Date.now()
            const next: Task = { ...x, text: text.trim() || x.text }
            if (term) next.term = term
            else delete next.term
            if (!x.completedAt) {
              if (!rule) {
                // No longer repeats: it becomes a normal line, counted from when it was due so a missed one stays stale.
                if (x.repeat) next.createdAt = Math.min(x.due ?? now, now)
                delete next.repeat
                delete next.due
              } else if (!x.repeat || !sameRule(x.repeat, rule)) {
                // New or changed schedule: it starts again from today.
                const start = startOfDay(now).getTime()
                next.repeat = { ...rule, start }
                next.due = nextOn(next.repeat, start)
              }
            }
            updated = next
            return next
          }),
        }))
        return updated
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
            const record: Task = { id: uid(), pillar: t.pillar, text: t.text, createdAt: due, completedAt: now, of: t.id, ...(t.term ? { term: t.term } : {}) }
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
      addTerm: (name) => {
        const n = name.trim().slice(0, TERM_MAX)
        if (!n) return undefined
        const existing = get().terms.find((t) => sameName(t.name, n))
        if (existing) return existing
        const term: Term = { id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: n }
        set((s) => ({ terms: [...s.terms, term] }))
        return term
      },
      renameTerm: (id, name) => {
        const n = name.trim().slice(0, TERM_MAX)
        if (!n || get().terms.some((t) => t.id !== id && sameName(t.name, n))) return false
        set((s) => ({ terms: s.terms.map((t) => (t.id === id ? { ...t, name: n } : t)) }))
        return true
      },
      removeTerm: (id) =>
        set((s) => ({
          terms: s.terms.filter((t) => t.id !== id),
          tasks: s.tasks.map((t) => {
            if (t.term !== id) return t
            const { term: _, ...rest } = t
            return rest
          }),
        })),
    }),
    // Keep version 1: the new fields are optional, and a version bump without a migration would drop saved lines.
    { name: "fourm-v1", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)
