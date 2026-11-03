import { addDays, format } from "date-fns"
import { isPastTime, todayKey } from "./dates"
import { PILLAR_BY_ID } from "./pillars"
import { dayValue, lifeScore, pillarScores, weakestPillar } from "./scoring"
import type { DayRecord, JarvisData, PillarId } from "./types"

export const tomorrowKey = () => format(addDays(new Date(), 1), "yyyy-MM-dd")

/** What the Today card should invite you to do right now. */
export function ritualState(d: JarvisData) {
  const day = d.days[todayKey()]
  const reviewOpen = isPastTime(d.settings.reviewTime)
  return {
    day,
    planned: !!day?.plannedAt,
    reviewed: !!day?.reviewedAt,
    reviewOpen,
    next: !day?.plannedAt ? ("plan" as const) : reviewOpen && !day?.reviewedAt ? ("review" as const) : null,
  }
}

/** Things worth putting in today's Top 3: unfinished priorities, next milestones, active projects, top ideas. */
export function prioritySuggestions(d: JarvisData): string[] {
  const out: string[] = []
  const yesterday = format(addDays(new Date(), -1), "yyyy-MM-dd")
  for (const p of d.days[yesterday]?.top3 ?? []) if (!p.done) out.push(p.text)
  for (const p of d.days[todayKey()]?.top3 ?? []) out.push(p.text)
  for (const m of d.missions.filter((x) => x.status === "active")) {
    const next = m.milestones.find((x) => !x.done)
    out.push(next ? `${m.title}: ${next.title}` : m.title)
  }
  for (const p of d.projects.filter((x) => x.status === "active")) out.push(`Work on ${p.name}`)
  for (const i of [...d.ideas].filter((x) => x.rating >= 4 && x.status !== "done").slice(0, 2)) out.push(`Move forward: ${i.title}`)
  return [...new Set(out)].slice(0, 8)
}

const NUDGE: Record<PillarId, string> = {
  health: "get to bed early enough for a full night",
  wealth: "check this week's spending before buying anything non-essential",
  career: "block 90 minutes of deep work before messages",
  mind: "read for 20 minutes before bed",
  habits: "do the easiest pending habit first thing tomorrow",
  missions: "move one mission forward by a single milestone",
  spirit: "write down three things you're grateful for tonight",
}

/** Evening debrief without Claude: plain and constructive, always ending in one concrete fix. */
export function localReviewFeedback(d: JarvisData, day: DayRecord): string {
  const parts: string[] = []
  const total = day.top3.length
  const done = day.top3.filter((p) => p.done).length
  const open = day.top3.find((p) => !p.done)
  const slipped =
    open &&
    [1, 2].some((n) => d.days[format(addDays(new Date(), -n), "yyyy-MM-dd")]?.top3.some((p) => p.text === open.text && !p.done))

  if (!total) parts.push("No priorities were set today, so there was nothing to measure the day against.")
  else if (done === total) parts.push(`All ${total} priorities closed.`)
  else parts.push(`You closed ${done} of ${total} priorities.`)

  if (open)
    parts.push(
      slipped
        ? `“${open.text}” has now slipped more than once. Make it tomorrow's first task and start it in a 50 minute focus block before messages.`
        : `“${open.text}” stayed open. Put it first tomorrow, while your energy is highest.`,
    )

  const rating = day.rating ?? 0
  const scores = pillarScores(d)
  const weakest = weakestPillar(scores)
  const sleep = dayValue(d.logs, "sleep", todayKey())
  if (sleep !== null && sleep < d.settings.targets.sleep - 1) {
    parts.push(`You're running on ${sleep} hours of sleep, which drags everything else. Lights out early tonight.`)
  } else if (rating && rating <= 5 && weakest) {
    parts.push(`A ${rating} out of 10 day. ${PILLAR_BY_ID[weakest].name} is your weakest pillar at ${scores[weakest]}; tomorrow, ${NUDGE[weakest]}.`)
  } else if (total && done === total && rating >= 8) {
    parts.push("Raise the bar slightly tomorrow: make your first priority the thing you've been avoiding.")
  } else if (weakest && !open) {
    parts.push(`One gap to close: ${PILLAR_BY_ID[weakest].name.toLowerCase()} is lagging at ${scores[weakest]}. Tomorrow, ${NUDGE[weakest]}.`)
  }
  const life = lifeScore(scores)
  if (life !== null) parts.push(`Life index closes the day at ${life}.`)
  return parts.join(" ")
}
