"use client"

import { applyAction } from "./actions"
import { localBriefing } from "./briefing"
import { todayKey } from "./dates"
import { localBrain } from "./local-brain"
import { buildSnapshot } from "./snapshot"
import { exportData, useJarvis } from "./store"
import type { ChatAction, JarvisAction } from "./types"
import { voice } from "./voice"

export interface LinkStatus {
  online: boolean
  authorized: boolean
  locked: boolean
}

export async function checkLink(): Promise<LinkStatus> {
  try {
    const res = await fetch("/api/jarvis", { headers: authHeaders() })
    if (!res.ok) return { online: false, authorized: false, locked: false }
    return await res.json()
  } catch {
    return { online: false, authorized: false, locked: false }
  }
}

function authHeaders(): Record<string, string> {
  const code = useJarvis.getState().settings.passcode
  return code ? { "x-jarvis-code": code } : {}
}

async function callClaude(mode: "chat" | "briefing") {
  const data = exportData()
  const res = await fetch("/api/jarvis", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      mode,
      snapshot: buildSnapshot(data),
      messages: data.chat.slice(-14).map((m) => ({ role: m.role, text: m.text })),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.message || err.error || `HTTP ${res.status}`), { code: err.error, status: res.status })
  }
  return (await res.json()) as { reply: string; actions: JarvisAction[] }
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
        const code = (e as { code?: string }).code
        const local = localBrain(text, exportData())
        chips = local.actions.map(applyAction)
        briefing = !!local.briefing
        const why = code === "unauthorized" ? "the access code doesn't match" : "the neural link dropped"
        reply = `${local.reply} (Running locally: ${why}.)`.trim()
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
