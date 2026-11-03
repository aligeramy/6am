import { format } from "date-fns"
import { daysUntil, lastNDays, todayKey } from "./dates"
import { METRIC_BY_ID, PILLARS } from "./pillars"
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
import { computeXP, insights, levelInfo, lifeHistory, ritualStreak } from "./progress"
import type { JarvisData } from "./types"
import { currentWeather, weatherLine } from "./weather"

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
  // Daily ritual, focus and progress
  const day = data.days[todayKey()]
  const wx = weatherLine(currentWeather())
  if (wx) lines.push(`WEATHER: ${wx}`)
  lines.push(
    `TODAY: ${
      day?.top3.length ? `priorities: ${day.top3.map((p) => `${p.done ? "✓" : "○"} ${p.text}`).join(" / ")}` : "Top 3 not set yet"
    }${day?.intention ? `; intention: ${day.intention}` : ""}${day?.rating ? `; day rating ${day.rating}/10` : ""}${day?.win ? `; win: ${day.win}` : ""}${
      day?.lesson ? `; lesson: ${day.lesson}` : ""
    }; morning plan ${day?.plannedAt ? "done" : "not done"}, evening review ${day?.reviewedAt ? "done" : `opens at ${st.reviewTime}`}`,
  )
  const pastDays = lastNDays(8)
    .slice(0, 7)
    .map((d) => data.days[d])
    .filter((d) => d?.top3.length)
  if (pastDays.length)
    lines.push(
      `RECENT DAYS: ${pastDays
        .map((d) => `${d!.date}: ${d!.top3.filter((p) => p.done).length}/${d!.top3.length} done${d!.rating ? `, rated ${d!.rating}` : ""}${d!.top3.some((p) => !p.done) ? `, open: ${d!.top3.filter((p) => !p.done).map((p) => p.text).join(" + ")}` : ""}`)
        .join("; ")}`,
    )
  if (data.focus) {
    const left = Math.max(0, Math.round(data.focus.durationMin - (Date.now() - data.focus.startedAt) / 60000))
    lines.push(`FOCUS SESSION RUNNING: "${data.focus.label}", ${left} of ${data.focus.durationMin} minutes left`)
  }
  const lvl = levelInfo(computeXP(data))
  const hist = lifeHistory(data, 8).map((h) => h.value)
  const weekAgo = hist[0]
  lines.push(
    `PROGRESS: suit level ${lvl.name} (${lvl.into}/${lvl.step} XP to next), planning streak ${ritualStreak(data)} days` +
      (weekAgo !== null && s.life !== null ? `, life index ${s.life - weekAgo >= 0 ? "+" : ""}${s.life - weekAgo} vs a week ago` : ""),
  )
  const tips = insights(data).slice(0, 3)
  if (tips.length) lines.push(`INSIGHTS (from their data): ${tips.map((i) => `${i.text} Suggested fix: ${i.fix}`).join(" | ")}`)

  if (data.ideas.length) {
    const fmtIdea = (i: JarvisData["ideas"][number]) =>
      `"${i.title}" [${i.rating ? `${i.rating}★` : "unrated"}, ${i.status}${i.tags.length ? `, #${i.tags.join(" #")}` : ""}${i.notes.length ? `, ${i.notes.length} notes` : ""}]`
    const top = [...data.ideas].sort((a, b) => b.rating - a.rating || b.updatedAt - a.updatedAt).slice(0, 12)
    lines.push(`IDEAS (${data.ideas.length} total, best first): ${top.map(fmtIdea).join("; ")}`)
  }
  if (st.vision) lines.push(`LIFE VISION: ${st.vision}`)
  if (st.values.length) lines.push(`CORE VALUES: ${st.values.join(", ")}`)

  return lines.join("\n")
}

/** What the Workshop sees: the current look and layout, plus recent records with ids it can fix. */
export function buildWorkshopSnapshot(data: JarvisData): string {
  const a = data.appearance
  const now = new Date()
  const lines: string[] = []
  const label = (id: string) => {
    const pref = a.sections[id as keyof typeof a.sections] || {}
    const flags = [pref.title && `titled "${pref.title}"`, pref.hidden && "hidden", pref.collapsed && "minimized"].filter(Boolean)
    return flags.length ? `${id} (${flags.join(", ")})` : id
  }
  lines.push(`NOW: ${format(now, "EEEE yyyy-MM-dd HH:mm")} (user's local time). Address the user as "${data.settings.address}".`)
  lines.push(`THEME: accent ${a.accent}, warning ${a.warning}, danger ${a.danger}, background ${a.background}, font scale ${a.fontScale}`)
  lines.push(`LAYOUT: left column (top to bottom): ${a.left.map(label).join(", ")}; right column: ${a.right.map(label).join(", ")}. The arc reactor and the conversation sit in the middle and can't be moved.`)
  lines.push(`CUSTOM CSS: ${a.customCss ? `\n${a.customCss.slice(0, 4000)}` : "(none)"}`)

  const since = lastNDays(21)[0]
  const logs = data.logs.filter((l) => l.date >= since).sort((x, y) => x.date.localeCompare(y.date) || x.ts - y.ts)
  lines.push(`LOGGED ENTRIES since ${since} (id | date | metric | value | note):`)
  for (const l of logs.slice(-250)) lines.push(`  ${l.id} | ${l.date} | ${l.metric} | ${l.value}${METRIC_BY_ID[l.metric]?.unit ? ` ${METRIC_BY_ID[l.metric].unit}` : ""}${l.note ? ` | ${l.note.slice(0, 60)}` : ""}`)
  const tx = data.transactions.filter((t) => t.date >= since).sort((x, y) => x.date.localeCompare(y.date))
  lines.push(`TRANSACTIONS since ${since} (id | date | kind | amount | category | note):`)
  for (const t of tx.slice(-150)) lines.push(`  ${t.id} | ${t.date} | ${t.kind} | ${t.amount} | ${t.category}${t.note ? ` | ${t.note.slice(0, 60)}` : ""}`)
  const journal = [...data.journal].sort((x, y) => y.ts - x.ts).slice(0, 30)
  if (journal.length) {
    lines.push(`JOURNAL (newest first; id | date | kind | text):`)
    for (const j of journal) lines.push(`  ${j.id} | ${j.date} | ${j.kind} | ${j.text.slice(0, 80)}`)
  }
  if (data.ideas.length) {
    lines.push(`IDEAS (id | rating | status | title):`)
    for (const i of data.ideas.slice(0, 80)) lines.push(`  ${i.id} | ${i.rating || "-"} | ${i.status} | ${i.title.slice(0, 80)}`)
  }
  lines.push(`HABITS: ${data.habits.map((h) => h.name).join(", ") || "(none)"}`)
  lines.push(`MISSIONS: ${data.missions.map((m) => `${m.title} (${m.status}, ${m.progress}%)`).join("; ") || "(none)"}`)
  return lines.join("\n")
}
