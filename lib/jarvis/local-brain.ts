import { localStatusReport } from "./briefing"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./pillars"
import type { JarvisAction, JarvisData, PillarId } from "./types"

export interface BrainResult {
  reply: string
  actions: JarvisAction[]
  briefing?: boolean
}

const num = (s: string | undefined) => (s ? parseFloat(s.replace(/,/g, "")) : NaN)

/** Parse a duration like "2h", "1.5 hours", "45 min", "2h 30m" into minutes. */
function minutes(text: string): number | null {
  const hm = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\s*(?:and\s*)?(\d+)\s*(?:m|min|mins|minutes?)\b/)
  if (hm) return num(hm[1]) * 60 + num(hm[2])
  const h = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/)
  if (h) return num(h[1]) * 60
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes?)\b/)
  if (m) return num(m[1])
  return null
}

const CAPITALIZE = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

function guessCategory(text: string, list: string[], fallback: string) {
  const aliases: Record<string, string> = {
    lunch: "food", dinner: "food", breakfast: "food", groceries: "food", coffee: "food", restaurant: "food", uber: "transport",
    lyft: "transport", gas: "transport", parking: "transport", spotify: "subscriptions", netflix: "subscriptions",
    gym: "health", doctor: "health", flight: "travel", hotel: "travel", mic: "gear", plugin: "gear", show: "shows", gig: "shows",
    paycheck: "salary", royalties: "streaming", streams: "streaming", client: "freelance", merch: "sales", dividend: "investment",
  }
  const lower = text.toLowerCase()
  const direct = list.find((c) => lower.includes(c))
  if (direct) return direct
  for (const [k, v] of Object.entries(aliases)) if (lower.includes(k) && list.includes(v)) return v
  return fallback
}

function parseClause(raw: string, data: JarvisData): { actions: JarvisAction[]; reply?: string; briefing?: boolean } | null {
  const text = raw.toLowerCase().trim()
  const original = raw.trim()
  if (!text) return null

  // ── Identity ─────────────────────────────────────────
  const addr = original.match(/(?:call me|address me as|refer to me as|you can call me)\s+["']?([^"'.!?]+)["']?/i)
  if (addr) return { actions: [{ type: "set_form_of_address", address: CAPITALIZE(addr[1].trim()) }] }
  const name = original.match(/my name is\s+([a-z][a-z' -]{0,40})/i)
  if (name) return { actions: [{ type: "update_profile", name: CAPITALIZE(name[1].trim()) }] }
  const wake = text.match(/(?:wake(?: me)?(?: up)?|wake time)(?: is| at| to)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (wake && /wake/.test(text)) {
    let h = parseInt(wake[1], 10)
    if (wake[3] === "pm" && h < 12) h += 12
    if (wake[3] === "am" && h === 12) h = 0
    return { actions: [{ type: "update_profile", wake_time: `${String(h).padStart(2, "0")}:${wake[2] || "00"}` }] }
  }

  // ── Reports ──────────────────────────────────────────
  if (/\b(briefing|brief me|morning report)\b/.test(text)) return { actions: [], briefing: true }
  if (/\b(status|report|how am i doing|how'?s my (week|life|day)|sitrep|diagnostic)\b/.test(text))
    return { actions: [], reply: localStatusReport(data) }

  // ── Navigation ───────────────────────────────────────
  const open = text.match(/\b(?:open|show|pull up|display)\b.*\b(health|wealth|money|finance|career|work|mind|habits?|missions?|goals?|spirit)\b/)
  if (open) {
    const map: Record<string, PillarId> = {
      money: "wealth", finance: "wealth", work: "career", habit: "habits", mission: "missions", goal: "missions", goals: "missions",
    }
    return { actions: [{ type: "open_panel", pillar: (map[open[1]] ?? open[1]) as PillarId }] }
  }

  // ── Money ────────────────────────────────────────────
  const spent = text.match(/(?:spent|spend|paid|bought|expense|cost)\D{0,20}?\$?\s?(\d[\d,]*(?:\.\d+)?)/)
  if (spent) {
    const amount = num(spent[1])
    const onWhat = text.match(/(?:on|for)\s+([a-z ]+)/)
    return {
      actions: [
        {
          type: "add_transaction",
          kind: "expense",
          amount,
          category: guessCategory(text, EXPENSE_CATEGORIES, "other"),
          note: onWhat?.[1]?.trim(),
        },
      ],
    }
  }
  const earned = text.match(/(?:earned|made|got paid|received|income|paid me)\D{0,20}?\$?\s?(\d[\d,]*(?:\.\d+)?)/)
  if (earned) {
    const fromWhat = text.match(/(?:from|for)\s+([a-z ]+)/)
    return {
      actions: [
        {
          type: "add_transaction",
          kind: "income",
          amount: num(earned[1]),
          category: guessCategory(text, INCOME_CATEGORIES, "other"),
          note: fromWhat?.[1]?.trim(),
        },
      ],
    }
  }
  const nw = text.match(/net worth\D{0,12}\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(k)?/)
  if (nw) return { actions: [{ type: "set_net_worth", amount: num(nw[1]) * (nw[2] ? 1000 : 1) }] }
  const budget = text.match(/budget\D{0,12}\$?\s?(\d[\d,]*)/)
  if (budget) return { actions: [{ type: "update_profile", monthly_budget: num(budget[1]) }] }

  // ── Habits (before generic activity parsing) ─────────
  const newHabit = original.match(/(?:new|add|create|track)\s+(?:a\s+)?habit[:\s]+(.+)/i)
  if (newHabit) return { actions: [{ type: "create_habit", name: CAPITALIZE(newHabit[1].trim()) }] }
  const doneHabit = original.match(/(?:completed?|done with|did|finished|check off|checked off|mark)\s+(?:my\s+)?(.+?)(?:\s+(?:habit|as done))?$/i)
  if (doneHabit && data.habits.length) {
    const q = doneHabit[1].toLowerCase()
    const hit = data.habits.find((h) => q.includes(h.name.toLowerCase()) || h.name.toLowerCase().includes(q))
    if (hit) return { actions: [{ type: "complete_habit", habit: hit.name }] }
  }

  // ── Missions & projects ──────────────────────────────
  const newMission = original.match(/(?:new|add|create)\s+(?:a\s+)?(?:mission|goal)[:\s]+(.+)/i)
  if (newMission)
    return { actions: [{ type: "create_mission", title: newMission[1].trim(), pillar: "missions", horizon: "quarter" }] }
  const missionPct = original.match(/(?:mission|goal)?\s*["']?(.+?)["']?\s+(?:is\s+)?(?:at|to)\s+(\d{1,3})\s*%/i)
  if (missionPct && data.missions.length)
    return { actions: [{ type: "update_mission", title: missionPct[1].replace(/^(set|update)\s+/i, ""), progress: num(missionPct[2]) }] }
  const newProject = original.match(/(?:new|add|start(?:ed)?)\s+(?:a\s+)?project[:\s]+(.+)/i)
  if (newProject) return { actions: [{ type: "upsert_project", name: newProject[1].trim(), status: "active" }] }

  // ── Journal ──────────────────────────────────────────
  const grateful = original.match(/(?:grateful|thankful)\s+(?:for|that)\s+(.+)/i) || original.match(/gratitude[:\s]+(.+)/i)
  if (grateful) return { actions: [{ type: "add_journal_entry", kind: "gratitude", text: grateful[1].trim() }] }
  const journal = original.match(/^(?:journal|note|dear diary)[:\s]+(.+)/i)
  if (journal) return { actions: [{ type: "add_journal_entry", kind: "journal", text: journal[1].trim() }] }
  const win = original.match(/^(?:win|victory)[:\s]+(.+)/i)
  if (win) return { actions: [{ type: "add_journal_entry", kind: "win", text: win[1].trim() }] }
  const shipped = original.match(/\b(?:shipped|released|launched|dropped|finished)\s+(.+)/i)
  if (shipped)
    return {
      actions: [
        { type: "log_metric", metric: "shipped", value: 1, note: shipped[1].trim() },
        { type: "add_journal_entry", kind: "win", text: `Shipped ${shipped[1].trim()}` },
      ],
    }

  // ── Health & mind telemetry ──────────────────────────
  const mins = minutes(text)
  if (/\bslept|sleep\b/.test(text)) {
    const h = text.match(/(\d+(?:\.\d+)?)/)
    const hours = mins !== null ? mins / 60 : h ? num(h[1]) : NaN
    if (Number.isFinite(hours)) return { actions: [{ type: "log_metric", metric: "sleep", value: Math.round(hours * 4) / 4 }] }
  }
  if (/\bwater|glass(es)?\b/.test(text)) {
    const g = text.match(/(\d+)/)
    return { actions: [{ type: "log_metric", metric: "water", value: g ? num(g[1]) : 1 }] }
  }
  if (/\b(weigh|weight)\b/.test(text)) {
    const w = text.match(/(\d+(?:\.\d+)?)/)
    if (w) return { actions: [{ type: "log_metric", metric: "weight", value: num(w[1]) }] }
  }
  const scale = text.match(/\b(mood|energy)\b\D{0,12}(\d{1,2})/)
  if (scale) return { actions: [{ type: "log_metric", metric: scale[1], value: num(scale[2]) }] }
  if (/\b(work(ed)? ?out|gym|ran|run|lift(ed)?|training|trained|yoga|swim|swam|cycl|bike|hike|hiked|cardio|exercise)\b/.test(text)) {
    let m = mins
    const k = text.match(/(\d+(?:\.\d+)?)\s*(k|km|miles?)\b/)
    if (m === null && k) m = num(k[1]) * (k[2].startsWith("mile") ? 9 : 6)
    return { actions: [{ type: "log_metric", metric: "workout", value: Math.round(m ?? 45), note: original }] }
  }
  if (/\b(meditat|breathwork|breathing)/.test(text))
    return { actions: [{ type: "log_metric", metric: "meditation", value: Math.round(mins ?? 10) }] }
  if (/\b(read|reading)\b/.test(text)) {
    const pages = text.match(/(\d+)\s*pages?/)
    return { actions: [{ type: "log_metric", metric: "reading", value: Math.round(mins ?? (pages ? num(pages[1]) * 2 : 30)) }] }
  }
  if (/\b(studied|study|learned|learning|course|practiced|practice)\b/.test(text))
    return { actions: [{ type: "log_metric", metric: "learning", value: Math.round(mins ?? 30), note: original }] }
  if (/\b(pray|prayed|prayer|reflect|reflected|reflection)\b/.test(text))
    return { actions: [{ type: "log_metric", metric: "reflection", value: Math.round(mins ?? 10) }] }
  if (/\b(deep work|studio|focused|focus|wrote|writing|recorded|recording|produced|producing|mixed|mixing|coded|coding|worked on|work session)\b/.test(text))
    return { actions: [{ type: "log_metric", metric: "deepwork", value: Math.round(mins ?? 60), note: original }] }

  return null
}

const CONFIRMATIONS = [
  "Logged, {a}.",
  "Done. Telemetry updated, {a}.",
  "Recorded, {a}.",
  "Noted and filed, {a}.",
  "Consider it done, {a}.",
]

/** Offline brain: handles logging, reports, and identity changes without Claude. */
export function localBrain(input: string, data: JarvisData): BrainResult {
  const a = data.settings.address
  const text = input.trim()
  const lower = text.toLowerCase()

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening)|jarvis)[!. ]*$/i.test(text))
    return { reply: `At your service, ${a}. How can I help?`, actions: [] }
  if (/\b(thank(s| you)|cheers|appreciate)\b/.test(lower)) return { reply: `Always a pleasure, ${a}.`, actions: [] }
  if (/\b(help|what can you do|commands)\b/.test(lower))
    return {
      reply:
        `I can log your life by voice or text, ${a}. Try "slept 7 hours", "spent 40 dollars on food", "two hours in the studio", ` +
        `"meditated 10 minutes", "grateful for my family", "new habit cold shower", "new mission release the album", ` +
        `"status report", or "call me Boss".`,
      actions: [],
    }

  // Split compound sentences: "slept 7h, spent $40 and did 30 min studio"
  const clauses = text
    .split(/\s*(?:,|;|\.\s|\band then\b|\band also\b|\balso\b|\band\b(?=\s+(?:i\s+)?(?:slept|spent|paid|earned|made|ran|read|did|meditated|drank|worked|studied|went|had|completed|finished|got)))\s*/i)
    .filter(Boolean)

  const actions: JarvisAction[] = []
  let reply: string | undefined
  let briefing = false
  for (const clause of clauses) {
    const r = parseClause(clause, data)
    if (!r) continue
    actions.push(...r.actions)
    if (r.reply) reply = r.reply
    if (r.briefing) briefing = true
  }

  if (briefing) return { reply: "", actions, briefing: true }
  if (reply) return { reply, actions }
  if (actions.length) {
    const only = actions.length === 1 ? actions[0] : null
    if (only?.type === "set_form_of_address") return { reply: `Very well. From now on I'll address you as ${only.address}.`, actions }
    if (only?.type === "open_panel") return { reply: `On screen, ${a}.`, actions }
    const pick = CONFIRMATIONS[Math.floor(Math.random() * CONFIRMATIONS.length)]
    return { reply: pick.replace("{a}", a), actions }
  }

  return {
    reply:
      `My neural link is offline, ${a}, so I can't hold a full conversation yet. I can still log anything you tell me. ` +
      `Try "slept 7 hours" or "spent 20 on lunch". Add an Anthropic API key to give me a full brain.`,
    actions: [],
  }
}
