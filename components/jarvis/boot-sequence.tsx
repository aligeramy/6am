"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { greetingFor } from "@/lib/jarvis/dates"
import { PILLARS } from "@/lib/jarvis/pillars"
import type { Scores } from "@/lib/jarvis/scoring"
import { ArcReactor } from "./arc-reactor"
import { HudButton } from "./hud"

type Phase = "gate" | "boot" | "welcome"

const hex = () =>
  Array.from({ length: 6 }, () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0")).join(" ")

export function BootSequence({
  scores,
  life,
  address,
  name,
  animated,
  passcode,
  neuralOnline,
  voiceInput,
  onInit,
  onWelcome,
  onDone,
}: {
  scores: Scores
  life: number | null
  address: string
  name: string
  animated: boolean
  passcode?: string
  neuralOnline: boolean | null
  voiceInput: boolean
  onInit: () => void
  onWelcome: () => void
  onDone: () => void
}) {
  const [phase, setPhase] = useState<Phase>("gate")
  const [code, setCode] = useState("")
  const [denied, setDenied] = useState(false)
  const [shown, setShown] = useState(0)
  const [dump, setDump] = useState<string[]>(() => Array.from({ length: 18 }, hex))
  const finished = useRef(false)

  const lines = useMemo(
    () => [
      { text: "J.A.R.V.I.S. LIFE OS v6.0.0", status: "" },
      { text: "INITIALIZING CORE KERNEL", status: "OK" },
      { text: "CALIBRATING HOLOGRAPHIC DISPLAY", status: "OK" },
      ...PILLARS.map((p) => ({
        text: `SYNCING ${p.name.toUpperCase()} TELEMETRY`,
        status: scores[p.id] === null ? "STANDBY" : `${scores[p.id]}%`,
      })),
      { text: "VOICE RECOGNITION", status: voiceInput ? "ONLINE" : "UNAVAILABLE" },
      {
        text: "NEURAL LINK // CLAUDE",
        status: neuralOnline === null ? "PROBING" : neuralOnline ? "ONLINE" : "LOCAL MODE",
      },
      { text: "ALL SYSTEMS NOMINAL", status: "" },
    ],
    [scores, voiceInput, neuralOnline],
  )

  const finish = () => {
    if (finished.current) return
    finished.current = true
    onDone()
  }

  const toWelcome = () => {
    setPhase("welcome")
    onWelcome()
  }

  const engage = () => {
    if (passcode && code !== passcode) {
      setDenied(true)
      setTimeout(() => setDenied(false), 900)
      return
    }
    onInit()
    if (animated) setPhase("boot")
    else toWelcome()
  }

  // Reveal boot log lines.
  useEffect(() => {
    if (phase !== "boot") return
    if (shown >= lines.length) {
      const t = setTimeout(toWelcome, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 450 : 240 + Math.random() * 160)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, shown, lines.length])

  useEffect(() => {
    if (phase !== "boot") return
    const t = setInterval(() => setDump((d) => [...d.slice(1), hex()]), 70)
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    if (phase !== "welcome") return
    const t = setTimeout(finish, animated ? 2300 : 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Keyboard: any key engages at the gate; Esc skips the boot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "gate" && !passcode && (e.key === "Enter" || e.key === " ")) engage()
      if (phase === "gate" && passcode && e.key === "Enter") engage()
      if (phase !== "gate" && e.key === "Escape") finish()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const progress = Math.round((shown / lines.length) * 100)

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden px-4"
      exit={{ opacity: 0, scale: 1.08, filter: "blur(6px)" }}
      transition={{ duration: 0.7 }}
    >
      {/* Boot log */}
      {phase !== "gate" && (
        <div className="font-mono-hud absolute left-4 top-1/2 hidden w-[340px] -translate-y-1/2 text-[0.7rem] leading-6 md:block lg:left-12">
          {lines.slice(0, shown).map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
              <span className="text-[var(--j-faint)]">{String(i).padStart(2, "0")}</span>
              <span className="flex-1 truncate text-[var(--j-muted)]">{l.text}</span>
              {l.status && (
                <span
                  style={{
                    color: l.status === "UNAVAILABLE" ? "var(--j-amber)" : l.status === "STANDBY" || l.status === "LOCAL MODE" ? "var(--j-muted)" : "var(--j-cyan)",
                  }}
                >
                  [{l.status}]
                </span>
              )}
            </motion.div>
          ))}
          {phase === "boot" && <span className="j-caret" />}
        </div>
      )}

      {phase === "boot" && (
        <div className="font-mono-hud absolute right-4 top-1/2 hidden -translate-y-1/2 text-right text-[0.62rem] leading-5 text-[var(--j-faint)] lg:right-12 lg:block">
          {dump.map((d, i) => (
            <div key={i} style={{ opacity: 0.25 + (i / dump.length) * 0.75 }}>
              0x{(4096 + i * 16).toString(16).toUpperCase()} {d}
            </div>
          ))}
        </div>
      )}

      <div className="relative flex w-full max-w-[420px] flex-col items-center">
        <div className="w-[min(78vw,360px)]">
          <ArcReactor scores={phase === "gate" ? emptyScores : scores} life={phase === "gate" ? null : life} powered={phase !== "gate"} />
        </div>

        <AnimatePresence mode="wait">
          {phase === "gate" && (
            <motion.div key="gate" exit={{ opacity: 0 }} className="mt-6 flex w-full flex-col items-center gap-4 text-center">
              <div className="font-hud text-glow text-xl font-bold tracking-[0.45em] text-[var(--j-ice)] sm:text-2xl">J.A.R.V.I.S.</div>
              <div className="font-mono-hud text-[0.65rem] uppercase tracking-[0.3em] text-[var(--j-muted)]">Just A Rather Very Intelligent System</div>
              {passcode ? (
                <form
                  className="flex w-full max-w-[280px] flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    engage()
                  }}
                >
                  <input
                    autoFocus
                    type="password"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ACCESS CODE"
                    className="hud-input text-center tracking-[0.5em]"
                    style={denied ? { borderColor: "var(--j-red)", boxShadow: "0 0 14px rgba(255,77,97,0.4)" } : undefined}
                    aria-label="Access code"
                  />
                  <HudButton variant="solid" type="submit">
                    Authenticate
                  </HudButton>
                  {denied && <div className="font-hud text-[0.6rem] tracking-[0.3em] text-[var(--j-red)]">ACCESS DENIED</div>}
                </form>
              ) : (
                <button type="button" onClick={engage} className="group mt-2 flex flex-col items-center gap-2">
                  <span className="hud-btn px-6 py-3 text-[0.7rem]" data-variant="solid">
                    Initialize
                  </span>
                  <span className="font-mono-hud j-pulse text-[0.6rem] uppercase tracking-[0.3em] text-[var(--j-faint)]">
                    click or press enter
                  </span>
                </button>
              )}
            </motion.div>
          )}

          {phase === "boot" && (
            <motion.div key="boot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 w-full max-w-[320px]">
              <div className="mb-1 flex justify-between">
                <span className="hud-label">Booting systems</span>
                <span className="font-mono-hud text-[0.7rem] text-[var(--j-cyan)]">{progress}%</span>
              </div>
              <div className="h-[3px] w-full bg-[rgba(41,230,255,0.1)]">
                <div className="h-full bg-[var(--j-cyan)] shadow-[0_0_10px_var(--j-cyan)] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <div className="font-mono-hud mt-3 truncate text-center text-[0.65rem] text-[var(--j-muted)] md:hidden">
                {lines[Math.max(0, shown - 1)]?.text}
              </div>
            </motion.div>
          )}

          {phase === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.32em" }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="mt-6 text-center"
            >
              <div className="font-hud j-glitch text-lg font-bold text-white sm:text-2xl">
                {welcomeLine(address, name).toUpperCase()}
              </div>
              <div className="font-mono-hud mt-2 text-[0.65rem] tracking-[0.35em] text-[var(--j-cyan)]">ALL SYSTEMS ONLINE</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase === "boot" && (
        <div className="absolute bottom-6 right-6">
          <HudButton variant="ghost" onClick={finish}>
            Skip ▸ <span className="text-[var(--j-faint)]">esc</span>
          </HudButton>
        </div>
      )}
    </motion.div>
  )
}

export const welcomeLine = (address: string, _name?: string) => {
  const h = new Date().getHours()
  return h >= 4 && h < 12 ? `${greetingFor()}, ${address}` : `Welcome back, ${address}`
}

const emptyScores: Scores = { health: null, wealth: null, career: null, mind: null, habits: null, missions: null, spirit: null }
