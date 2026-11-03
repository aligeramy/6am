"use client"

import { METRIC_BY_ID, PILLAR_BY_ID } from "./pillars"
import { useJarvis } from "./store"
import { formatMinutes, formatMoney } from "./scoring"
import { todayKey } from "./dates"
import { DEFAULT_APPEARANCE } from "./store"
import type { ChatAction, IdeaStatus, JarvisAction, PillarId, SectionId } from "./types"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()

// Words people say around a name ("the podcast idea", "my cold shower habit") that shouldn't affect matching.
const FILLER = new Set(["the", "my", "a", "an", "that", "this", "idea", "habit", "mission", "project", "one", "about", "for", "on", "of", "to"])
const core = (s: string) => norm(s).split(" ").filter((w) => !FILLER.has(w)).join(" ")

/** Best fuzzy match by token overlap; returns null if nothing is close. */
export function fuzzyFind<T>(items: T[], query: string, key: (t: T) => string): T | null {
  const q = norm(query)
  if (!q) return null
  const exact = items.find((i) => norm(key(i)) === q)
  if (exact) return exact
  const qc = core(query) || q
  const contains = items.find((i) => {
    const k = norm(key(i))
    return k.includes(qc) || qc.includes(k)
  })
  if (contains) return contains
  const qTokens = new Set(qc.split(" ").filter((t) => t.length > 2))
  let best: T | null = null
  let bestScore = 0
  for (const item of items) {
    const tokens = core(key(item)).split(" ").filter(Boolean)
    const hits = tokens.filter((t) => qTokens.has(t)).length
    const score = hits / Math.max(1, Math.min(tokens.length, qTokens.size))
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return bestScore >= 0.5 ? best : null
}

const isPillar = (p: unknown): p is PillarId => typeof p === "string" && p in PILLAR_BY_ID
const isDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
const isHex = (c: unknown): c is string => typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.trim())
const SECTIONS: SectionId[] = [...DEFAULT_APPEARANCE.left, ...DEFAULT_APPEARANCE.right]
const SECTION_NAMES: Record<SectionId, string> = {
  greeting: "Greeting",
  today: "Today",
  insights: "Insights",
  habits: "Habits",
  missions: "Missions",
  ideas: "Ideas",
  health: "Health",
  wealth: "Wealth",
  career: "Career",
  mind: "Mind",
  spirit: "Spirit",
}
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n)

/** Strip anything in custom CSS that could load remote content or break out of the style tag. */
export function sanitizeCss(css: string) {
  return css
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/expression\s*\(/gi, "(")
    .slice(0, 20000)
}

/** Apply one action to the store and describe what happened (shown as a chip under Jared's reply). */
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
        if (action.pillar === "workshop") {
          s.setUI({ workshopOpen: true })
          return { ok: true, label: "Opened the Workshop" }
        }
        if (action.pillar === "plan" || action.pillar === "review") {
          s.setUI({ ritual: action.pillar })
          return { ok: true, label: action.pillar === "plan" ? "Opened morning plan" : "Opened evening review" }
        }
        if (action.pillar === "achievements") {
          s.setUI({ activePillar: "achievements" })
          return { ok: true, label: "Opened achievements" }
        }
        if (action.pillar === "ideas") {
          s.setUI({ activePillar: "ideas" })
          return { ok: true, label: "Opened Ideas" }
        }
        if (!isPillar(action.pillar)) return { ok: false, label: "Unknown panel" }
        s.setUI({ activePillar: action.pillar })
        return { ok: true, label: `Opened ${PILLAR_BY_ID[action.pillar].name}` }
      }

      /* ───── Ideas ───── */
      case "create_idea": {
        if (!action.title?.trim()) return { ok: false, label: "Idea needs a title" }
        const rating = Number.isFinite(action.rating) ? Math.max(0, Math.min(5, Math.round(action.rating!))) : 0
        s.addIdea({ title: action.title, note: action.note, rating, tags: action.tags })
        return { ok: true, label: `Idea · ${action.title.trim().slice(0, 40)}${rating ? ` ${stars(rating)}` : ""}` }
      }
      case "rate_idea": {
        const idea = fuzzyFind(s.ideas, action.idea, (x) => x.title)
        if (!idea) return { ok: false, label: `No idea matching "${action.idea}"` }
        const rating = Math.max(0, Math.min(5, Math.round(action.rating)))
        s.updateIdea(idea.id, { rating })
        return { ok: true, label: `${idea.title.slice(0, 32)} · ${stars(rating)}` }
      }
      case "annotate_idea": {
        const idea = fuzzyFind(s.ideas, action.idea, (x) => x.title)
        if (!idea) return { ok: false, label: `No idea matching "${action.idea}"` }
        if (!action.note?.trim()) return { ok: false, label: "Empty note" }
        s.addIdeaNote(idea.id, action.note)
        return { ok: true, label: `Note added · ${idea.title.slice(0, 32)}` }
      }
      case "update_idea": {
        const idea = fuzzyFind(s.ideas, action.idea, (x) => x.title)
        if (!idea) return { ok: false, label: `No idea matching "${action.idea}"` }
        const statuses: IdeaStatus[] = ["new", "exploring", "doing", "parked", "done"]
        s.updateIdea(idea.id, {
          ...(action.title?.trim() ? { title: action.title.trim() } : {}),
          ...(action.status && statuses.includes(action.status) ? { status: action.status } : {}),
          ...(action.tags ? { tags: action.tags } : {}),
        })
        return { ok: true, label: `Idea updated · ${idea.title.slice(0, 32)}` }
      }
      case "delete_idea": {
        const idea = fuzzyFind(s.ideas, action.idea, (x) => x.title)
        if (!idea) return { ok: false, label: `No idea matching "${action.idea}"` }
        s.deleteIdea(idea.id)
        return { ok: true, label: `Deleted idea · ${idea.title.slice(0, 32)}` }
      }

      /* ───── Workshop ───── */
      case "set_theme": {
        const patch: Record<string, unknown> = {}
        for (const k of ["accent", "warning", "danger", "background"] as const) {
          if (action[k] !== undefined) {
            if (!isHex(action[k])) return { ok: false, label: `${k} must be a hex color` }
            patch[k] = action[k]!.trim()
          }
        }
        if (action.style === "hud" || action.style === "glass") patch.style = action.style
        if (action.font_scale !== undefined) patch.fontScale = Math.max(0.85, Math.min(1.3, action.font_scale))
        if (!Object.keys(patch).length) return { ok: false, label: "No theme change" }
        s.updateAppearance(patch)
        return { ok: true, label: `Theme · ${Object.entries(patch).map(([k, v]) => `${k} ${v}`).join(", ")}` }
      }
      case "update_section": {
        if (!SECTIONS.includes(action.section)) return { ok: false, label: `Unknown section ${action.section}` }
        const pref: Record<string, unknown> = {}
        if (action.title !== undefined) pref.title = action.title.trim() || undefined
        if (action.hidden !== undefined) pref.hidden = action.hidden
        if (action.collapsed !== undefined) pref.collapsed = action.collapsed
        if (Object.keys(pref).length) s.setSection(action.section, pref)
        if (action.column || action.position) {
          const col = action.column ?? (s.appearance.left.includes(action.section) ? "left" : "right")
          s.moveSection(action.section, col, action.position)
        }
        const bits = [
          action.title !== undefined && `renamed "${action.title}"`,
          action.hidden !== undefined && (action.hidden ? "hidden" : "shown"),
          action.collapsed !== undefined && (action.collapsed ? "minimized" : "expanded"),
          (action.column || action.position) && `moved${action.column ? ` to ${action.column}` : ""}${action.position ? ` #${action.position}` : ""}`,
        ].filter(Boolean)
        return { ok: true, label: `${SECTION_NAMES[action.section]} · ${bits.join(", ") || "updated"}` }
      }
      case "set_custom_css": {
        const css = sanitizeCss(action.css || "")
        const next = action.mode === "append" ? `${s.appearance.customCss}\n${css}`.trim() : css
        s.updateAppearance({ customCss: next })
        return { ok: true, label: css ? "Custom styling applied" : "Custom styling cleared" }
      }
      case "reset_appearance": {
        s.resetAppearance()
        return { ok: true, label: "Appearance reset to default" }
      }
      case "delete_entries": {
        const n = s.deleteEntries(Array.isArray(action.ids) ? action.ids : [])
        return { ok: n > 0, label: n > 0 ? `Deleted ${n} entr${n === 1 ? "y" : "ies"}` : "No matching entries" }
      }
      case "edit_entry": {
        const log = s.logs.find((l) => l.id === action.id)
        const tx = s.transactions.find((t) => t.id === action.id)
        if (!log && !tx) return { ok: false, label: "Entry not found" }
        if (log) {
          useJarvis.setState({
            logs: s.logs.map((l) =>
              l.id === log.id
                ? {
                    ...l,
                    ...(Number.isFinite(action.value) ? { value: action.value! } : {}),
                    ...(isDate(action.date) ? { date: action.date } : {}),
                    ...(action.note !== undefined ? { note: action.note } : {}),
                  }
                : l,
            ),
          })
          return { ok: true, label: `Edited ${METRIC_BY_ID[log.metric]?.label ?? log.metric} entry` }
        }
        useJarvis.setState({
          transactions: s.transactions.map((t) =>
            t.id === tx!.id
              ? {
                  ...t,
                  ...(Number.isFinite(action.amount ?? action.value) ? { amount: Math.abs((action.amount ?? action.value)!) } : {}),
                  ...(isDate(action.date) ? { date: action.date } : {}),
                  ...(action.note !== undefined ? { note: action.note } : {}),
                  ...(action.category ? { category: action.category.toLowerCase() } : {}),
                }
              : t,
          ),
        })
        return { ok: true, label: `Edited ${tx!.kind} entry` }
      }
      case "set_top3": {
        const items = (action.items || []).map((x) => x.trim()).filter(Boolean).slice(0, 3)
        if (!items.length) return { ok: false, label: "No priorities given" }
        s.setTop3(items)
        if (!s.days[todayKey()]?.plannedAt) s.setDay(todayKey(), { plannedAt: Date.now() })
        return { ok: true, label: `Top ${items.length} set` }
      }
      case "complete_priority": {
        const day = s.days[todayKey()]
        const p = day ? fuzzyFind(day.top3, action.item, (x) => x.text) : null
        if (!p) return { ok: false, label: `No priority matching "${action.item}"` }
        s.togglePriority(p.id, todayKey(), true)
        return { ok: true, label: `Priority ✓ ${p.text.slice(0, 36)}` }
      }
      case "start_focus": {
        const minutes = Math.max(5, Math.min(180, Math.round(action.minutes || 25)))
        const day = s.days[todayKey()]
        const label = action.label?.trim() || day?.top3.find((p) => !p.done)?.text || "Deep work"
        s.setFocus({ label, startedAt: Date.now(), durationMin: minutes })
        return { ok: true, label: `Focus · ${minutes}m · ${label.slice(0, 30)}` }
      }
      case "stop_focus": {
        const f = s.focus
        if (!f) return { ok: false, label: "No focus session running" }
        const done = Math.round((Date.now() - f.startedAt) / 60000)
        if (action.log !== false && done >= 5) s.addLog({ metric: "deepwork", value: done, note: `Focus: ${f.label}` })
        s.setFocus(null)
        return { ok: true, label: action.log !== false && done >= 5 ? `Focus ended · ${done}m logged` : "Focus ended" }
      }
      case "ask_user":
        // Rendered as quick-reply buttons under the message; nothing to change.
        return { ok: true, label: "" }
    }
  } catch (e) {
    return { ok: false, label: e instanceof Error ? e.message : "Action failed" }
  }
  return { ok: false, label: "Unknown action" }
}
