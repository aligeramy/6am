"use client"

import { motion } from "framer-motion"
import { ArrowRight, Flame, Lock, Moon, Pause, Play, Sun, Timer, Trophy } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { sendCommand } from "@/lib/jarvis/brain"
import { todayKey } from "@/lib/jarvis/dates"
import { PILLAR_BY_ID } from "@/lib/jarvis/pillars"
import { achievements, computeXP, insights, levelInfo, lifeHistory, ritualStreak } from "@/lib/jarvis/progress"
import { formatMinutes } from "@/lib/jarvis/scoring"
import { exportData, useJarvis } from "@/lib/jarvis/store"
import { cn } from "@/lib/utils"
import { Empty, HudButton, HudPanel, Sparkline } from "./hud"
import { startFocus } from "./rituals"

/** Re-render whenever data that feeds progress changes. */
function useProgressData() {
  useJarvis((s) => s.logs)
  useJarvis((s) => s.days)
  useJarvis((s) => s.history)
  useJarvis((s) => s.habits)
  useJarvis((s) => s.ideas)
  useJarvis((s) => s.missions)
  useJarvis((s) => s.journal)
  useJarvis((s) => s.transactions)
  return exportData()
}

export function useFocusRemaining() {
  const focus = useJarvis((s) => s.focus)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!focus) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [focus])
  if (!focus) return null
  const total = focus.durationMin * 60
  const remaining = Math.max(0, Math.round(total - (now - focus.startedAt) / 1000))
  return { remaining, total, label: focus.label }
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

function Tile({ label, children, onClick, className }: { label: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={cn("glass flex min-w-0 flex-col justify-between gap-1.5 px-3 py-2.5", onClick && "glass-hover", className)}
    >
      <div className="hud-label relative z-[1] truncate">{label}</div>
      <div className="relative z-[1] min-w-0">{children}</div>
    </div>
  )
}

function FocusTile() {
  const f = useFocusRemaining()
  const logs = useJarvis((s) => s.logs)
  const [picking, setPicking] = useState(false)
  const today = todayKey()
  const minutes = logs.filter((l) => l.metric === "deepwork" && l.date === today && l.note?.startsWith("Focus")).reduce((a, l) => a + l.value, 0)
  const nextPriority = useJarvis((s) => s.days[today]?.top3.find((p) => !p.done)?.text)

  if (f)
    return (
      <Tile label="Focus · live">
        <div className="flex items-center justify-between gap-2">
          <span className="font-hud tabular text-glow text-[1.15rem] font-semibold text-white">{mmss(f.remaining)}</span>
          <button
            type="button"
            onClick={() => {
              const s = useJarvis.getState()
              const done = Math.round((Date.now() - (s.focus?.startedAt ?? Date.now())) / 60000)
              if (done >= 5) s.addLog({ metric: "deepwork", value: done, note: `Focus: ${s.focus?.label}` })
              s.setFocus(null)
            }}
            className="icon-btn h-7 w-7"
            title="End session and log the time"
            aria-label="End focus session"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="truncate text-[0.7rem] text-[var(--j-muted)]">{f.label}</div>
      </Tile>
    )
  return (
    <Tile label="Focus · today">
      {picking ? (
        <div className="flex items-center gap-1">
          {[25, 50, 90].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                startFocus(nextPriority || "Deep work", m)
                setPicking(false)
              }}
              className="font-hud rounded-md border border-[var(--j-line-strong)] px-1.5 py-1 text-[0.7rem] text-[var(--j-ice)] hover:bg-[rgba(var(--j-cyan-rgb),0.15)]"
            >
              {m}m
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="font-hud tabular text-[1.15rem] font-semibold text-white">{formatMinutes(minutes)}</span>
          <button type="button" onClick={() => setPicking(true)} className="icon-btn h-7 w-7 text-[var(--j-cyan)]" title="Start a focus session" aria-label="Start a focus session">
            <Play className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="truncate text-[0.7rem] text-[var(--j-muted)]">{picking ? "Pick a length" : nextPriority ? `Next: ${nextPriority}` : "Timer runs in the reactor"}</div>
    </Tile>
  )
}

/** Four HUD readouts under the reactor: trend, suit level, ritual streak, focus. */
export function StatusStrip() {
  const d = useProgressData()
  const hist = lifeHistory(d, 30)
  const vals = hist.map((h) => h.value).filter((v): v is number => v !== null)
  const now = vals[vals.length - 1] ?? null
  const weekAgo = hist[hist.length - 8]?.value ?? null
  const delta = now !== null && weekAgo !== null ? now - weekAgo : null
  const lvl = levelInfo(computeXP(d))
  const streak = ritualStreak(d)
  const day = d.days[todayKey()]

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
      <Tile label="Life index · 30d">
        <div className="flex items-end justify-between gap-2">
          <span className="font-hud tabular text-[1.15rem] font-semibold text-white">{now ?? "–"}</span>
          {delta !== null && (
            <span className="font-mono-hud text-[0.72rem]" style={{ color: delta >= 0 ? "var(--j-cyan)" : "var(--j-amber)" }}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} wk
            </span>
          )}
        </div>
        <Sparkline data={hist} height={20} fit format={(v) => String(Math.round(v))} />
      </Tile>
      <Tile label="Suit level" onClick={() => useJarvis.getState().setUI({ activePillar: "achievements" })}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-hud text-glow-soft truncate text-[1.05rem] font-semibold text-white">{lvl.name}</span>
          <Trophy className="h-3.5 w-3.5 shrink-0 text-[var(--j-amber)]" />
        </div>
        <div className="h-[4px] w-full overflow-hidden bg-[rgba(var(--j-cyan-rgb),0.1)]">
          <motion.div className="h-full bg-[var(--j-cyan)] shadow-[0_0_8px_var(--j-cyan)]" initial={{ width: 0 }} animate={{ width: `${lvl.pct * 100}%` }} transition={{ duration: 1 }} />
        </div>
        <div className="font-mono-hud text-[0.66rem] text-[var(--j-muted)]">
          {lvl.into}/{lvl.step} XP
        </div>
      </Tile>
      <Tile label="Ritual streak">
        <div className="flex items-center gap-2">
          <span className="font-hud tabular text-[1.15rem] font-semibold text-white">{streak}</span>
          <span className="text-[0.75rem] text-[var(--j-muted)]">day{streak === 1 ? "" : "s"}</span>
          <Flame className={cn("ml-auto h-4 w-4", streak >= 3 ? "text-[var(--j-amber)]" : "text-[var(--j-faint)]")} />
        </div>
        <div className="flex items-center gap-2 text-[0.7rem]">
          <span className={cn("flex items-center gap-1", day?.plannedAt ? "text-[var(--j-cyan)]" : "text-[var(--j-faint)]")}>
            <Sun className="h-3 w-3" /> plan
          </span>
          <span className={cn("flex items-center gap-1", day?.reviewedAt ? "text-[var(--j-cyan)]" : "text-[var(--j-faint)]")}>
            <Moon className="h-3 w-3" /> review
          </span>
        </div>
      </Tile>
      <FocusTile />
    </div>
  )
}

/* ───────── Insights ───────── */

export function InsightsCard({ online }: { online: boolean }) {
  const d = useProgressData()
  const list = useMemo(() => insights(d).slice(0, 3), [d])
  return (
    <HudPanel title="Insights" index="09" section="insights">
      <div className="space-y-2.5 px-4 pb-4 pt-3">
        {list.length === 0 ? (
          <Empty>Insights appear after about a week of check-ins and logs.</Empty>
        ) : (
          list.map((i) => (
            <div key={i.id} className="group">
              <p className="text-[0.86rem] leading-relaxed text-[var(--j-text)]">
                {i.pillar && <span className="hud-label mr-1.5 text-[var(--j-cyan)]">{PILLAR_BY_ID[i.pillar]?.short ?? i.pillar}</span>}
                {i.text}
              </p>
              <div className="mt-1 flex items-start gap-1.5 text-[0.8rem] text-[var(--j-ice)]">
                <ArrowRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--j-cyan)]" />
                <span className="flex-1">{i.fix}</span>
              </div>
              {online && (
                <button
                  type="button"
                  onClick={() => void sendCommand(`Help me act on this: ${i.text} ${i.fix}`, true)}
                  className="mt-1 text-[0.72rem] text-[var(--j-faint)] opacity-0 transition-opacity hover:text-[var(--j-muted)] group-hover:opacity-100"
                >
                  Ask Jared about this →
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </HudPanel>
  )
}

/* ───────── Achievements (detail sheet) ───────── */

export function AchievementsBody() {
  const d = useProgressData()
  const lvl = levelInfo(computeXP(d))
  const list = achievements(d)
  const got = list.filter((a) => a.unlocked).length
  return (
    <div className="space-y-5">
      <div className="inset-panel p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="hud-label">Suit level</div>
            <div className="font-hud text-glow text-3xl font-bold text-white">{lvl.name}</div>
          </div>
          <div className="text-right">
            <div className="font-hud tabular text-lg text-[var(--j-ice)]">{lvl.xp} XP</div>
            <div className="text-[0.75rem] text-[var(--j-muted)]">{lvl.level >= 50 ? "Max level" : `${lvl.step - lvl.into} XP to Mark ${levelInfo(lvl.xp + lvl.step - lvl.into).name.split(" ")[1]}`}</div>
          </div>
        </div>
        <div className="mt-3 h-[6px] overflow-hidden bg-[rgba(var(--j-cyan-rgb),0.1)]">
          <motion.div className="h-full bg-[var(--j-cyan)] shadow-[0_0_10px_var(--j-cyan)]" initial={{ width: 0 }} animate={{ width: `${lvl.pct * 100}%` }} transition={{ duration: 1 }} />
        </div>
        <p className="mt-3 text-[0.78rem] leading-relaxed text-[var(--j-faint)]">
          XP comes from showing up: morning plan +20, evening review +30, finished priority +15, focus session +25, habit +10, any log +5, idea +5, completed mission +100.
        </p>
      </div>
      <div>
        <div className="hud-label mb-2">
          Achievements · {got}/{list.length}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((a) => (
            <div
              key={a.id}
              className={cn("inset-panel flex items-center gap-3 p-3 transition-colors", a.unlocked ? "border-[rgba(var(--j-cyan-rgb),0.3)]" : "opacity-55")}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  a.unlocked ? "bg-[rgba(var(--j-cyan-rgb),0.15)] text-[var(--j-amber)] shadow-[0_0_14px_-4px_var(--j-amber)]" : "bg-white/5 text-[var(--j-faint)]",
                )}
              >
                {a.unlocked ? <Trophy className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className={cn("text-[0.9rem] font-semibold", a.unlocked ? "text-white" : "text-[var(--j-muted)]")}>{a.name}</div>
                <div className="text-[0.75rem] text-[var(--j-faint)]">{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <HudButton onClick={() => useJarvis.getState().setUI({ activePillar: null, ritual: "plan" })}>
        <Timer className="h-3.5 w-3.5" /> Earn XP: plan today
      </HudButton>
    </div>
  )
}
