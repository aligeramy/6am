import { format } from "date-fns"
import { daysUntil, lastNDays, todayKey } from "./dates"
import { PILLARS } from "./pillars"
import {
  dayValue,
  formatMinutes,
  formatMoney,
  habitStreak,
  latest,
  lifeScore,
  monthFinance,
  pillarScores,
  weakestPillar,
  weekAvg,
  weekDaysWith,
  weekTotal,
} from "./scoring"
import type { JarvisData } from "./types"

/** Computed facts both the local brain and Claude reason over. */
export function computeStatus(data: JarvisData) {
  const scores = pillarScores(data)
  const life = lifeScore(scores)
  const today = todayKey()
  const yesterday = lastNDays(2)[0]
  const fin = monthFinance(data.transactions)
  const habitsToday = data.habits.map((h) => ({
    name: h.name,
    done: h.completions.includes(today),
    streak: habitStreak(h),
  }))
  const activeMissions = data.missions
    .filter((m) => m.status === "active")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
  const lastSleep = dayValue(data.logs, "sleep", today) ?? dayValue(data.logs, "sleep", yesterday)
  return {
    scores,
    life,
    weakest: weakestPillar(scores),
    fin,
    habitsToday,
    activeMissions,
    lastSleep: lastSleep || null,
    sleepAvg: weekAvg(data.logs, "sleep"),
    workoutDays: weekDaysWith(data.logs, "workout"),
    deepworkWeek: weekTotal(data.logs, "deepwork"),
  }
}

/** A compact plain-text picture of the user's life, sent to Claude as context. */
export function buildSnapshot(data: JarvisData): string {
  const { settings: st, logs } = data
  const now = new Date()
  const s = computeStatus(data)
  const cur = st.currency
  const lines: string[] = []

  lines.push(`NOW: ${format(now, "EEEE yyyy-MM-dd HH:mm")} (user's local time)`)
  lines.push(`USER: name=${st.name || "(not set)"}; address them as "${st.address}"; wake time ${st.wakeTime}`)
  lines.push(
    `SCORES (0-100, last 7 days, null = no data): life=${s.life ?? "null"}; ` +
      PILLARS.map((p) => `${p.id}=${s.scores[p.id] ?? "null"}`).join(", "),
  )

  const days = lastNDays(7)
  const metricLine = (metric: string, label: string, fmt: (v: number) => string) => {
    const vals = days.map((d) => {
      const v = dayValue(logs, metric, d)
      return v === null ? "-" : fmt(v)
    })
    return `  ${label}: ${vals.join(" | ")}`
  }
  lines.push(`LAST 7 DAYS (${days[0]} → ${days[6]}, oldest first):`)
  lines.push(metricLine("sleep", "sleep h", (v) => v.toFixed(1)))
  lines.push(metricLine("workout", "workout min", (v) => String(Math.round(v))))
  lines.push(metricLine("water", "water glasses", (v) => String(v)))
  lines.push(metricLine("deepwork", "deep work min", (v) => String(Math.round(v))))
  lines.push(metricLine("reading", "reading min", (v) => String(Math.round(v))))
  lines.push(metricLine("meditation", "meditation min", (v) => String(Math.round(v))))
  lines.push(metricLine("learning", "learning min", (v) => String(Math.round(v))))
  const w = latest(logs, "weight")
  if (w) lines.push(`  latest weight: ${w.value} ${st.weightUnit} on ${w.date}`)
  const mood = weekAvg(logs, "mood")
  const energy = weekAvg(logs, "energy")
  if (mood !== null) lines.push(`  mood avg: ${mood.toFixed(1)}/10`)
  if (energy !== null) lines.push(`  energy avg: ${energy.toFixed(1)}/10`)

  const t = st.targets
  lines.push(
    `TARGETS: sleep ${t.sleep}h/night, ${t.workout} workouts/week, water ${t.water}/day, reading ${t.reading}m/day, ` +
      `meditation ${t.meditation}m/day, learning ${t.learning}m/day, deep work ${t.deepwork}h/week, ` +
      `gratitude ${t.gratitude}/week, savings rate ${t.savingsRate}%, monthly budget ${formatMoney(st.monthlyBudget, cur)}`,
  )

  const cats = Object.entries(s.fin.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, v]) => `${c} ${formatMoney(v, cur)}`)
    .join(", ")
  lines.push(
    `MONEY THIS MONTH: income ${formatMoney(s.fin.income, cur)}, spent ${formatMoney(s.fin.expense, cur)}, net ${formatMoney(s.fin.net, cur)}` +
      (s.fin.savingsRate !== null ? `, savings rate ${Math.round(s.fin.savingsRate)}%` : "") +
      (cats ? `; top categories: ${cats}` : "") +
      (st.netWorth !== undefined ? `; net worth ${formatMoney(st.netWorth, cur)}` : ""),
  )

  lines.push(
    `HABITS TODAY: ${
      s.habitsToday.length
        ? s.habitsToday.map((h) => `${h.name} [${h.done ? "done" : "pending"}, streak ${h.streak}]`).join("; ")
        : "(none defined)"
    }`,
  )

  const missionText = s.activeMissions.length
    ? s.activeMissions
        .slice(0, 8)
        .map((m) => {
          const due = m.due ? `, due ${m.due} (${daysUntil(m.due)}d)` : ""
          const ms = m.milestones.length
            ? `, milestones: ${m.milestones.map((x) => `${x.done ? "✓" : "○"} ${x.title}`).join(" / ")}`
            : ""
          return `"${m.title}" [${m.horizon}, ${m.pillar}, ${m.progress}%${due}${ms}]`
        })
        .join("; ")
    : "(none)"
  lines.push(`ACTIVE MISSIONS: ${missionText}`)

  const projects = data.projects.filter((p) => p.status !== "shipped").slice(0, 8)
  lines.push(
    `PROJECTS: ${projects.length ? projects.map((p) => `"${p.name}" [${p.status}, ${p.progress}%]`).join("; ") : "(none)"}`,
  )
  lines.push(`DEEP WORK THIS WEEK: ${formatMinutes(s.deepworkWeek)}`)

  const recent = [...data.journal].sort((a, b) => b.ts - a.ts).slice(0, 5)
  if (recent.length) lines.push(`RECENT JOURNAL: ${recent.map((j) => `[${j.kind} ${j.date}] ${j.text.slice(0, 140)}`).join(" || ")}`)
  if (st.vision) lines.push(`LIFE VISION: ${st.vision}`)
  if (st.values.length) lines.push(`CORE VALUES: ${st.values.join(", ")}`)

  return lines.join("\n")
}
