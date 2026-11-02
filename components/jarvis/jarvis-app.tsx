"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { checkLink, runBriefing, sendCommand, type LinkStatus } from "@/lib/jarvis/brain"
import { isPastTime, todayKey } from "@/lib/jarvis/dates"
import { PILLAR_BY_ID } from "@/lib/jarvis/pillars"
import { lifeScore, pillarScores, weakestPillar } from "@/lib/jarvis/scoring"
import { useJarvis } from "@/lib/jarvis/store"
import { voice, type VoiceState } from "@/lib/jarvis/voice"
import { ArcReactor } from "./arc-reactor"
import { HudBackground, Scanlines } from "./background"
import { BootSequence, welcomeLine } from "./boot-sequence"
import { BriefingOverlay } from "./briefing-overlay"
import { ConsoleDock, ConsolePanel } from "./console"
import { scoreTone } from "./hud"
import { PillarDetail } from "./pillar-detail"
import { CareerPanel, HabitsPanel, HealthPanel, MindPanel, MissionsPanel, SpiritPanel, WealthPanel } from "./pillar-panels"
import { QuickLogModal, Toast } from "./quick-log"
import { SettingsPanel } from "./settings-panel"
import { TopBar } from "./top-bar"

function useVoice() {
  const [snap, setSnap] = useState<{ state: VoiceState; interim: string; level: number; error: string | null }>({
    state: "off",
    interim: "",
    level: 0,
    error: null,
  })
  useEffect(() => voice.subscribe(setSnap), [])
  return snap
}

function useScores() {
  const logs = useJarvis((s) => s.logs)
  const transactions = useJarvis((s) => s.transactions)
  const habits = useJarvis((s) => s.habits)
  const missions = useJarvis((s) => s.missions)
  const projects = useJarvis((s) => s.projects)
  const journal = useJarvis((s) => s.journal)
  const settings = useJarvis((s) => s.settings)
  return useMemo(() => {
    const scores = pillarScores({ logs, transactions, habits, missions, projects, journal, settings, chat: [] })
    return { scores, life: lifeScore(scores), weakest: weakestPillar(scores) }
  }, [logs, transactions, habits, missions, projects, journal, settings])
}

/** Staggered fly-in for HUD panels. */
function Fly({ children, from = 0, delay = 0, className }: { children: ReactNode; from?: number; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: from, y: from === 0 ? 24 : 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function JarvisApp() {
  const [phase, setPhase] = useState<"boot" | "hud">("boot")
  const [link, setLink] = useState<LinkStatus | null>(null)
  const settings = useJarvis((s) => s.settings)
  const updateSettings = useJarvis((s) => s.updateSettings)
  const { scores, life, weakest } = useScores()
  const v = useVoice()
  const hasKey = !!settings.apiKey?.trim()
  const online = hasKey ? true : link ? link.online && link.authorized : null
  const onlineRef = useRef(false)
  onlineRef.current = !!online
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void checkLink().then(setLink)
  }, [settings.passcode])

  // Spoken commands (mic button or wake word) go through the same pipeline as typed ones.
  useEffect(() => {
    voice.setCommandHandler((text) => void sendCommand(text, onlineRef.current))
  }, [])

  useEffect(() => {
    if (phase !== "hud") return
    voice.setWakeWord(settings.wakeWordEnabled)
  }, [phase, settings.wakeWordEnabled])

  // Morning briefing: at wake time, or the first time the HUD opens after it.
  useEffect(() => {
    if (phase !== "hud" || link === null) return
    const check = () => {
      const st = useJarvis.getState().settings
      if (st.briefingEnabled && st.lastBriefingDate !== todayKey() && isPastTime(st.wakeTime)) {
        void runBriefing(onlineRef.current)
      }
    }
    const first = setTimeout(check, 1200)
    const t = setInterval(check, 30000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [phase, link])

  // "/" focuses the console from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const speakOpts = { voiceURI: settings.voiceURI, rate: settings.voiceRate, pitch: settings.voicePitch, enabled: settings.voiceEnabled }
  const openPillar = (p: keyof typeof PILLAR_BY_ID) => useJarvis.getState().setUI({ activePillar: p })

  return (
    <div className="jarvis-root">
      <HudBackground />

      <AnimatePresence>
        {phase === "boot" && (
          <BootSequence
            key="boot"
            scores={scores}
            life={life}
            address={settings.address}
            name={settings.name}
            animated={settings.bootSequence}
            passcode={settings.passcode}
            neuralOnline={online}
            voiceInput={voice.recognitionSupported}
            onInit={() => {
              // A user gesture: unlocks speech synthesis and loads voices.
              if (voice.synthesisSupported) window.speechSynthesis.getVoices()
            }}
            onWelcome={() => void voice.speak(`${welcomeLine(settings.address)}. All systems online.`, speakOpts)}
            onDone={() => setPhase("hud")}
          />
        )}
      </AnimatePresence>

      {phase === "hud" && (
        <div className="relative z-10 flex min-h-dvh flex-col">
          <Fly delay={0}>
            <TopBar
              online={online}
              voiceState={v.state}
              wakeWord={settings.wakeWordEnabled}
              voiceEnabled={settings.voiceEnabled}
              address={settings.address}
              onToggleVoice={() => {
                if (settings.voiceEnabled) voice.stopSpeaking()
                updateSettings({ voiceEnabled: !settings.voiceEnabled })
              }}
              onToggleWake={() => updateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
              onBriefing={() => void runBriefing(!!online)}
              onSettings={() => useJarvis.getState().setUI({ settingsOpen: true })}
            />
          </Fly>

          <main className="grid flex-1 grid-cols-1 gap-3 p-3 pb-36 sm:p-4 sm:pb-36 lg:grid-cols-[minmax(290px,1fr)_minmax(440px,1.3fr)_minmax(290px,1fr)] lg:pb-4 xl:gap-4">
            {/* Left column */}
            <div className="contents lg:flex lg:flex-col lg:gap-3 xl:gap-4">
              <Fly from={-40} delay={0.15} className="order-4 lg:order-none">
                <HealthPanel score={scores.health} />
              </Fly>
              <Fly from={-40} delay={0.25} className="order-5 lg:order-none">
                <WealthPanel score={scores.wealth} />
              </Fly>
              <Fly from={-40} delay={0.35} className="order-6 lg:order-none">
                <CareerPanel score={scores.career} />
              </Fly>
            </div>

            {/* Center column */}
            <div className="contents lg:flex lg:flex-col lg:gap-3 xl:gap-4">
              <Fly delay={0.05} className="order-1 lg:order-none">
                <section className="relative flex flex-col items-center">
                  <div className="w-[min(86vw,400px)] lg:w-[min(100%,38vh,440px)]">
                    <ArcReactor scores={scores} life={life} voiceState={v.state} level={v.level} onSelect={openPillar} />
                  </div>
                  <div className="mt-1 flex w-full max-w-[520px] flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
                    <span className="font-mono-hud text-[0.65rem] uppercase tracking-[0.25em] text-[var(--j-muted)]">
                      {welcomeLine(settings.address)}
                    </span>
                    {weakest && life !== null && (
                      <button
                        type="button"
                        onClick={() => openPillar(weakest)}
                        className="font-mono-hud text-[0.65rem] uppercase tracking-[0.25em] transition hover:text-white"
                        style={{ color: scoreTone(scores[weakest]) }}
                      >
                        ▲ Focus: {PILLAR_BY_ID[weakest].name} {scores[weakest]}
                      </button>
                    )}
                  </div>
                </section>
              </Fly>
              <Fly delay={0.3} className="order-2 lg:order-none">
                <MissionsPanel score={scores.missions} />
              </Fly>
              <Fly delay={0.45} className="hidden min-h-[260px] lg:flex lg:grow lg:basis-0 lg:flex-col">
                <ConsolePanel
                  online={!!online}
                  state={v.state}
                  level={v.level}
                  interim={v.interim}
                  error={v.error}
                  inputRef={inputRef}
                  className="min-h-0 flex-1"
                />
              </Fly>
            </div>

            {/* Right column */}
            <div className="contents lg:flex lg:flex-col lg:gap-3 xl:gap-4">
              <Fly from={40} delay={0.2} className="order-7 lg:order-none">
                <MindPanel score={scores.mind} />
              </Fly>
              <Fly from={40} delay={0.3} className="order-3 lg:order-none">
                <HabitsPanel score={scores.habits} />
              </Fly>
              <Fly from={40} delay={0.4} className="order-8 lg:order-none">
                <SpiritPanel score={scores.spirit} />
              </Fly>
            </div>
          </main>

          <ConsoleDock online={!!online} state={v.state} level={v.level} interim={v.interim} error={v.error} />
        </div>
      )}

      <PillarDetail scores={scores} />
      <QuickLogModal />
      <SettingsPanel online={online} />
      <BriefingOverlay />
      <Toast />
      <Scanlines />
    </div>
  )
}
