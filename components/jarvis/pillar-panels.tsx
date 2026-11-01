"use client"

import { Check, Flame, Maximize2, Plus } from "lucide-react"
import { useState, type ReactNode } from "react"
import { daysUntil, lastNDays, monthElapsedFraction, todayKey } from "@/lib/jarvis/dates"
import { PILLAR_BY_ID } from "@/lib/jarvis/pillars"
import {
  formatMinutes,
  formatMoney,
  habitStreak,
  latest,
  monthFinance,
  series,
  spendBurn,
  weekAvg,
  weekDaysWith,
  weekTotal,
} from "@/lib/jarvis/scoring"
import { useJarvis } from "@/lib/jarvis/store"
import type { PillarId } from "@/lib/jarvis/types"
import { cn } from "@/lib/utils"
import { Empty, HudPanel, Ring, SegBar, Sparkline, Stat } from "./hud"
import { useQuickLog } from "./quick-log"

/* ───────────── shared bits ───────────── */

function PillarShell({
  pillar,
  score,
  children,
  className,
  actions,
}: {
  pillar: PillarId
  score: number | null
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  const def = PILLAR_BY_ID[pillar]
  const open = () => useJarvis.getState().setUI({ activePillar: pillar })
  return (
    <HudPanel
      title={def.name}
      index={def.index}
      onTitleClick={open}
      className={className}
      right={
        <div className="flex items-center gap-1.5">
          <Ring value={score} size={30} />
          <button type="button" onClick={open} className="p-1 text-[var(--j-faint)] transition hover:text-[var(--j-cyan)]" aria-label={`Open ${def.name}`}>
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-3 p-3">{children}</div>
      {actions && <div className="flex flex-wrap gap-1.5 border-t border-[var(--j-line)] px-3 py-2">{actions}</div>}
    </HudPanel>
  )
}

export function LogChip({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="font-mono-hud flex items-center gap-1 border border-[var(--j-line)] bg-[rgba(41,230,255,0.04)] px-2 py-1 text-[0.62rem] uppercase tracking-wider text-[var(--j-muted)] transition hover:border-[var(--j-cyan)] hover:bg-[rgba(41,230,255,0.12)] hover:text-white"
    >
      <Plus className="h-3 w-3" />
      {children}
    </button>
  )
}

export function InlineAdd({ placeholder, onAdd, label }: { placeholder: string; onAdd: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState("")
  if (!open) return <LogChip onClick={() => setOpen(true)}>{label}</LogChip>
  return (
    <form
      className="flex w-full gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) onAdd(v.trim())
        setV("")
        setOpen(false)
      }}
    >
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => !v && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        className="hud-input py-1 text-xs"
        aria-label={placeholder}
      />
    </form>
  )
}

const quick = (metric: string) => () => useQuickLog.getState().open({ type: "metric", metric })

/* ───────────── Health ───────────── */

export function HealthPanel({ score, className }: { score: number | null; className?: string }) {
  const logs = useJarvis((s) => s.logs)
  const t = useJarvis((s) => s.settings.targets)
  const unit = useJarvis((s) => s.settings.weightUnit)
  const sleepAvg = weekAvg(logs, "sleep")
  const workouts = weekDaysWith(logs, "workout")
  const today = todayKey()
  const water = logs.filter((l) => l.metric === "water" && l.date === today).reduce((a, l) => a + l.value, 0)
  const weight = latest(logs, "weight")
  const addWater = () => {
    useJarvis.getState().addLog({ metric: "water", value: 1 })
    useQuickLog.getState().flash("Water · +1 glass")
  }
  return (
    <PillarShell
      pillar="health"
      score={score}
      className={className}
      actions={
        <>
          <LogChip onClick={quick("sleep")}>Sleep</LogChip>
          <LogChip onClick={quick("workout")}>Workout</LogChip>
          <LogChip onClick={addWater} title="Add one glass">Water</LogChip>
          <LogChip onClick={quick("energy")}>Energy</LogChip>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sleep 7d" value={sleepAvg === null ? "--" : `${sleepAvg.toFixed(1)}h`} sub={`target ${t.sleep}h`} />
        <Stat label="Workouts" value={`${workouts}/${t.workout}`} sub="this week" />
        <Stat label="Water" value={`${water}/${t.water}`} sub={weight ? `${weight.value}${unit}` : "today"} />
      </div>
      <div>
        <div className="hud-label mb-1">Sleep · 14 days</div>
        <Sparkline data={series(logs, "sleep", 14)} target={t.sleep} format={(v) => `${v.toFixed(1)}h`} />
      </div>
    </PillarShell>
  )
}

/* ───────────── Wealth ───────────── */

export function WealthPanel({ score, className }: { score: number | null; className?: string }) {
  const transactions = useJarvis((s) => s.transactions)
  const st = useJarvis((s) => s.settings)
  const fin = monthFinance(transactions)
  const elapsed = monthElapsedFraction()
  const used = st.monthlyBudget > 0 ? fin.expense / st.monthlyBudget : 0
  const over = used > elapsed
  return (
    <PillarShell
      pillar="wealth"
      score={score}
      className={className}
      actions={
        <>
          <LogChip onClick={() => useQuickLog.getState().open({ type: "money", kind: "expense" })}>Expense</LogChip>
          <LogChip onClick={() => useQuickLog.getState().open({ type: "money", kind: "income" })}>Income</LogChip>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Net · month" value={formatMoney(fin.net, st.currency)} tone={fin.net < 0 ? "var(--j-amber)" : undefined} />
        <Stat label="Savings" value={fin.savingsRate === null ? "--" : `${Math.round(fin.savingsRate)}%`} sub={`target ${st.targets.savingsRate}%`} />
        <Stat label="Net worth" value={st.netWorth === undefined ? "--" : formatMoney(st.netWorth, st.currency)} />
      </div>
      <div>
        <div className="mb-1 flex justify-between">
          <span className="hud-label">Budget burn</span>
          <span className="font-mono-hud text-[0.62rem]" style={{ color: over ? "var(--j-amber)" : "var(--j-muted)" }}>
            {formatMoney(fin.expense, st.currency)} / {formatMoney(st.monthlyBudget, st.currency)}
            {over ? " · ahead of pace" : ""}
          </span>
        </div>
        <div className="relative">
          <SegBar value={used} warn={false} tone={over ? "var(--j-amber)" : undefined} />
          <span
            className="absolute -top-1 h-4 w-px bg-white shadow-[0_0_6px_white]"
            style={{ left: `${elapsed * 100}%` }}
            title="Month elapsed"
          />
        </div>
      </div>
      <div>
        <div className="hud-label mb-1">Cumulative spend · this month</div>
        <Sparkline data={spendBurn(transactions)} format={(v) => formatMoney(v, st.currency)} height={38} />
      </div>
    </PillarShell>
  )
}

/* ───────────── Career ───────────── */

export function CareerPanel({ score, className }: { score: number | null; className?: string }) {
  const logs = useJarvis((s) => s.logs)
  const projects = useJarvis((s) => s.projects)
  const target = useJarvis((s) => s.settings.targets.deepwork)
  const deep = weekTotal(logs, "deepwork")
  const shipped = weekTotal(logs, "shipped")
  const active = projects.filter((p) => p.status === "active").slice(0, 3)
  return (
    <PillarShell
      pillar="career"
      score={score}
      className={className}
      actions={
        <>
          <LogChip onClick={quick("deepwork")}>Deep work</LogChip>
          <LogChip onClick={quick("shipped")}>Shipped</LogChip>
          <LogChip onClick={() => useJarvis.getState().setUI({ activePillar: "career" })}>Project</LogChip>
        </>
      }
    >
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="hud-label">Deep work · week</span>
          <span className="font-hud text-sm text-[var(--j-ice)]">
            {formatMinutes(deep)} <span className="text-[var(--j-faint)]">/ {target}h</span>
          </span>
        </div>
        <SegBar value={deep / 60 / Math.max(1, target)} />
      </div>
      <Sparkline data={series(logs, "deepwork", 14)} format={formatMinutes} height={34} />
      <div className="space-y-1.5">
        {active.length === 0 ? (
          <Empty>No active projects</Empty>
        ) : (
          active.map((p) => (
            <div key={p.id}>
              <div className="flex justify-between text-[0.75rem]">
                <span className="truncate text-[var(--j-text)]">{p.name}</span>
                <span className="font-mono-hud text-[var(--j-muted)]">{p.progress}%</span>
              </div>
              <div className="h-[3px] bg-[rgba(41,230,255,0.1)]">
                <div className="h-full bg-[var(--j-cyan)] shadow-[0_0_6px_var(--j-cyan)] transition-all duration-700" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          ))
        )}
        {shipped > 0 && <div className="font-mono-hud text-[0.65rem] text-[var(--j-cyan)]">▲ {shipped} shipped this week</div>}
      </div>
    </PillarShell>
  )
}

/* ───────────── Mind ───────────── */

export function MindPanel({ score, className }: { score: number | null; className?: string }) {
  const logs = useJarvis((s) => s.logs)
  const t = useJarvis((s) => s.settings.targets)
  const rows = [
    { id: "reading", label: "Reading", target: t.reading },
    { id: "meditation", label: "Meditation", target: t.meditation },
    { id: "learning", label: "Learning", target: t.learning },
  ]
  return (
    <PillarShell
      pillar="mind"
      score={score}
      className={className}
      actions={
        <>
          <LogChip onClick={quick("reading")}>Read</LogChip>
          <LogChip onClick={quick("meditation")}>Meditate</LogChip>
          <LogChip onClick={quick("learning")}>Learn</LogChip>
          <LogChip onClick={quick("mood")}>Mood</LogChip>
        </>
      }
    >
      <div className="space-y-2.5">
        {rows.map((r) => {
          const total = weekTotal(logs, r.id)
          return (
            <div key={r.id}>
              <div className="mb-1 flex justify-between">
                <span className="hud-label">{r.label}</span>
                <span className="font-mono-hud text-[0.65rem] text-[var(--j-muted)]">
                  {formatMinutes(total)} / {formatMinutes(r.target * 7)}
                </span>
              </div>
              <SegBar value={total / (r.target * 7)} />
            </div>
          )
        })}
      </div>
      <div>
        <div className="hud-label mb-1">Mood · 14 days</div>
        <Sparkline data={series(logs, "mood", 14)} format={(v) => `${v.toFixed(1)}/10`} height={34} />
      </div>
    </PillarShell>
  )
}

/* ───────────── Habits ───────────── */

export function HabitsPanel({ score, className }: { score: number | null; className?: string }) {
  const habits = useJarvis((s) => s.habits)
  const toggle = useJarvis((s) => s.toggleHabit)
  const addHabit = useJarvis((s) => s.addHabit)
  const today = todayKey()
  const week = lastNDays(7)
  const done = habits.filter((h) => h.completions.includes(today)).length
  return (
    <PillarShell
      pillar="habits"
      score={score}
      className={className}
      actions={<InlineAdd label="Habit" placeholder="New habit, e.g. Cold shower" onAdd={addHabit} />}
    >
      {habits.length === 0 ? (
        <Empty>No protocols defined</Empty>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="hud-label">Today</span>
            <span className="font-hud text-sm text-[var(--j-ice)]">
              {done}/{habits.length}
            </span>
          </div>
          <ul className="hud-scroll -mr-1 max-h-[180px] space-y-1 overflow-y-auto pr-1">
            {habits.map((h) => {
              const isDone = h.completions.includes(today)
              const streak = habitStreak(h)
              return (
                <li key={h.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(h.id)}
                    aria-pressed={isDone}
                    aria-label={`${isDone ? "Undo" : "Complete"} ${h.name}`}
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center border transition",
                      isDone ? "border-[var(--j-cyan)] bg-[var(--j-cyan)] text-[#001218] shadow-[0_0_8px_var(--j-cyan)]" : "border-[var(--j-line-strong)] hover:border-[var(--j-cyan)]",
                    )}
                  >
                    {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>
                  <span className={cn("min-w-0 flex-1 truncate text-[0.8rem]", isDone ? "text-[var(--j-muted)] line-through decoration-[var(--j-faint)]" : "text-[var(--j-text)]")}>
                    {h.name}
                  </span>
                  <span className="flex gap-[2px]" aria-hidden>
                    {week.map((d) => (
                      <span key={d} className="h-2 w-1.5" style={{ background: h.completions.includes(d) ? "var(--j-cyan)" : "rgba(41,230,255,0.12)" }} />
                    ))}
                  </span>
                  <span className="font-mono-hud flex w-9 items-center justify-end gap-0.5 text-[0.65rem]" style={{ color: streak >= 3 ? "var(--j-amber)" : "var(--j-faint)" }}>
                    <Flame className="h-3 w-3" />
                    {streak}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </PillarShell>
  )
}

/* ───────────── Missions ───────────── */

export function MissionsPanel({ score, className }: { score: number | null; className?: string }) {
  const missions = useJarvis((s) => s.missions)
  const active = missions
    .filter((m) => m.status === "active")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))
    .slice(0, 4)
  const total = missions.filter((m) => m.status === "active").length
  const open = () => useJarvis.getState().setUI({ activePillar: "missions" })
  return (
    <PillarShell
      pillar="missions"
      score={score}
      className={className}
      actions={
        <>
          <LogChip onClick={open}>Mission</LogChip>
          {total > 2 && (
            <button
              type="button"
              onClick={open}
              className="font-mono-hud ml-auto hidden text-[0.62rem] uppercase tracking-wider text-[var(--j-muted)] hover:text-white lg:block"
            >
              +{total - 2} more ▸
            </button>
          )}
        </>
      }
    >
      {active.length === 0 ? (
        <Empty>No active missions. Define your objectives</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {active.map((m, i) => {
            const d = m.due ? daysUntil(m.due) : null
            const next = m.milestones.find((x) => !x.done)
            return (
              <button
                key={m.id}
                type="button"
                onClick={open}
                className={cn(
                  "group flex items-center gap-3 border border-[var(--j-line)] bg-[rgba(41,230,255,0.03)] p-2 text-left transition hover:border-[var(--j-cyan)] hover:bg-[rgba(41,230,255,0.08)]",
                  i >= 2 && "lg:hidden",
                )}
              >
                <Ring value={m.progress} size={40} label={`${m.progress}%`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.82rem] font-semibold text-[var(--j-text)] group-hover:text-white">{m.title}</div>
                  <div className="font-mono-hud flex gap-2 text-[0.6rem] uppercase tracking-wider text-[var(--j-faint)]">
                    <span>{m.horizon}</span>
                    <span>{PILLAR_BY_ID[m.pillar]?.short}</span>
                    {d !== null && <span style={{ color: d < 0 ? "var(--j-red)" : d <= 7 ? "var(--j-amber)" : undefined }}>{d < 0 ? `overdue ${-d}d` : `T-${d}d`}</span>}
                  </div>
                  {next && <div className="truncate text-[0.7rem] text-[var(--j-muted)]">▸ {next.title}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </PillarShell>
  )
}

/* ───────────── Spirit ───────────── */

export function SpiritPanel({ score, className }: { score: number | null; className?: string }) {
  const journal = useJarvis((s) => s.journal)
  const st = useJarvis((s) => s.settings)
  const addJournal = useJarvis((s) => s.addJournal)
  const week = new Set(lastNDays(7))
  const gratitude = journal.filter((j) => j.kind === "gratitude")
  const thisWeek = gratitude.filter((j) => week.has(j.date)).length
  const lastG = gratitude[gratitude.length - 1]
  return (
    <PillarShell
      pillar="spirit"
      score={score}
      className={className}
      actions={
        <>
          <InlineAdd label="Gratitude" placeholder="I'm grateful for…" onAdd={(v) => addJournal("gratitude", v)} />
          <LogChip onClick={quick("reflection")}>Reflect</LogChip>
        </>
      }
    >
      {st.vision ? (
        <blockquote className="border-l-2 border-[var(--j-cyan)] pl-2 text-[0.8rem] italic leading-snug text-[var(--j-ice)]">“{st.vision}”</blockquote>
      ) : (
        <button
          type="button"
          onClick={() => useJarvis.getState().setUI({ activePillar: "spirit" })}
          className="font-mono-hud border border-dashed border-[var(--j-line-strong)] p-2 text-[0.65rem] uppercase tracking-widest text-[var(--j-muted)] hover:text-white"
        >
          + Define your life vision
        </button>
      )}
      <div>
        <div className="mb-1 flex justify-between">
          <span className="hud-label">Gratitude · week</span>
          <span className="font-mono-hud text-[0.65rem] text-[var(--j-muted)]">
            {thisWeek}/{st.targets.gratitude}
          </span>
        </div>
        <SegBar value={thisWeek / Math.max(1, st.targets.gratitude)} segments={14} />
      </div>
      {lastG && <div className="truncate text-[0.75rem] text-[var(--j-muted)]">✦ {lastG.text}</div>}
      {st.values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {st.values.slice(0, 5).map((v) => (
            <span key={v} className="font-mono-hud border border-[var(--j-line)] px-1.5 py-[1px] text-[0.6rem] uppercase tracking-wider text-[var(--j-muted)]">
              {v}
            </span>
          ))}
        </div>
      )}
    </PillarShell>
  )
}
