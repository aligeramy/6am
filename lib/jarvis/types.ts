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
  /** Quick replies offered when Jared asks a question. */
  options?: string[]
  /** Set when this reply changed the app; lets you undo it. */
  undoable?: boolean
}

/* ───────── Ideas ───────── */

export type IdeaStatus = "new" | "exploring" | "doing" | "parked" | "done"

export interface IdeaNote {
  id: string
  text: string
  ts: number
}

export interface Idea {
  id: string
  title: string
  rating: number // 0 = unrated, 1-5 stars
  status: IdeaStatus
  tags: string[]
  notes: IdeaNote[]
  createdAt: number
  updatedAt: number
}

/* ───────── Appearance & layout (what the Workshop edits) ───────── */

export type SectionId = "greeting" | "habits" | "missions" | "ideas" | "health" | "wealth" | "career" | "mind" | "spirit"

export interface SectionPref {
  hidden?: boolean
  collapsed?: boolean
  title?: string
}

export interface Appearance {
  accent: string // hex, drives the whole HUD color
  warning: string
  danger: string
  background: string
  fontScale: number // 0.85 - 1.3
  customCss: string
  left: SectionId[]
  right: SectionId[]
  sections: Partial<Record<SectionId, SectionPref>>
}

/** Anything that opens in the detail sheet. */
export type PanelId = PillarId | "ideas"

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
  /** Your own Anthropic key, kept in this browser only. Lets Jared reach Claude with no server (e.g. Netlify Drop). */
  apiKey?: string
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
  ideas: Idea[]
  chat: ChatMessage[]
  /** The Workshop's own conversation. */
  workshop: ChatMessage[]
  appearance: Appearance
  settings: Settings
}

/**
 * Everything Jared (local parser or Claude) can do to your data and to the app.
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
  | { type: "open_panel"; pillar: PanelId | "workshop" }
  // Ideas
  | { type: "create_idea"; title: string; note?: string; rating?: number; tags?: string[] }
  | { type: "rate_idea"; idea: string; rating: number }
  | { type: "annotate_idea"; idea: string; note: string }
  | { type: "update_idea"; idea: string; title?: string; status?: IdeaStatus; tags?: string[] }
  | { type: "delete_idea"; idea: string }
  // Workshop: appearance, layout and data fixes
  | { type: "set_theme"; accent?: string; warning?: string; danger?: string; background?: string; font_scale?: number }
  | { type: "update_section"; section: SectionId; title?: string; hidden?: boolean; collapsed?: boolean; column?: "left" | "right"; position?: number }
  | { type: "set_custom_css"; css: string; mode?: "replace" | "append" }
  | { type: "reset_appearance" }
  | { type: "delete_entries"; ids: string[] }
  | { type: "edit_entry"; id: string; value?: number; amount?: number; date?: string; note?: string; category?: string }
  | { type: "ask_user"; question: string; options?: string[] }
