export type PillarId = "health" | "wealth" | "career" | "mind" | "habits" | "missions" | "spirit"

/** A numeric measurement on a given day, e.g. 7.5 hours of sleep. */
export interface LogEntry {
  id: string
  pillar: PillarId
  metric: string
  value: number
  note?: string
  /** Local calendar day, YYYY-MM-DD */
  date: string
  ts: number
}

export interface Transaction {
  id: string
  kind: "income" | "expense"
  amount: number
  category: string
  note?: string
  date: string
  ts: number
}

export interface Habit {
  id: string
  name: string
  createdAt: number
  /** Days (YYYY-MM-DD) on which the habit was completed */
  completions: string[]
}

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export type MissionHorizon = "week" | "quarter" | "year" | "life"

export interface Mission {
  id: string
  title: string
  pillar: PillarId
  horizon: MissionHorizon
  progress: number
  due?: string
  milestones: Milestone[]
  status: "active" | "done"
  createdAt: number
}

export type ProjectStatus = "idea" | "active" | "paused" | "shipped"

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  progress: number
  due?: string
  note?: string
  createdAt: number
}

export type JournalKind = "journal" | "gratitude" | "reflection" | "win"

export interface JournalEntry {
  id: string
  kind: JournalKind
  text: string
  date: string
  ts: number
}

export interface ChatAction {
  label: string
  ok: boolean
}

export interface ChatMessage {
  id: string
  role: "user" | "jarvis"
  text: string
  ts: number
  actions?: ChatAction[]
}

export interface Targets {
  sleep: number // hours per night
  workout: number // sessions per week
  water: number // glasses per day
  reading: number // minutes per day
  meditation: number // minutes per day
  learning: number // minutes per day
  deepwork: number // hours per week
  gratitude: number // entries per week
  savingsRate: number // percent
}

export interface Settings {
  address: string
  name: string
  wakeTime: string // HH:mm
  briefingEnabled: boolean
  lastBriefingDate?: string
  voiceEnabled: boolean
  voiceURI?: string
  voiceRate: number
  voicePitch: number
  wakeWordEnabled: boolean
  bootSequence: boolean
  passcode?: string
  currency: string
  weightUnit: "lb" | "kg"
  monthlyBudget: number
  netWorth?: number
  vision: string
  values: string[]
  targets: Targets
}

export interface JarvisData {
  logs: LogEntry[]
  transactions: Transaction[]
  habits: Habit[]
  missions: Mission[]
  projects: Project[]
  journal: JournalEntry[]
  chat: ChatMessage[]
  settings: Settings
}

/**
 * Everything JARVIS (local parser or Claude) can do to your data.
 * The server never touches storage; it returns these and the browser applies them.
 */
export type JarvisAction =
  | { type: "log_metric"; metric: string; value: number; note?: string; date?: string }
  | { type: "add_transaction"; kind: "income" | "expense"; amount: number; category: string; note?: string; date?: string }
  | { type: "complete_habit"; habit: string; date?: string }
  | { type: "create_habit"; name: string }
  | { type: "create_mission"; title: string; pillar: PillarId; horizon: MissionHorizon; due?: string; milestones?: string[] }
  | { type: "update_mission"; title: string; progress?: number; status?: "active" | "done"; complete_milestone?: string }
  | { type: "upsert_project"; name: string; status?: ProjectStatus; progress?: number; note?: string }
  | { type: "add_journal_entry"; kind: JournalKind; text: string }
  | { type: "set_form_of_address"; address: string }
  | { type: "update_profile"; name?: string; wake_time?: string; monthly_budget?: number; vision?: string }
  | { type: "set_net_worth"; amount: number }
  | { type: "open_panel"; pillar: PillarId }
