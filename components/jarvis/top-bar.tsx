"use client"

import { format } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import { Radio, Settings2, Sun, Volume2, VolumeX } from "lucide-react"
import { useEffect, useState } from "react"
import type { VoiceState } from "@/lib/jarvis/voice"
import { Dot, IconButton } from "./hud"

const VOICE_LABEL: Record<VoiceState, string> = {
  off: "",
  wake: "Listening for “Jarvis”",
  command: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
}

export function TopBar({
  online,
  voiceState,
  wakeWord,
  voiceEnabled,
  onToggleVoice,
  onToggleWake,
  onBriefing,
  onSettings,
}: {
  online: boolean | null
  voiceState: VoiceState
  wakeWord: boolean
  voiceEnabled: boolean
  onToggleVoice: () => void
  onToggleWake: () => void
  onBriefing: () => void
  onSettings: () => void
}) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const status = VOICE_LABEL[voiceState] || (online === null ? "Connecting" : online ? "Claude online" : "Local mode")
  const tone = voiceState !== "off" && voiceState !== "wake" ? "var(--j-cyan)" : online ? "var(--j-green)" : online === null ? "var(--j-faint)" : "var(--j-amber)"

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <svg viewBox="-12 -12 24 24" className="h-7 w-7 shrink-0" aria-hidden>
          <circle r="10.5" fill="none" stroke="var(--j-cyan)" strokeWidth="0.8" opacity="0.5" />
          <g className="j-spin" style={{ ["--dur" as string]: "10s" }}>
            <circle r="7.2" fill="none" stroke="var(--j-cyan)" strokeWidth="1.5" strokeDasharray="7 3.3" strokeLinecap="round" />
          </g>
          <circle r="3.4" fill="#d9fbff" style={{ filter: "drop-shadow(0 0 4px #29e6ff)" }} />
        </svg>
        <span className="font-hud text-glow-soft text-[0.95rem] font-semibold tracking-[0.42em] text-[var(--j-ice)]">JARVIS</span>
      </div>

      <div className="hidden items-center gap-2 rounded-full border border-[var(--j-line)] bg-[rgba(2,14,20,0.5)] px-3.5 py-1.5 text-[0.78rem] text-[var(--j-muted)] backdrop-blur md:flex">
        <Dot tone={tone} pulse={voiceState !== "off" || online === null} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            {status}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="mr-2 hidden text-right lg:block">
          <div className="font-hud tabular text-[0.95rem] font-medium text-[var(--j-ice)]">{format(now, "HH:mm")}</div>
          <div className="text-[0.68rem] text-[var(--j-faint)]">{format(now, "EEE d MMM")}</div>
        </div>
        <IconButton onClick={onToggleWake} aria-pressed={wakeWord} title={wakeWord ? "Wake word on: say “Jarvis”" : "Turn on “Hey Jarvis”"}>
          <Radio className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton onClick={onToggleVoice} aria-pressed={voiceEnabled} title={voiceEnabled ? "Mute JARVIS" : "Unmute JARVIS"}>
          {voiceEnabled ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
        </IconButton>
        <IconButton onClick={onBriefing} title="Morning briefing" aria-label="Morning briefing">
          <Sun className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton onClick={onSettings} title="Settings" aria-label="Settings">
          <Settings2 className="h-[18px] w-[18px]" />
        </IconButton>
      </div>
    </header>
  )
}
