import { dayKey, uid } from "./dates"
import type { JarvisData } from "./types"

/** Realistic sample data so you can see every panel lit up. Replaces existing data. */
export function demoData(): Omit<JarvisData, "settings" | "chat"> {
  const r = (min: number, max: number, dp = 0) => +(min + Math.random() * (max - min)).toFixed(dp)
  const logs: JarvisData["logs"] = []
  const transactions: JarvisData["transactions"] = []
  const log = (metric: string, pillar: JarvisData["logs"][number]["pillar"], value: number, offset: number, note?: string) =>
    logs.push({ id: uid(), metric, pillar, value, note, date: dayKey(offset), ts: Date.now() + offset * 86400000 })

  for (let d = -29; d <= 0; d++) {
    if (Math.random() > 0.1) log("sleep", "health", r(5.5, 8.6, 1) - (d % 7 === 0 ? 1 : 0), d)
    if (Math.random() > 0.45) log("workout", "health", r(30, 75), d)
    log("water", "health", r(3, 9), d)
    if (Math.random() > 0.5) log("energy", "health", r(5, 9), d)
    if (d % 4 === 0) log("weight", "health", r(172, 176, 1), d)
    if (Math.random() > 0.25) log("deepwork", "career", r(60, 260), d, "Studio session")
    if (Math.random() > 0.35) log("reading", "mind", r(10, 45), d)
    if (Math.random() > 0.5) log("meditation", "mind", r(5, 20), d)
    if (Math.random() > 0.6) log("learning", "mind", r(15, 60), d)
    if (Math.random() > 0.3) log("mood", "mind", r(5, 9), d)
    if (Math.random() > 0.7) log("reflection", "spirit", r(5, 15), d)
    if (Math.random() > 0.35)
      transactions.push({ id: uid(), kind: "expense", amount: r(8, 70), category: ["food", "transport", "fun", "subscriptions"][r(0, 3)], date: dayKey(d), ts: Date.now() })
  }
  log("shipped", "career", 1, -3, "Single: Blessings (remix)")

  const now = new Date()
  const monthDay = (n: number) => dayKey(-(now.getDate() - Math.min(n, now.getDate())))
  transactions.push(
    { id: uid(), kind: "income", amount: 4200, category: "salary", note: "Paycheck", date: monthDay(1), ts: Date.now() },
    { id: uid(), kind: "income", amount: 850, category: "shows", note: "Friday show", date: monthDay(10), ts: Date.now() },
    { id: uid(), kind: "income", amount: 312, category: "streaming", note: "Royalties", date: monthDay(15), ts: Date.now() },
    { id: uid(), kind: "expense", amount: 1650, category: "rent", date: monthDay(1), ts: Date.now() },
    { id: uid(), kind: "expense", amount: 240, category: "studio", note: "Studio time", date: monthDay(8), ts: Date.now() },
  )

  const habitNames = ["Wake at 6am", "Cold shower", "Workout", "Read 20 pages", "No phone first hour"]
  const habits = habitNames.map((name, i) => ({
    id: uid(),
    name,
    createdAt: Date.now(),
    completions: Array.from({ length: 28 }, (_, k) => dayKey(-k)).filter((_, k) => (k === 0 ? i < 2 : Math.random() > 0.2 + i * 0.08)),
  }))

  const missions: JarvisData["missions"] = [
    {
      id: uid(),
      title: "Release the album",
      pillar: "career",
      horizon: "quarter",
      due: dayKey(48),
      progress: 0,
      status: "active",
      createdAt: Date.now(),
      milestones: [
        { id: uid(), title: "Finish writing", done: true },
        { id: uid(), title: "Record vocals", done: true },
        { id: uid(), title: "Mix & master", done: false },
        { id: uid(), title: "Cover art & rollout plan", done: false },
      ],
    },
    { id: uid(), title: "Run a half marathon", pillar: "health", horizon: "year", due: dayKey(140), progress: 35, status: "active", createdAt: Date.now(), milestones: [] },
    { id: uid(), title: "6 month emergency fund", pillar: "wealth", horizon: "year", due: dayKey(200), progress: 52, status: "active", createdAt: Date.now(), milestones: [] },
    { id: uid(), title: "Read 24 books", pillar: "mind", horizon: "year", progress: 58, status: "active", createdAt: Date.now(), milestones: [] },
  ].map((m) => (m.milestones.length ? { ...m, progress: Math.round((m.milestones.filter((x) => x.done).length / m.milestones.length) * 100) } : m)) as JarvisData["missions"]

  const projects: JarvisData["projects"] = [
    { id: uid(), name: "Album: Not Sorry", status: "active", progress: 65, createdAt: Date.now() },
    { id: uid(), name: "Music video: Tony in LA", status: "active", progress: 30, createdAt: Date.now() },
    { id: uid(), name: "Merch drop", status: "idea", progress: 0, createdAt: Date.now() },
  ]

  const journal: JarvisData["journal"] = [
    { id: uid(), kind: "gratitude", text: "My family showing up to the show", date: dayKey(-5), ts: Date.now() - 5e8 },
    { id: uid(), kind: "gratitude", text: "Good health and a clear head this morning", date: dayKey(-2), ts: Date.now() - 2e8 },
    { id: uid(), kind: "gratitude", text: "The team believing in this album", date: dayKey(-1), ts: Date.now() - 1e8 },
    { id: uid(), kind: "win", text: "Shipped the Blessings remix", date: dayKey(-3), ts: Date.now() - 3e8 },
    { id: uid(), kind: "journal", text: "Felt locked in during the late session. Protect the mornings.", date: dayKey(-1), ts: Date.now() - 9e7 },
  ]

  return { logs, transactions, habits, missions, projects, journal }
}
