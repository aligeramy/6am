"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Check, Flame } from "lucide-react"
import { daysUntil, greetingFor, lastNDays, todayKey } from "@/lib/jarvis/dates"
import { PILLAR_BY_ID } from "@/lib/jarvis/pillars"
import { habitStreak, type Scores } from "@/lib/jarvis/scoring"
import { useJarvis } from "@/lib/jarvis/store"
import type { PillarId } from "@/lib/jarvis/types"
import { cn } from "@/lib/utils"
import { AnimatedNumber, Bar, Empty, HudPanel, InlineAdd, Ring, scoreTone } from "./hud"

const open = (p: PillarId) => useJarvis.getState().setUI({ activePillar: p })

export function Greeting({ scores, life, weakest }: { scores: Scores; life: number | null; weakest: PillarId | null }) {
  const address = useJarvis((s) => s.settings.address)
  const ranked = (Object.entries(scores) as [PillarId, number | null][]).filter(([, v]) => v !== null).sort((a, b) => (b[1] as number) - (a[1] as number))
  const best = ranked[0]?.[0]
  return (
    <div className="px-1 pt-1">
      <div className="text-[0.95rem] font-light text-[var(--j-muted)]">{greetingFor()},</div>
      <h1 className="font-hud text-glow mt-0.5 truncate text-[1.7rem] font-semibold leading-tight tracking-[0.06em] text-white">{address}.</h1>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--j-muted)]">
        {life === null ? (
          "Tell me how your day is going and I'll start building your life index."
        ) : (
          <>
            Life index at{" "}
            <span className="font-semibold text-[var(--j-ice)]">
              <AnimatedNumber value={life} />
            </span>
            .{best && ` ${PILLAR_BY_ID[best].name} is leading`}
            {weakest && weakest !== best && `, while ${PILLAR_BY_ID[weakest].name.toLowerCase()} could use some attention`}.
          </>
        )}
      </p>
      {weakest && life !== null && (
        <button
          type="button"
          onClick={() => open(weakest)}
          className="group mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition-all duration-300 hover:shadow-[0_0_20px_-6px_currentColor]"
          style={{ color: scoreTone(scores[weakest]), borderColor: "color-mix(in srgb, currentColor 35%, transparent)" }}
        >
          Focus on {PILLAR_BY_ID[weakest].name}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  )
}

export function HabitsCard({ score }: { score: number | null }) {
  const habits = useJarvis((s) => s.habits)
  const toggle = useJarvis((s) => s.toggleHabit)
  const addHabit = useJarvis((s) => s.addHabit)
  const today = todayKey()
  const week = lastNDays(7)
  const done = habits.filter((h) => h.completions.includes(today)).length

  return (
    <HudPanel
      title="Today's protocols"
      right={
        <button type="button" onClick={() => open("habits")} className="flex items-center gap-2 text-[0.8rem] text-[var(--j-muted)] transition-colors hover:text-white" aria-label="Open habits">
          <span className="tabular font-semibold text-[var(--j-ice)]">
            {done}/{habits.length}
          </span>
          <Ring value={score} size={28} />
        </button>
      }
    >
      <div className="px-2 pb-3 pt-2">
        {habits.length === 0 ? (
          <Empty>No habits yet. Add the first one below.</Empty>
        ) : (
          <ul className="space-y-0.5">
            {habits.map((h) => {
              const isDone = h.completions.includes(today)
              const streak = habitStreak(h)
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => toggle(h.id)}
                    aria-pressed={isDone}
                    className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-[rgba(41,230,255,0.05)]"
                  >
                    <span
                      className={cn(
                        "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                        isDone ? "border-transparent bg-[var(--j-cyan)] shadow-[0_0_14px_-2px_var(--j-cyan)]" : "border-[var(--j-line-strong)] group-hover:border-[var(--j-cyan)]",
                      )}
                    >
                      <AnimatePresence>
                        {isDone && (
                          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                            <Check className="h-3 w-3 text-[#00141b]" strokeWidth={3.5} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[0.92rem] transition-colors duration-300", isDone ? "text-[var(--j-faint)]" : "text-[var(--j-text)]")}>{h.name}</span>
                    <span className="hidden gap-[3px] sm:flex" aria-hidden>
                      {week.map((d) => (
                        <span key={d} className="h-1.5 w-1.5 rounded-full transition-colors duration-300" style={{ background: h.completions.includes(d) ? "var(--j-cyan)" : "rgba(41,230,255,0.13)" }} />
                      ))}
                    </span>
                    <span className="tabular flex w-8 items-center justify-end gap-0.5 text-[0.75rem]" style={{ color: streak >= 3 ? "var(--j-amber)" : "var(--j-faint)" }} title={`${streak}-day streak`}>
                      <Flame className="h-3 w-3" />
                      {streak}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="px-2 pt-2">
          <InlineAdd label="Add habit" placeholder="New habit, e.g. Cold shower" onAdd={addHabit} />
        </div>
      </div>
    </HudPanel>
  )
}

export function MissionsCard({ score }: { score: number | null }) {
  const missions = useJarvis((s) => s.missions)
  const active = missions
    .filter((m) => m.status === "active")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
  return (
    <HudPanel
      title="Missions"
      right={
        <button type="button" onClick={() => open("missions")} className="flex items-center gap-2 text-[0.8rem] text-[var(--j-muted)] transition-colors hover:text-white">
          {active.length > 3 ? `+${active.length - 3} more` : "All"}
          <Ring value={score} size={28} />
        </button>
      }
    >
      <div className="space-y-1 px-2 pb-3 pt-2">
        {active.length === 0 ? (
          <button type="button" onClick={() => open("missions")} className="w-full">
            <Empty>No active missions. Tap to set your first objective.</Empty>
          </button>
        ) : (
          active.slice(0, 3).map((m) => {
            const d = m.due ? daysUntil(m.due) : null
            const next = m.milestones.find((x) => !x.done)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => open("missions")}
                className="w-full rounded-xl px-2 py-2.5 text-left transition-colors duration-200 hover:bg-[rgba(41,230,255,0.05)]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[0.92rem] font-medium text-[var(--j-text)]">{m.title}</span>
                  <span className="tabular shrink-0 text-[0.78rem] font-semibold text-[var(--j-ice)]">{m.progress}%</span>
                </div>
                <Bar value={m.progress / 100} warn={false} className="mt-1.5" />
                <div className="mt-1.5 flex justify-between gap-2 text-[0.72rem] text-[var(--j-faint)]">
                  <span className="truncate">{next ? `Next: ${next.title}` : `${PILLAR_BY_ID[m.pillar]?.name} · ${m.horizon}`}</span>
                  {d !== null && (
                    <span className="shrink-0" style={{ color: d < 0 ? "var(--j-red)" : d <= 7 ? "var(--j-amber)" : undefined }}>
                      {d < 0 ? `${-d}d overdue` : d === 0 ? "due today" : `${d}d left`}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </HudPanel>
  )
}
