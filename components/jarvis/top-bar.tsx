"use client"

import { format } from "date-fns"
import { Settings2, Sun, Volume2, VolumeX, Radio } from "lucide-react"
import { useEffect, useState } from "react"
import type { VoiceState } from "@/lib/jarvis/voice"
import { Dot, HudButton } from "./hud"

const VOICE_LABEL: Record<VoiceState, string> = {
  off: "STANDBY",
  wake: "ARMED",
  command: "LISTENING",
  thinking: "PROCESSING",
  speaking: "SPEAKING",
}

export function TopBar({
  online,
  voiceState,
  wakeWord,
  voiceEnabled,
  address,
  onToggleVoice,
  onToggleWake,
  onBriefing,
  onSettings,
}: {
  online: boolean | null
  voiceState: VoiceState
  wakeWord: boolean
  voiceEnabled: boolean
  address: string
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

  return (
    <header className="relative z-20 flex items-center justify-between gap-3 border-b border-[var(--j-line)] bg-[rgba(1,10,16,0.6)] px-3 py-2 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <svg viewBox="-12 -12 24 24" className="h-7 w-7 shrink-0" aria-hidden>
          <circle r="10" fill="none" stroke="var(--j-cyan)" strokeWidth="1" opacity="0.6" />
          <g className="j-spin" style={{ ["--dur" as string]: "8s" }}>
            <circle r="7" fill="none" stroke="var(--j-cyan)" strokeWidth="1.6" strokeDasharray="8 3" />
          </g>
          <circle r="3.2" fill="var(--j-ice)" style={{ filter: "drop-shadow(0 0 4px #29e6ff)" }} />
        </svg>
        <div className="min-w-0">
          <div className="font-hud text-glow text-[0.8rem] font-bold tracking-[0.35em] text-[var(--j-ice)] sm:text-sm">J.A.R.V.I.S.</div>
          <div className="font-mono-hud hidden text-[0.55rem] uppercase tracking-[0.3em] text-[var(--j-faint)] sm:block">
            Life operating system · {address}
          </div>
        </div>
      </div>

      <div className="font-mono-hud hidden items-center gap-4 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--j-muted)] lg:flex">
        <span className="flex items-center gap-1.5">
          <Dot tone={online ? "var(--j-green)" : online === null ? "var(--j-faint)" : "var(--j-amber)"} pulse={online === null} />
          Neural link: <span className="text-[var(--j-ice)]">{online === null ? "probing" : online ? "Claude online" : "local mode"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Dot tone={voiceState === "off" ? "var(--j-faint)" : "var(--j-cyan)"} pulse={voiceState !== "off"} />
          Voice: <span className="text-[var(--j-ice)]">{VOICE_LABEL[voiceState]}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="mr-1 hidden text-right sm:block">
          <div className="font-hud text-sm font-semibold tabular-nums text-[var(--j-ice)] text-glow-soft">{format(now, "HH:mm:ss")}</div>
          <div className="font-mono-hud text-[0.55rem] uppercase tracking-[0.25em] text-[var(--j-faint)]">{format(now, "EEE dd MMM yyyy")}</div>
        </div>
        <HudButton
          variant="ghost"
          onClick={onToggleWake}
          aria-pressed={wakeWord}
          title={wakeWord ? "Wake word armed: say “Jarvis”" : "Arm “Hey Jarvis” wake word"}
          className={wakeWord ? "text-[var(--j-cyan)]" : "text-[var(--j-faint)]"}
        >
          <Radio className="h-4 w-4" />
        </HudButton>
        <HudButton variant="ghost" onClick={onToggleVoice} aria-pressed={voiceEnabled} title={voiceEnabled ? "Mute JARVIS" : "Unmute JARVIS"}>
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-[var(--j-faint)]" />}
        </HudButton>
        <HudButton onClick={onBriefing} title="Morning briefing">
          <Sun className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Briefing</span>
        </HudButton>
        <HudButton variant="ghost" onClick={onSettings} title="Settings" aria-label="Settings">
          <Settings2 className="h-4 w-4" />
        </HudButton>
      </div>
    </header>
  )
}
