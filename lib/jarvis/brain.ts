"use client"

import type Anthropic from "@anthropic-ai/sdk"
import { applyAction } from "./actions"
import { localBriefing } from "./briefing"
import type { JarvisRequest, JarvisResult } from "./claude"
import { todayKey } from "./dates"
import { localBrain } from "./local-brain"
import { buildSnapshot, buildWorkshopSnapshot } from "./snapshot"
import { exportData, useJarvis } from "./store"
import { localWorkshop } from "./workshop-local"
import type { ChatAction, JarvisAction, JarvisData } from "./types"
import { voice } from "./voice"

export interface LinkStatus {
  online: boolean
  authorized: boolean
  locked: boolean
}

/** Is there a Jared server (app/api/jarvis) with a key? On static hosting like Netlify Drop there isn't. */
export async function checkLink(): Promise<LinkStatus> {
  try {
    const res = await fetch("/api/jarvis", { headers: authHeaders() })
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return { online: false, authorized: false, locked: false }
    return await res.json()
  } catch {
    return { online: false, authorized: false, locked: false }
  }
}

function authHeaders(): Record<string, string> {
  const code = useJarvis.getState().settings.passcode
  return code ? { "x-jarvis-code": code } : {}
}

type ErrorCode = "auth" | "unauthorized" | "billing" | "rate_limited" | "network" | "api"

const fail = (code: ErrorCode, message: string) => Object.assign(new Error(message), { code })

/* ───────── Direct mode: your own API key, straight from the browser to Anthropic ───────── */

let direct: { key: string; client: Anthropic; sdk: typeof import("@anthropic-ai/sdk") } | null = null

async function directRun(apiKey: string, req: JarvisRequest): Promise<JarvisResult> {
  // Loaded on demand so the dashboard stays light for anyone without a key.
  const [sdk, { runJarvis }] = await Promise.all([import("@anthropic-ai/sdk"), import("./claude")])
  if (!direct || direct.key !== apiKey) {
    direct = { key: apiKey, sdk, client: new sdk.default({ apiKey, dangerouslyAllowBrowser: true }) }
  }
  const A = sdk.default
  try {
    return await runJarvis(direct.client, req)
  } catch (e) {
    if (e instanceof A.AuthenticationError || e instanceof A.PermissionDeniedError) throw fail("auth", "Your Anthropic API key was rejected.")
    if (e instanceof A.RateLimitError) throw fail("rate_limited", "Rate limited. Try again in a moment.")
    if (e instanceof A.APIConnectionError) throw fail("network", "Couldn't reach Anthropic. Check your connection.")
    if (e instanceof A.APIError) {
      if (/credit|billing|balance/i.test(e.message)) throw fail("billing", "Your Anthropic account needs credit.")
      throw fail("api", e.message)
    }
    throw e
  }
}

/** One cheap round trip so Settings can confirm a key works. */
export async function testKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await directRun(apiKey, {
      mode: "chat",
      snapshot: `USER: address them as "${useJarvis.getState().settings.address}"`,
      messages: [{ role: "user", text: "Systems check. Confirm you're online in one short sentence. Do not call any tools." }],
    })
    return { ok: true, message: r.reply || "Neural link established." }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Connection failed." }
  }
}

/* ───────── Server mode: app/api/jarvis holds the key ───────── */

async function serverRun(req: JarvisRequest): Promise<JarvisResult> {
  const res = await fetch("/api/jarvis", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.message || err.error || `HTTP ${res.status}`), { code: err.error, status: res.status })
  }
  return res.json()
}

async function callClaude(mode: "chat" | "briefing" | "workshop") {
  const data = exportData()
  const history = mode === "workshop" ? data.workshop : data.chat
  const req: JarvisRequest = {
    mode,
    snapshot: mode === "workshop" ? buildWorkshopSnapshot(data) : buildSnapshot(data),
    messages: history.slice(-14).map((m) => ({ role: m.role, text: m.text })),
  }
  const key = data.settings.apiKey?.trim()
  const r = key ? await directRun(key, req) : await serverRun(req)
  return r as { reply: string; actions: JarvisAction[] }
}

const WHY: Record<string, string> = {
  auth: "your API key was rejected",
  unauthorized: "the access code doesn't match",
  billing: "your Anthropic account needs credit",
  rate_limited: "rate limited",
  network: "no connection to Anthropic",
}

function speak(text: string) {
  const st = useJarvis.getState().settings
  return voice.speak(text, { voiceURI: st.voiceURI, rate: st.voiceRate, pitch: st.voicePitch, enabled: st.voiceEnabled })
}

/** Morning briefing: Claude if connected, otherwise assembled locally. Opens the briefing overlay and speaks it. */
export async function runBriefing(online: boolean) {
  const store = useJarvis.getState()
  store.updateSettings({ lastBriefingDate: todayKey() })
  voice.setThinking(true)
  let text = ""
  if (online) {
    try {
      text = (await callClaude("briefing")).reply
    } catch {
      text = ""
    }
  }
  if (!text) text = localBriefing(exportData())
  voice.setThinking(false)
  store.setUI({ briefingOpen: true, briefingText: text })
  store.pushChat({ role: "jarvis", text })
  await speak(text)
}

let busy = false

/** Handle one user command end to end: log it, think, act, reply, speak. */
export async function sendCommand(input: string, online: boolean) {
  const text = input.trim()
  if (!text || busy) return
  busy = true
  const store = useJarvis.getState()
  store.pushChat({ role: "user", text })
  voice.setThinking(true)

  let reply = ""
  let chips: ChatAction[] = []
  let briefing = false

  try {
    if (online) {
      try {
        const r = await callClaude("chat")
        chips = r.actions.map(applyAction)
        reply = r.reply || (chips.length ? `Done, ${store.settings.address}.` : "")
      } catch (e) {
        const code = (e as { code?: string }).code ?? ""
        const local = localBrain(text, exportData())
        chips = local.actions.map(applyAction)
        briefing = !!local.briefing
        reply = `${local.reply} (Running locally: ${WHY[code] ?? "the neural link dropped"}.)`.trim()
      }
    } else {
      const local = localBrain(text, exportData())
      chips = local.actions.map(applyAction)
      briefing = !!local.briefing
      reply = local.reply
    }
  } finally {
    voice.setThinking(false)
    busy = false
  }

  if (briefing) {
    await runBriefing(online)
    return
  }
  if (reply || chips.length) {
    useJarvis.getState().pushChat({ role: "jarvis", text: reply, actions: chips.length ? chips : undefined })
    await speak(reply)
  }
}

/* ───────── Workshop: changes the app itself, with undo ───────── */

/** Snapshots taken before each Workshop change, keyed by the reply that made it. Kept for this session only. */
const undoStack = new Map<string, Omit<JarvisData, "chat" | "workshop" | "settings">>()

function snapshotForUndo() {
  const d = exportData()
  return structuredClone({
    logs: d.logs,
    transactions: d.transactions,
    habits: d.habits,
    missions: d.missions,
    projects: d.projects,
    journal: d.journal,
    ideas: d.ideas,
    appearance: d.appearance,
  })
}

/** Undo is linear: only the most recent change can be undone, then the one before it, and so on. */
export const canUndo = (messageId: string) => [...undoStack.keys()].pop() === messageId

export function undoWorkshop(messageId: string) {
  const snap = undoStack.get(messageId)
  if (!snap) return false
  useJarvis.getState().importData(snap)
  undoStack.delete(messageId)
  useJarvis.setState((s) => ({ workshop: s.workshop.map((m) => (m.id === messageId ? { ...m, undoable: false, text: `${m.text} (Undone.)` } : m)) }))
  return true
}

let workshopBusy = false

export async function sendWorkshop(input: string, online: boolean) {
  const text = input.trim()
  if (!text || workshopBusy) return
  workshopBusy = true
  const store = useJarvis.getState()
  store.pushWorkshop({ role: "user", text })
  voice.setThinking(true)
  const before = snapshotForUndo()
  let reply = ""
  let actions: JarvisAction[] = []
  try {
    if (online) {
      try {
        const r = await callClaude("workshop")
        actions = r.actions
        reply = r.reply
      } catch (e) {
        const code = (e as { code?: string }).code ?? ""
        const local = localWorkshop(text)
        actions = local.actions
        reply = `${local.reply} (Claude isn't reachable: ${WHY[code] ?? "the neural link dropped"}.)`
      }
    } else {
      const local = localWorkshop(text)
      actions = local.actions
      reply = local.reply
    }
  } finally {
    voice.setThinking(false)
    workshopBusy = false
  }

  const chips = actions.map(applyAction).filter((c) => c.label)
  const ask = actions.find((a): a is Extract<JarvisAction, { type: "ask_user" }> => a.type === "ask_user")
  const changed = actions.some((a) => a.type !== "ask_user" && a.type !== "open_panel")
  if (ask && !reply.includes(ask.question)) reply = [reply, ask.question].filter(Boolean).join(" ")
  const msg = useJarvis.getState().pushWorkshop({
    role: "jarvis",
    text: reply || (changed ? "Done." : "I'm not sure what to change there."),
    actions: chips.length ? chips : undefined,
    options: ask?.options?.slice(0, 4),
    undoable: changed || undefined,
  })
  if (changed) undoStack.set(msg.id, before)
}
