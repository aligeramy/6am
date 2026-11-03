import { lastNDays } from "./dates"
import { PILLAR_BY_ID } from "./pillars"
import { dayValue, habitStreak, monthFinance, weekTotal } from "./scoring"
import type { JarvisData, PillarId } from "./types"

/* ───────────────────────── Suit levels (XP) ─────────────────────────
   XP is derived from what you've actually done, so it can't drift, double count,
   or survive an undo. */

const ROMAN: [number, string][] = [
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
]
export const roman = (n: number) => {
  let out = ""
  for (const [v, s] of ROMAN) while (n >= v) (out += s), (n -= v)
  return out
}

export function computeXP(d: JarvisData) {
  const days = Object.values(d.days)
  const habitChecks = d.habits.reduce((a, h) => a + h.completions.length, 0)
  const prioritiesDone = days.reduce((a, day) => a + day.top3.filter((p) => p.done).length, 0)
  const focusSessions = d.logs.filter((l) => l.metric === "deepwork" && l.note?.startsWith("Focus")).length
  return (
    d.logs.length * 5 +
    d.transactions.length * 2 +
    habitChecks * 10 +
    prioritiesDone * 15 +
    days.filter((x) => x.plannedAt).length * 20 +
    days.filter((x) => x.reviewedAt).length * 30 +
    focusSessions * 25 +
    d.ideas.length * 5 +
    d.ideas.reduce((a, i) => a + i.notes.length, 0) * 2 +
    d.journal.length * 5 +
    d.missions.filter((m) => m.status === "done").length * 100
  )
}

/** XP needed to go from level n to n+1 grows gently, so early levels come fast. */
const stepFor = (level: number) => 100 + (level - 1) * 40

export function levelInfo(xp: number) {
  let level = 1
  let floor = 0
  while (level < 50 && xp >= floor + stepFor(level)) {
    floor += stepFor(level)
    level++
  }
  const step = stepFor(level)
  return { level, name: `Mark ${roman(level)}`, xp, into: xp - floor, step, pct: level >= 50 ? 1 : (xp - floor) / step }
}

/* ───────────────────────── Ritual streak ───────────────────────── */

/** Consecutive days with a morning plan, counting today only once it's done. */
export function ritualStreak(d: JarvisData) {
  const days = lastNDays(365)
  let i = days.length - 1
  if (!d.days[days[i]]?.plannedAt) i--
  let n = 0
  while (i >= 0 && d.days[days[i]]?.plannedAt) {
    n++
    i--
  }
  return n
}

/* ───────────────────────── Achievements ───────────────────────── */

export interface Achievement {
  id: string
  name: string
  detail: string
  unlocked: boolean
}

export function achievements(d: JarvisData): Achievement[] {
  const days = Object.values(d.days)
  const bestHabitStreak = Math.max(0, ...d.habits.map((h) => habitStreak(h)))
  const bestLife = Math.max(0, ...Object.values(d.history).map((h) => h.life ?? 0))
  const focus = d.logs.filter((l) => l.metric === "deepwork" && l.note?.startsWith("Focus")).length
  const fin = monthFinance(d.transactions)
  const streak = ritualStreak(d)
  const list: (Omit<Achievement, "unlocked"> & { test: boolean })[] = [
    { id: "first-light", name: "First Light", detail: "Plan your first day", test: days.some((x) => x.plannedAt) },
    { id: "night-watch", name: "Night Watch", detail: "Complete an evening review", test: days.some((x) => x.reviewedAt) },
    { id: "clean-sweep", name: "Clean Sweep", detail: "Finish all three priorities in a day", test: days.some((x) => x.top3.length === 3 && x.top3.every((p) => p.done)) },
    { id: "ritualist", name: "Ritualist", detail: "Plan your day 7 days in a row", test: streak >= 7 },
    { id: "iron-will", name: "Iron Will", detail: "Hold a habit streak for 7 days", test: bestHabitStreak >= 7 },
    { id: "unbreakable", name: "Unbreakable", detail: "Hold a habit streak for 30 days", test: bestHabitStreak >= 30 },
    { id: "in-the-zone", name: "In the Zone", detail: "Complete a focus session", test: focus >= 1 },
    { id: "deep-diver", name: "Deep Diver", detail: "Log 10 hours of deep work in a week", test: weekTotal(d.logs, "deepwork") >= 600 },
    { id: "arc-stable", name: "Arc Stable", detail: "Reach a life index of 70", test: bestLife >= 70 },
    { id: "overdrive", name: "Overdrive", detail: "Reach a life index of 85", test: bestLife >= 85 },
    { id: "visionary", name: "Visionary", detail: "Capture 10 ideas", test: d.ideas.length >= 10 },
    { id: "five-star", name: "Five Star", detail: "Rate an idea 5 stars", test: d.ideas.some((i) => i.rating === 5) },
    { id: "mission-complete", name: "Mission Complete", detail: "Finish a mission", test: d.missions.some((m) => m.status === "done") },
    { id: "reactor-reserve", name: "Reactor Reserve", detail: "Save 20% of this month's income", test: (fin.savingsRate ?? 0) >= 20 },
  ]
  return list.map(({ test, ...a }) => ({ ...a, unlocked: test }))
}

/* ───────────────────────── Insights ─────────────────────────
   Plain observations from your own data, each paired with a concrete fix. */

export interface Insight {
  id: string
  pillar?: PillarId
  text: string
  fix: string
  weight: number // higher = more worth showing
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Mean of `outcome` on days where `split` is true vs false, if both sides have enough days. */
function compare(days: string[], split: (d: string) => boolean | null, outcome: (d: string) => number | null) {
  const yes: number[] = []
  const no: number[] = []
  for (const day of days) {
    const s = split(day)
    const o = outcome(day)
    if (s === null || o === null) continue
    ;(s ? yes : no).push(o)
  }
  if (yes.length < 3 || no.length < 3) return null
  return { yes: avg(yes), no: avg(no), diff: avg(yes) - avg(no) }
}

export function insights(d: JarvisData): Insight[] {
  const out: Insight[] = []
  const days30 = lastNDays(30)
  const t = d.settings.targets
  const rating = (day: string) => d.days[day]?.rating ?? null
  const mood = (day: string) => dayValue(d.logs, "mood", day) ?? dayValue(d.logs, "energy", day)
  const feel = (day: string) => rating(day) ?? mood(day)
  const feelLabel = Object.values(d.days).filter((x) => x.rating).length >= 5 ? "day rating" : "mood"

  const sleepPrevNight = (day: string) => {
    const v = dayValue(d.logs, "sleep", day)
    return v === null ? null : v >= t.sleep - 0.5
  }
  const sleep = compare(days30, sleepPrevNight, feel)
  if (sleep && sleep.diff >= 0.6)
    out.push({
      id: "sleep-feel",
      pillar: "health",
      text: `Your ${feelLabel} averages ${sleep.yes.toFixed(1)} after ${t.sleep - 0.5}+ hours of sleep, vs ${sleep.no.toFixed(1)} on short nights.`,
      fix: "Set a wind-down alarm 9 hours before your wake time and keep the phone out of the bedroom.",
      weight: sleep.diff * 2,
    })

  const trained = compare(days30, (day) => (dayValue(d.logs, "workout", day) ?? 0) > 0, feel)
  if (trained && trained.diff >= 0.6)
    out.push({
      id: "workout-feel",
      pillar: "health",
      text: `On training days your ${feelLabel} is ${trained.diff.toFixed(1)} points higher (${trained.yes.toFixed(1)} vs ${trained.no.toFixed(1)}).`,
      fix: "Put tomorrow's workout in your Top 3 so it gets protected time.",
      weight: trained.diff * 1.8,
    })

  const deep = compare(days30, (day) => (dayValue(d.logs, "deepwork", day) ?? 0) >= 120, feel)
  if (deep && deep.diff >= 0.6)
    out.push({
      id: "deep-feel",
      pillar: "career",
      text: `Days with 2+ hours of deep work rate ${deep.yes.toFixed(1)} vs ${deep.no.toFixed(1)} without.`,
      fix: "Start a 50-minute focus session before you open messages tomorrow.",
      weight: deep.diff * 1.8,
    })

  // Weakest habit this week
  const week = lastNDays(7)
  const weakest = d.habits
    .map((h) => ({ h, n: week.filter((day) => h.completions.includes(day)).length }))
    .filter((x) => (Date.now() - x.h.createdAt) / 86400000 >= 5)
    .sort((a, b) => a.n - b.n)[0]
  if (weakest && weakest.n <= 3)
    out.push({
      id: "weak-habit",
      pillar: "habits",
      text: `“${weakest.h.name}” is your weakest protocol: ${weakest.n} of the last 7 days.`,
      fix: `Make it smaller for a week (two minutes counts) and tie it to something you already do every morning.`,
      weight: 3 - weakest.n * 0.5,
    })

  // Ritual consistency
  const planned = week.filter((day) => d.days[day]?.plannedAt).length
  const reviewed = week.filter((day) => d.days[day]?.reviewedAt).length
  if (planned >= 3 && reviewed <= planned - 3)
    out.push({
      id: "review-gap",
      text: `You planned ${planned} of the last 7 days but reviewed only ${reviewed}.`,
      fix: "Do tonight's evening review. It takes two minutes and sets up tomorrow's Top 3.",
      weight: 2.2,
    })
  const finished = Object.values(d.days).filter((x) => x.top3.length)
  if (finished.length >= 5) {
    const rate = avg(finished.map((x) => x.top3.filter((p) => p.done).length / x.top3.length))
    if (rate < 0.5)
      out.push({
        id: "overcommit",
        text: `You finish ${Math.round(rate * 100)}% of your daily priorities on average.`,
        fix: "Make priority #1 something you can finish in under 90 minutes, and do it first.",
        weight: 2.4,
      })
  }

  // Spending
  const fin = monthFinance(d.transactions)
  const cats = Object.entries(fin.byCategory).sort((a, b) => b[1] - a[1])
  const elapsed = new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  if (d.settings.monthlyBudget > 0 && fin.expense / d.settings.monthlyBudget > elapsed + 0.12 && cats.length) {
    const flex = cats.find(([c]) => !["rent", "bills"].includes(c))
    out.push({
      id: "budget-pace",
      pillar: "wealth",
      text: `Spending is ahead of pace: ${Math.round((fin.expense / d.settings.monthlyBudget) * 100)}% of budget with ${Math.round(elapsed * 100)}% of the month gone.`,
      fix: flex ? `Cap ${flex[0]} for the rest of the month; it's your biggest flexible category.` : "Hold non-essential spending for the next 7 days.",
      weight: 2.6,
    })
  }

  // Stalled missions
  const stalled = d.missions.find((m) => m.status === "active" && m.due && new Date(m.due).getTime() < Date.now())
  if (stalled)
    out.push({
      id: "overdue-mission",
      pillar: "missions",
      text: `“${stalled.title}” is past its deadline at ${stalled.progress}%.`,
      fix: "Either set a realistic new date or cut it down to the next milestone and finish that this week.",
      weight: 2.8,
    })

  // Best pillar momentum from history
  const hist = lastNDays(14)
    .map((day) => d.history[day])
    .filter(Boolean)
  if (hist.length >= 7) {
    const first = hist.slice(0, 3)
    const last = hist.slice(-3)
    let worst: { p: PillarId; drop: number } | null = null
    for (const p of Object.keys(PILLAR_BY_ID) as PillarId[]) {
      const a = first.map((h) => h.scores[p]).filter((x): x is number => x !== null)
      const b = last.map((h) => h.scores[p]).filter((x): x is number => x !== null)
      if (a.length && b.length) {
        const drop = avg(a) - avg(b)
        if (drop >= 10 && (!worst || drop > worst.drop)) worst = { p, drop }
      }
    }
    if (worst)
      out.push({
        id: "pillar-drop",
        pillar: worst.p,
        text: `${PILLAR_BY_ID[worst.p].name} has dropped ${Math.round(worst.drop)} points over the last two weeks.`,
        fix: `Open ${PILLAR_BY_ID[worst.p].name} and pick one thing to log daily this week.`,
        weight: worst.drop / 6,
      })
  }

  return out.sort((a, b) => b.weight - a.weight)
}

/** Life index for each of the last n days (null where nothing was recorded). */
export function lifeHistory(d: JarvisData, n = 30) {
  return lastNDays(n).map((date) => ({ date, value: d.history[date]?.life ?? null }))
}
