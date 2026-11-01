"use client"

import { METRIC_BY_ID, PILLAR_BY_ID } from "./pillars"
import { useJarvis } from "./store"
import { formatMinutes, formatMoney } from "./scoring"
import type { ChatAction, JarvisAction, PillarId } from "./types"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()

/** Best fuzzy match by token overlap; returns null if nothing is close. */
export function fuzzyFind<T>(items: T[], query: string, key: (t: T) => string): T | null {
  const q = norm(query)
  if (!q) return null
  const exact = items.find((i) => norm(key(i)) === q)
  if (exact) return exact
  const contains = items.find((i) => norm(key(i)).includes(q) || q.includes(norm(key(i))))
  if (contains) return contains
  const qTokens = new Set(q.split(" ").filter((t) => t.length > 2))
  let best: T | null = null
  let bestScore = 0
  for (const item of items) {
    const tokens = norm(key(item)).split(" ")
    const score = tokens.filter((t) => qTokens.has(t)).length / Math.max(1, tokens.length)
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return bestScore >= 0.5 ? best : null
}

const isPillar = (p: unknown): p is PillarId => typeof p === "string" && p in PILLAR_BY_ID
const isDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)

/** Apply one action to the store and describe what happened (shown as a chip under JARVIS's reply). */
export function applyAction(action: JarvisAction): ChatAction {
  const s = useJarvis.getState()
  const cur = s.settings.currency
  try {
    switch (action.type) {
      case "log_metric": {
        const def = METRIC_BY_ID[action.metric]
        if (!def || !Number.isFinite(action.value)) return { ok: false, label: `Unknown metric ${action.metric}` }
        s.addLog({ metric: action.metric, value: action.value, note: action.note, date: isDate(action.date) ? action.date : undefined })
        const shown = def.unit === "min" ? formatMinutes(action.value) : `${action.value}${def.unit.startsWith("/") ? def.unit : ` ${def.unit}`}`
        return { ok: true, label: `${def.label} · ${shown}` }
      }
      case "add_transaction": {
        if (!Number.isFinite(action.amount) || action.amount <= 0) return { ok: false, label: "Invalid amount" }
        s.addTransaction({
          kind: action.kind === "income" ? "income" : "expense",
          amount: action.amount,
          category: action.category || "other",
          note: action.note,
          date: isDate(action.date) ? action.date : undefined,
        })
        return {
          ok: true,
          label: `${action.kind === "income" ? "Income" : "Expense"} · ${formatMoney(action.amount, cur)} ${action.category}`,
        }
      }
      case "complete_habit": {
        const h = fuzzyFind(s.habits, action.habit, (x) => x.name)
        if (!h) return { ok: false, label: `No habit "${action.habit}"` }
        s.toggleHabit(h.id, isDate(action.date) ? action.date : undefined, true)
        return { ok: true, label: `Habit ✓ ${h.name}` }
      }
      case "create_habit": {
        if (!action.name?.trim()) return { ok: false, label: "Habit needs a name" }
        const existing = fuzzyFind(s.habits, action.name, (x) => x.name)
        if (existing && existing.name.toLowerCase() === action.name.trim().toLowerCase())
          return { ok: false, label: `Habit exists: ${existing.name}` }
        s.addHabit(action.name)
        return { ok: true, label: `New habit · ${action.name.trim()}` }
      }
      case "create_mission": {
        if (!action.title?.trim()) return { ok: false, label: "Mission needs a title" }
        s.addMission({
          title: action.title,
          pillar: isPillar(action.pillar) ? action.pillar : "missions",
          horizon: ["week", "quarter", "year", "life"].includes(action.horizon) ? action.horizon : "quarter",
          due: isDate(action.due) ? action.due : undefined,
          milestones: action.milestones,
        })
        return { ok: true, label: `Mission · ${action.title.trim()}` }
      }
      case "update_mission": {
        const m = fuzzyFind(s.missions, action.title, (x) => x.title)
        if (!m) return { ok: false, label: `No mission "${action.title}"` }
        if (action.complete_milestone) {
          const ms = fuzzyFind(m.milestones, action.complete_milestone, (x) => x.title)
          if (ms && !ms.done) s.toggleMilestone(m.id, ms.id)
        }
        const patch: Record<string, unknown> = {}
        if (typeof action.progress === "number") patch.progress = action.progress
        if (action.status) patch.status = action.status
        if (action.status === "done") patch.progress = 100
        if (Object.keys(patch).length) s.updateMission(m.id, patch)
        const after = useJarvis.getState().missions.find((x) => x.id === m.id)
        return { ok: true, label: `${m.title} · ${after?.status === "done" ? "complete" : `${after?.progress ?? 0}%`}` }
      }
      case "upsert_project": {
        if (!action.name?.trim()) return { ok: false, label: "Project needs a name" }
        const p = fuzzyFind(s.projects, action.name, (x) => x.name)
        if (p) {
          s.updateProject(p.id, {
            ...(action.status ? { status: action.status } : {}),
            ...(typeof action.progress === "number" ? { progress: action.progress } : {}),
            ...(action.note ? { note: action.note } : {}),
          })
          return { ok: true, label: `Project · ${p.name} updated` }
        }
        s.addProject({ name: action.name, status: action.status, progress: action.progress, note: action.note })
        return { ok: true, label: `Project · ${action.name.trim()}` }
      }
      case "add_journal_entry": {
        if (!action.text?.trim()) return { ok: false, label: "Empty entry" }
        const kind = ["journal", "gratitude", "reflection", "win"].includes(action.kind) ? action.kind : "journal"
        s.addJournal(kind, action.text)
        return { ok: true, label: `${kind[0].toUpperCase()}${kind.slice(1)} logged` }
      }
      case "set_form_of_address": {
        const address = action.address?.trim()
        if (!address) return { ok: false, label: "No address given" }
        s.updateSettings({ address })
        return { ok: true, label: `Addressing you as "${address}"` }
      }
      case "update_profile": {
        const patch: Record<string, unknown> = {}
        if (action.name) patch.name = action.name.trim()
        if (action.wake_time && /^\d{1,2}:\d{2}$/.test(action.wake_time)) patch.wakeTime = action.wake_time.padStart(5, "0")
        if (typeof action.monthly_budget === "number" && action.monthly_budget > 0) patch.monthlyBudget = action.monthly_budget
        if (action.vision) patch.vision = action.vision.trim()
        if (!Object.keys(patch).length) return { ok: false, label: "Nothing to update" }
        s.updateSettings(patch)
        return { ok: true, label: `Profile updated · ${Object.keys(patch).join(", ")}` }
      }
      case "set_net_worth": {
        if (!Number.isFinite(action.amount)) return { ok: false, label: "Invalid amount" }
        s.updateSettings({ netWorth: action.amount })
        return { ok: true, label: `Net worth · ${formatMoney(action.amount, cur)}` }
      }
      case "open_panel": {
        if (!isPillar(action.pillar)) return { ok: false, label: "Unknown panel" }
        s.setUI({ activePillar: action.pillar })
        return { ok: true, label: `Opened ${PILLAR_BY_ID[action.pillar].name}` }
      }
    }
  } catch (e) {
    return { ok: false, label: e instanceof Error ? e.message : "Action failed" }
  }
  return { ok: false, label: "Unknown action" }
}
