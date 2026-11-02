"use client"

import { AnimatePresence, LayoutGroup, motion, type Variants } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { checkLink, runBriefing, sendCommand, type LinkStatus } from "@/lib/jarvis/brain"
import { isPastTime, todayKey } from "@/lib/jarvis/dates"
import { lifeScore, pillarScores, weakestPillar } from "@/lib/jarvis/scoring"
import { useJarvis } from "@/lib/jarvis/store"
import type { PillarId } from "@/lib/jarvis/types"
import { voice, type VoiceState } from "@/lib/jarvis/voice"
import { ArcReactor } from "./arc-reactor"
import { HudBackground } from "./background"
import { BootSequence, welcomeLine } from "./boot-sequence"
import { BriefingOverlay } from "./briefing-overlay"
import { CommandBar, Conversation, MobileDock } from "./command-bar"
import { PillarCard } from "./pillar-cards"
import { PillarDetail } from "./pillar-detail"
import { QuickLogModal, Toast } from "./quick-log"
import { SettingsPanel } from "./settings-panel"
import { Greeting, HabitsCard, MissionsCard } from "./today"
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

const EASE = [0.22, 1, 0.36, 1] as const
const column: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

const RIGHT_PILLARS: PillarId[] = ["health", "wealth", "career", "mind", "spirit"]

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
    const first = setTimeout(check, 1400)
    const t = setInterval(check, 30000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [phase, link])

  // "/" focuses the command bar from anywhere.
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
  const openPillar = (p: PillarId) => useJarvis.getState().setUI({ activePillar: p })
  const voiceProps = { online: !!online, state: v.state, level: v.level, interim: v.interim, error: v.error }

  return (
    <div className="jarvis-root">
      <HudBackground />

      <LayoutGroup>
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
          <div className="relative z-10 flex min-h-dvh flex-col lg:h-dvh">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <TopBar
                online={online}
                voiceState={v.state}
                wakeWord={settings.wakeWordEnabled}
                voiceEnabled={settings.voiceEnabled}
                onToggleVoice={() => {
                  if (settings.voiceEnabled) voice.stopSpeaking()
                  updateSettings({ voiceEnabled: !settings.voiceEnabled })
                }}
                onToggleWake={() => updateSettings({ wakeWordEnabled: !settings.wakeWordEnabled })}
                onBriefing={() => void runBriefing(!!online)}
                onSettings={() => useJarvis.getState().setUI({ settingsOpen: true })}
              />
            </motion.div>

            <main className="grid flex-1 grid-cols-1 gap-5 px-4 pb-52 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(300px,360px)] lg:gap-6 lg:pb-6">
              {/* Today: greeting, habits, missions */}
              <motion.aside variants={column} initial="hidden" animate="show" className="order-2 space-y-4 lg:order-none lg:min-h-0 lg:overflow-y-auto no-scrollbar lg:pb-2">
                <motion.div variants={rise} className="hidden lg:block">
                  <Greeting scores={scores} life={life} weakest={weakest} />
                </motion.div>
                <motion.div variants={rise}>
                  <HabitsCard score={scores.habits} />
                </motion.div>
                <motion.div variants={rise}>
                  <MissionsCard score={scores.missions} />
                </motion.div>
              </motion.aside>

              {/* Core: reactor and conversation */}
              <section className="order-1 flex flex-col items-center lg:order-none lg:min-h-0">
                <motion.div layoutId="reactor" transition={{ duration: 0.9, ease: EASE }} className="w-[min(78vw,340px)] shrink-0 lg:w-[min(100%,50vh,470px)]">
                  <ArcReactor scores={scores} life={life} voiceState={v.state} level={v.level} onSelect={openPillar} />
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="mt-4 w-full lg:hidden">
                  <Greeting scores={scores} life={life} weakest={weakest} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
                  className="hidden w-full max-w-[620px] min-h-0 flex-1 flex-col lg:flex"
                >
                  <Conversation online={!!online} limit={30} className="min-h-0 flex-1" />
                  <div className="pt-2">
                    <CommandBar {...voiceProps} inputRef={inputRef} />
                  </div>
                </motion.div>
              </section>

              {/* Pillars */}
              <motion.aside variants={column} initial="hidden" animate="show" className="order-3 space-y-3 lg:min-h-0 lg:overflow-y-auto no-scrollbar lg:pb-2">
                {RIGHT_PILLARS.map((p) => (
                  <motion.div key={p} variants={rise}>
                    <PillarCard pillar={p} score={scores[p]} />
                  </motion.div>
                ))}
              </motion.aside>
            </main>

            <MobileDock {...voiceProps} />
          </div>
        )}
      </LayoutGroup>

      <PillarDetail scores={scores} />
      <QuickLogModal />
      <SettingsPanel online={online} />
      <BriefingOverlay />
      <Toast />
    </div>
  )
}
