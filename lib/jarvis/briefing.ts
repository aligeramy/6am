import { format } from "date-fns"
import { daysUntil, greetingFor } from "./dates"
import { PILLAR_BY_ID } from "./pillars"
import { formatMinutes, formatMoney } from "./scoring"
import { computeStatus } from "./snapshot"
import type { JarvisData, PillarId } from "./types"

const NUDGES: Record<PillarId, string> = {
  health: "I'd suggest prioritising movement and an early night.",
  wealth: "A quick review of today's spending would serve you well.",
  career: "Protect a two hour block for deep work before the world wakes up.",
  mind: "Twenty minutes of reading would rebalance the cognitive systems.",
  habits: "Your daily protocols need attention. Start with the easiest one.",
  missions: "Pick one mission and move it forward by a single milestone.",
  spirit: "Take a moment to write down three things you're grateful for.",
}

/** Offline briefing: assembled from your data when the neural link (Claude) is not connected. */
export function localBriefing(data: JarvisData, now = new Date()): string {
  const s = computeStatus(data)
  const { settings } = data
  const addr = settings.address
  const parts: string[] = []

  parts.push(`${greetingFor(now)}, ${addr}. It's ${format(now, "EEEE, MMMM do")}, ${format(now, "h:mm a")}.`)

  if (s.life !== null) {
    parts.push(`Life index stands at ${s.life} percent.`)
  } else {
    parts.push("I don't have enough telemetry for a life index yet. Log a few things today and I'll start building the picture.")
  }

  if (s.lastSleep) {
    const verdict = s.lastSleep >= settings.targets.sleep ? "right on target" : s.lastSleep >= settings.targets.sleep - 1 ? "slightly under target" : "well below target"
    parts.push(`You logged ${s.lastSleep.toFixed(1)} hours of sleep, ${verdict}.`)
  }

  if (s.activeMissions.length) {
    const top = s.activeMissions[0]
    const due = top.due ? (daysUntil(top.due) >= 0 ? `, due in ${daysUntil(top.due)} days` : ", which is overdue") : ""
    parts.push(
      `${s.activeMissions.length} active mission${s.activeMissions.length > 1 ? "s" : ""}. Priority is "${top.title}" at ${top.progress} percent${due}.`,
    )
  }

  const pending = s.habitsToday.filter((h) => !h.done)
  if (data.habits.length) {
    if (pending.length) {
      const names = pending.slice(0, 4).map((h) => h.name)
      parts.push(`${pending.length} protocol${pending.length > 1 ? "s" : ""} to complete today: ${names.join(", ")}.`)
      const best = [...s.habitsToday].sort((a, b) => b.streak - a.streak)[0]
      if (best && best.streak >= 3) parts.push(`Your ${best.name} streak is at ${best.streak} days. Let's not break it.`)
    } else {
      parts.push("All daily protocols are already complete. Impressive.")
    }
  }

  if (s.fin.count > 0) {
    const pct = settings.monthlyBudget > 0 ? Math.round((s.fin.expense / settings.monthlyBudget) * 100) : null
    parts.push(
      `This month you've spent ${formatMoney(s.fin.expense, settings.currency)}${pct !== null ? `, ${pct} percent of budget` : ""}, with a net of ${formatMoney(s.fin.net, settings.currency)}.`,
    )
  }

  if (s.deepworkWeek > 0) parts.push(`Deep work this week: ${formatMinutes(s.deepworkWeek)}.`)

  if (s.weakest && s.life !== null) {
    parts.push(`${PILLAR_BY_ID[s.weakest].name} is your lowest pillar. ${NUDGES[s.weakest]}`)
  }

  if (settings.vision) parts.push(`Remember why: ${settings.vision}`)
  parts.push("Shall we begin?")
  return parts.join(" ")
}

export function localStatusReport(data: JarvisData): string {
  const s = computeStatus(data)
  const addr = data.settings.address
  if (s.life === null) return `Systems are online, ${addr}, but I have no telemetry yet. Tell me how you slept, what you spent, or what you worked on and I'll start tracking.`
  const ranked = (Object.entries(s.scores) as [PillarId, number | null][])
    .filter(([, v]) => v !== null)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  return (
    `Life index at ${s.life} percent, ${addr}. ` +
    `${PILLAR_BY_ID[best[0]].name} leads at ${best[1]}. ` +
    (ranked.length > 1 ? `${PILLAR_BY_ID[worst[0]].name} trails at ${worst[1]}. ${NUDGES[worst[0]]}` : "")
  ).trim()
}
