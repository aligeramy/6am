import { dayKey, uid } from "./dates"
import type { JarvisData } from "./types"

/** Realistic sample data so you can see every panel lit up. Replaces existing data. */
export function demoData(): Omit<JarvisData, "settings" | "chat" | "workshop" | "appearance" | "focus" | "seenAchievements"> {
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

  const idea = (title: string, rating: number, status: JarvisData["ideas"][number]["status"], tags: string[], notes: string[], ago: number) => ({
    id: uid(),
    title,
    rating,
    status,
    tags,
    notes: notes.map((text, i) => ({ id: uid(), text, ts: Date.now() - (ago - i) * 86400000 })),
    createdAt: Date.now() - ago * 86400000,
    updatedAt: Date.now() - Math.max(0, ago - notes.length) * 86400000,
  })
  const ideas: JarvisData["ideas"] = [
    idea("Behind-the-scenes mini doc for the album", 5, "exploring", ["music", "content"], ["Film studio sessions on phone, cut weekly", "Could premiere on YouTube before release"], 6),
    idea("Merch drop tied to the Not Sorry single", 4, "new", ["music", "business"], ["Limited run, 100 hoodies"], 4),
    idea("Morning routine app for creatives", 3, "parked", ["business"], [], 12),
    idea("Monthly listening party in LA", 4, "new", ["music", "community"], [], 2),
    idea("Learn piano basics for songwriting", 0, "new", ["learning"], [], 1),
  ]

  // 30 days of rituals: ratings follow sleep (so the sleep insight has something to find); today is left unplanned.
  const pool = ["Mix track 3", "Write verse for Not Sorry", "Gym: legs", "Edit music video rough cut", "Pitch to two playlists", "Plan merch drop", "Studio: vocals", "Read 20 pages", "Reply to label email", "Budget review"]
  const days: JarvisData["days"] = {}
  const history: JarvisData["history"] = {}
  let life = 52
  for (let d = -29; d <= -1; d++) {
    const date = dayKey(d)
    const sleep = logs.filter((l) => l.metric === "sleep" && l.date === date).reduce((a, l) => a + l.value, 0) || 7
    const good = sleep >= 7.5
    if (Math.random() > 0.2) {
      const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
      const reviewed = Math.random() > 0.3
      days[date] = {
        date,
        top3: picks.map((text, i) => ({ id: uid(), text, done: Math.random() < (good ? 0.85 : 0.5) - i * 0.1 })),
        plannedAt: Date.now() + d * 86400000,
        intention: Math.random() > 0.6 ? "Stay locked in, phone away until noon" : undefined,
        ...(reviewed
          ? {
              reviewedAt: Date.now() + d * 86400000 + 12 * 3600000,
              rating: Math.max(3, Math.min(10, Math.round((good ? 7.6 : 5.6) + (Math.random() * 2 - 1)))),
              win: Math.random() > 0.5 ? "Finished the hook" : undefined,
            }
          : {}),
      }
    }
    life = Math.max(35, Math.min(80, life + (Math.random() * 6 - 2.4)))
    const around = (n: number) => Math.max(10, Math.min(100, Math.round(life + n + (Math.random() * 16 - 8))))
    history[date] = {
      life: Math.round(life),
      scores: { health: around(8), wealth: around(0), career: around(12), mind: around(-4), habits: around(2), missions: around(-6), spirit: around(-14) },
    }
  }

  return { logs, transactions, habits, missions, projects, journal, ideas, days, history }
}
