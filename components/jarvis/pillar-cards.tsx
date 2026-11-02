"use client"

import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import { lastNDays, monthElapsedFraction } from "@/lib/jarvis/dates"
import { PILLAR_BY_ID } from "@/lib/jarvis/pillars"
import { chartSeries, dayValue, formatMinutes, formatMoney, monthFinance, spendBurn, weekAvg, weekDaysWith, weekTotal } from "@/lib/jarvis/scoring"
import { useJarvis } from "@/lib/jarvis/store"
import type { PillarId } from "@/lib/jarvis/types"
import { AnimatedNumber, Bar, HudPanel, Ring, Sparkline } from "./hud"
import { useQuickLog } from "./quick-log"

interface Summary {
  hero: ReactNode
  heroLabel: string
  sub: ReactNode
  chart?: ReactNode
}

function useSummary(pillar: PillarId): Summary {
  const logs = useJarvis((s) => s.logs)
  const transactions = useJarvis((s) => s.transactions)
  const projects = useJarvis((s) => s.projects)
  const journal = useJarvis((s) => s.journal)
  const st = useJarvis((s) => s.settings)
  const t = st.targets

  switch (pillar) {
    case "health": {
      const sleep = weekAvg(logs, "sleep")
      return {
        hero: sleep === null ? "–" : <AnimatedNumber value={sleep} format={(v) => `${v.toFixed(1)}h`} />,
        heroLabel: "avg sleep · 7 days",
        sub: `${weekDaysWith(logs, "workout")}/${t.workout} workouts this week`,
        chart: <Sparkline data={chartSeries(logs, "sleep", 14)} target={t.sleep} height={40} format={(v) => `${v.toFixed(1)}h`} />,
      }
    }
    case "wealth": {
      const fin = monthFinance(transactions)
      const used = st.monthlyBudget > 0 ? fin.expense / st.monthlyBudget : 0
      const elapsed = monthElapsedFraction()
      return {
        hero: <AnimatedNumber value={fin.net} format={(v) => formatMoney(Math.round(v), st.currency)} />,
        heroLabel: "net this month",
        sub: (
          <>
            {formatMoney(fin.expense, st.currency)} of {formatMoney(st.monthlyBudget, st.currency)} spent
            {used > elapsed && <span className="text-[var(--j-amber)]"> · ahead of pace</span>}
          </>
        ),
        chart: (
          <div className="space-y-2 pt-1">
            <Sparkline data={spendBurn(transactions)} height={28} format={(v) => formatMoney(v, st.currency)} />
            <Bar value={used} warn={false} tone={used > elapsed ? "var(--j-amber)" : undefined} marker={elapsed} />
          </div>
        ),
      }
    }
    case "career": {
      const deep = weekTotal(logs, "deepwork")
      const active = projects.filter((p) => p.status === "active").length
      return {
        hero: <AnimatedNumber value={deep} format={(v) => formatMinutes(v)} />,
        heroLabel: `deep work · target ${t.deepwork}h`,
        sub: `${active} active project${active === 1 ? "" : "s"}${weekTotal(logs, "shipped") ? ` · ${weekTotal(logs, "shipped")} shipped` : ""}`,
        chart: <Sparkline data={chartSeries(logs, "deepwork", 14)} height={40} format={formatMinutes} />,
      }
    }
    case "mind": {
      const ids = ["reading", "meditation", "learning"]
      const total = ids.reduce((a, id) => a + weekTotal(logs, id), 0)
      const mood = weekAvg(logs, "mood")
      const daily = lastNDays(14).map((date) => {
        const vals = ids.map((id) => dayValue(logs, id, date))
        return { date, value: vals.reduce<number>((a, v) => a + (v ?? 0), 0) }
      })
      return {
        hero: <AnimatedNumber value={total} format={(v) => formatMinutes(v)} />,
        heroLabel: "read · meditate · learn",
        sub: mood === null ? "Log your mood to track it" : `Mood ${mood.toFixed(1)}/10 this week`,
        chart: <Sparkline data={daily} height={40} format={formatMinutes} />,
      }
    }
    case "spirit": {
      const week = new Set(lastNDays(7))
      const grat = journal.filter((j) => j.kind === "gratitude")
      const n = grat.filter((j) => week.has(j.date)).length
      const last = grat[grat.length - 1]
      return {
        hero: (
          <>
            <AnimatedNumber value={n} />
            <span className="text-[var(--j-faint)]">/{t.gratitude}</span>
          </>
        ),
        heroLabel: "gratitudes this week",
        sub: st.vision ? <span className="italic">“{st.vision}”</span> : "Tap to write your life vision",
        chart: last ? <div className="line-clamp-2 text-[0.82rem] leading-snug text-[var(--j-ice)]">✦ {last.text}</div> : undefined,
      }
    }
    default:
      return { hero: "–", heroLabel: "", sub: "" }
  }
}

export function PillarCard({ pillar, score }: { pillar: PillarId; score: number | null }) {
  const def = PILLAR_BY_ID[pillar]
  const s = useSummary(pillar)
  return (
    <HudPanel
      onClick={() => useJarvis.getState().setUI({ activePillar: pillar })}
      title={def.name}
      right={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              useQuickLog.getState().open({ type: "pillar", pillar })
            }}
            className="icon-btn h-7 w-7"
            aria-label={`Log ${def.name}`}
            title={`Log ${def.name.toLowerCase()}`}
          >
            <Plus className="h-4 w-4" />
          </button>
          <Ring value={score} size={28} />
        </div>
      }
    >
      <div className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-end gap-4 px-4 pb-3.5 pt-1.5">
        <div className="min-w-0">
          <div className="font-hud tabular truncate text-[1.45rem] font-semibold leading-none text-white">{s.hero}</div>
          <div className="mt-1.5 truncate text-[0.72rem] text-[var(--j-muted)]">{s.heroLabel}</div>
        </div>
        <div className="min-w-0">{s.chart}</div>
        <div className="col-span-2 -mt-1 truncate text-[0.78rem] text-[var(--j-faint)]">{s.sub}</div>
      </div>
    </HudPanel>
  )
}
