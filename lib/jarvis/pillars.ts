import type { PillarId } from "./types"

export interface MetricDef {
  id: string
  pillar: PillarId
  label: string
  unit: string
  /** How a day's multiple entries combine */
  aggregate: "sum" | "last" | "avg"
  step: number
  min: number
  max: number
  quick?: number
}

export interface PillarDef {
  id: PillarId
  index: string
  name: string
  short: string
  tagline: string
}

export const PILLARS: PillarDef[] = [
  { id: "health", index: "01", name: "Health", short: "HLTH", tagline: "Body telemetry" },
  { id: "wealth", index: "02", name: "Wealth", short: "WLTH", tagline: "Financial reactor" },
  { id: "career", index: "03", name: "Career", short: "CRER", tagline: "Creative output" },
  { id: "mind", index: "04", name: "Mind", short: "MIND", tagline: "Cognitive systems" },
  { id: "habits", index: "05", name: "Habits", short: "HBTS", tagline: "Daily protocols" },
  { id: "missions", index: "06", name: "Missions", short: "MSSN", tagline: "Objectives" },
  { id: "spirit", index: "07", name: "Spirit", short: "SPRT", tagline: "Purpose core" },
]

export const PILLAR_BY_ID = Object.fromEntries(PILLARS.map((p) => [p.id, p])) as Record<PillarId, PillarDef>

export const METRICS: MetricDef[] = [
  { id: "sleep", pillar: "health", label: "Sleep", unit: "h", aggregate: "last", step: 0.25, min: 0, max: 24, quick: 7.5 },
  { id: "workout", pillar: "health", label: "Workout", unit: "min", aggregate: "sum", step: 5, min: 0, max: 600, quick: 45 },
  { id: "water", pillar: "health", label: "Water", unit: "glasses", aggregate: "sum", step: 1, min: 0, max: 30, quick: 1 },
  { id: "weight", pillar: "health", label: "Weight", unit: "lb", aggregate: "last", step: 0.1, min: 0, max: 1000 },
  { id: "energy", pillar: "health", label: "Energy", unit: "/10", aggregate: "avg", step: 1, min: 1, max: 10, quick: 7 },
  { id: "deepwork", pillar: "career", label: "Deep work", unit: "min", aggregate: "sum", step: 15, min: 0, max: 1440, quick: 90 },
  { id: "shipped", pillar: "career", label: "Shipped", unit: "items", aggregate: "sum", step: 1, min: 0, max: 100, quick: 1 },
  { id: "reading", pillar: "mind", label: "Reading", unit: "min", aggregate: "sum", step: 5, min: 0, max: 1440, quick: 30 },
  { id: "meditation", pillar: "mind", label: "Meditation", unit: "min", aggregate: "sum", step: 5, min: 0, max: 600, quick: 10 },
  { id: "learning", pillar: "mind", label: "Learning", unit: "min", aggregate: "sum", step: 5, min: 0, max: 1440, quick: 30 },
  { id: "mood", pillar: "mind", label: "Mood", unit: "/10", aggregate: "avg", step: 1, min: 1, max: 10, quick: 7 },
  { id: "reflection", pillar: "spirit", label: "Reflection", unit: "min", aggregate: "sum", step: 5, min: 0, max: 600, quick: 10 },
]

export const METRIC_BY_ID = Object.fromEntries(METRICS.map((m) => [m.id, m])) as Record<string, MetricDef>

export const metricsFor = (pillar: PillarId) => METRICS.filter((m) => m.pillar === pillar)

export const EXPENSE_CATEGORIES = [
  "food",
  "rent",
  "transport",
  "studio",
  "gear",
  "subscriptions",
  "health",
  "fun",
  "shopping",
  "travel",
  "bills",
  "other",
]

export const INCOME_CATEGORIES = ["salary", "shows", "streaming", "freelance", "sales", "investment", "other"]

export const ADDRESS_PRESETS = ["Sir", "Ma'am", "Boss", "Chief", "Captain", "Commander"]
