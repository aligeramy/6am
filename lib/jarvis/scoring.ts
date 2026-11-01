import { daysUntil, lastNDays, monthElapsedFraction, monthPrefix, todayKey } from "./dates"
import { METRIC_BY_ID } from "./pillars"
import type { Habit, JarvisData, LogEntry, PillarId, Transaction } from "./types"

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Value of a metric on a day, combining multiple entries per its aggregate rule. null = nothing logged. */
export function dayValue(logs: LogEntry[], metric: string, date: string): number | null {
  const entries = logs.filter((l) => l.metric === metric && l.date === date)
  if (!entries.length) return null
  const agg = METRIC_BY_ID[metric]?.aggregate ?? "sum"
  if (agg === "last") return entries.sort((a, b) => a.ts - b.ts)[entries.length - 1].value
  if (agg === "avg") return mean(entries.map((e) => e.value))
  return entries.reduce((a, e) => a + e.value, 0)
}

/** One value per day for the last n days (null for empty days), oldest first. */
export function series(logs: LogEntry[], metric: string, days = 14) {
  return lastNDays(days).map((date) => ({ date, value: dayValue(logs, metric, date) }))
}

export function weekTotal(logs: LogEntry[], metric: string) {
  return series(logs, metric, 7).reduce((a, d) => a + (d.value ?? 0), 0)
}

export function weekAvg(logs: LogEntry[], metric: string) {
  const vals = series(logs, metric, 7)
    .map((d) => d.value)
    .filter((v): v is number => v !== null)
  return vals.length ? mean(vals) : null
}

export function weekDaysWith(logs: LogEntry[], metric: string) {
  return series(logs, metric, 7).filter((d) => (d.value ?? 0) > 0).length
}

export function latest(logs: LogEntry[], metric: string) {
  const entries = logs.filter((l) => l.metric === metric).sort((a, b) => a.ts - b.ts)
  return entries.length ? entries[entries.length - 1] : null
}

/* ───────────── Money ───────────── */

export function monthFinance(transactions: Transaction[], d: Date = new Date()) {
  const prefix = monthPrefix(d)
  const month = transactions.filter((t) => t.date.startsWith(prefix))
  const income = month.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0)
  const expense = month.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount, 0)
  const byCategory: Record<string, number> = {}
  month
    .filter((t) => t.kind === "expense")
    .forEach((t) => (byCategory[t.category] = (byCategory[t.category] || 0) + t.amount))
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null
  return { income, expense, net: income - expense, savingsRate, byCategory, count: month.length }
}

/** Cumulative spending per day this month, for the burn chart. */
export function spendBurn(transactions: Transaction[], d: Date = new Date()) {
  const prefix = monthPrefix(d)
  const today = d.getDate()
  let running = 0
  return Array.from({ length: today }, (_, i) => {
    const day = `${prefix}-${String(i + 1).padStart(2, "0")}`
    running += transactions.filter((t) => t.kind === "expense" && t.date === day).reduce((a, t) => a + t.amount, 0)
    return { date: day, value: running }
  })
}

/* ───────────── Habits ───────────── */

export function habitStreak(h: Habit, today = todayKey()) {
  const set = new Set(h.completions)
  const days = lastNDays(400)
  let i = days.length - 1
  // A streak is still alive if today isn't done yet but yesterday was.
  if (!set.has(today)) i--
  let streak = 0
  while (i >= 0 && set.has(days[i])) {
    streak++
    i--
  }
  return streak
}

export function habitWeekRate(habits: Habit[]) {
  if (!habits.length) return null
  const days = lastNDays(7)
  const possible = habits.length * days.length
  const done = habits.reduce((a, h) => a + days.filter((d) => h.completions.includes(d)).length, 0)
  return done / possible
}

/* ───────────── Pillar scores ───────────── */

export type Scores = Record<PillarId, number | null>

export function pillarScores(data: JarvisData): Scores {
  const { logs, settings, transactions, habits, missions, projects, journal } = data
  const t = settings.targets
  const parts = (xs: (number | null)[]) => {
    const real = xs.filter((x): x is number => x !== null)
    return real.length ? Math.round(mean(real.map(clamp01)) * 100) : null
  }

  const sleepAvg = weekAvg(logs, "sleep")
  const waterAvg = weekAvg(logs, "water")
  const energyAvg = weekAvg(logs, "energy")
  const workoutDays = weekDaysWith(logs, "workout")
  const anyHealth = logs.some((l) => l.pillar === "health")
  const health = parts([
    sleepAvg !== null ? sleepAvg / t.sleep : null,
    waterAvg !== null ? waterAvg / t.water : null,
    energyAvg !== null ? energyAvg / 10 : null,
    anyHealth ? workoutDays / Math.max(1, t.workout) : null,
  ])

  const fin = monthFinance(transactions)
  const elapsed = monthElapsedFraction()
  const budgetUse = settings.monthlyBudget > 0 ? fin.expense / settings.monthlyBudget : null
  const wealth = parts([
    fin.savingsRate !== null ? fin.savingsRate / Math.max(1, t.savingsRate) : null,
    budgetUse !== null && fin.count > 0 ? (budgetUse <= elapsed ? 1 : 1 - (budgetUse - elapsed) * 1.5) : null,
  ])

  const deepHours = weekTotal(logs, "deepwork") / 60
  const activeProjects = projects.filter((p) => p.status === "active")
  const anyCareer = logs.some((l) => l.pillar === "career") || projects.length > 0
  const career = parts([
    anyCareer ? deepHours / Math.max(1, t.deepwork) : null,
    activeProjects.length ? mean(activeProjects.map((p) => p.progress / 100)) : null,
    weekTotal(logs, "shipped") > 0 ? 1 : null,
  ])

  const anyMind = logs.some((l) => l.pillar === "mind")
  const moodAvg = weekAvg(logs, "mood")
  const mind = anyMind
    ? parts([
        weekTotal(logs, "reading") / (t.reading * 7),
        weekTotal(logs, "meditation") / (t.meditation * 7),
        weekTotal(logs, "learning") / (t.learning * 7),
        moodAvg !== null ? moodAvg / 10 : null,
      ])
    : null

  const rate = habitWeekRate(habits)
  const habitsScore = rate === null ? null : Math.round(rate * 100)

  const missionsScore = missions.length
    ? Math.round(
        mean(
          missions.map((m) => {
            if (m.status === "done") return 1
            // Behind-schedule missions score lower than their raw progress.
            const pace = m.due && daysUntil(m.due) < 0 ? 0.6 : 1
            return (m.progress / 100) * pace
          }),
        ) * 100,
      )
    : null

  const week = new Set(lastNDays(7))
  const gratitude = journal.filter((j) => j.kind === "gratitude" && week.has(j.date)).length
  const reflections = journal.filter((j) => (j.kind === "reflection" || j.kind === "journal") && week.has(j.date)).length
  const anySpirit = journal.length > 0 || logs.some((l) => l.pillar === "spirit") || !!settings.vision
  const spirit = anySpirit
    ? parts([
        gratitude / Math.max(1, t.gratitude),
        (weekDaysWith(logs, "reflection") + reflections) / 4,
        settings.vision ? 1 : 0,
      ])
    : null

  return { health, wealth, career, mind, habits: habitsScore, missions: missionsScore, spirit }
}

export function lifeScore(scores: Scores) {
  const vals = Object.values(scores).filter((v): v is number => v !== null)
  return vals.length ? Math.round(mean(vals)) : null
}

export function weakestPillar(scores: Scores): PillarId | null {
  let worst: PillarId | null = null
  let min = Infinity
  for (const [k, v] of Object.entries(scores) as [PillarId, number | null][]) {
    if (v !== null && v < min) {
      min = v
      worst = k
    }
  }
  return worst
}

export function formatMoney(n: number, currency = "$") {
  const abs = Math.abs(n)
  const s = abs >= 10000 ? `${(abs / 1000).toFixed(1)}k` : abs.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return `${n < 0 ? "-" : ""}${currency}${s}`
}

export function formatMinutes(min: number) {
  if (min < 60) return `${Math.round(min)}m`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}
