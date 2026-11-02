"use client"

import { format, parseISO } from "date-fns"
import { Check, Trash2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { daysUntil, lastNDays, prettyDate, todayKey } from "@/lib/jarvis/dates"
import { METRIC_BY_ID, PILLAR_BY_ID, PILLARS, metricsFor } from "@/lib/jarvis/pillars"
import { chartSeries, formatMinutes, formatMoney, habitStreak, monthFinance, spendBurn, type Scores } from "@/lib/jarvis/scoring"
import { useJarvis } from "@/lib/jarvis/store"
import type { JournalKind, MissionHorizon, PillarId, ProjectStatus } from "@/lib/jarvis/types"
import { cn } from "@/lib/utils"
import { Empty, HudButton, InlineAdd, LogChip, Ring, Sparkline, Stat } from "./hud"
import { Modal, ModalHeader, useQuickLog } from "./quick-log"

function Card({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("inset-panel p-4", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="hud-label">{title}</span>
        {right}
      </div>
      {children}
    </div>
  )
}

const fmtMetric = (metric: string, v: number) => {
  const def = METRIC_BY_ID[metric]
  if (def.unit === "min") return formatMinutes(v)
  if (def.unit === "h") return `${v.toFixed(1)}h`
  if (def.unit === "/10") return `${v.toFixed(1)}/10`
  return `${Math.round(v * 10) / 10} ${def.unit}`
}

function MetricChart({ metric }: { metric: string }) {
  const logs = useJarvis((s) => s.logs)
  const targets = useJarvis((s) => s.settings.targets) as unknown as Record<string, number>
  const data = chartSeries(logs, metric, 30)
  const def = METRIC_BY_ID[metric]
  const lastVal = [...data].reverse().find((d) => d.value !== null)?.value ?? null
  const target = metric === "sleep" || metric === "water" ? targets[metric] : ["reading", "meditation", "learning"].includes(metric) ? targets[metric] : undefined
  return (
    <Card
      title={`${def.label} · 30 days`}
      right={
        <div className="flex items-center gap-2">
          <span className="font-hud text-xs text-[var(--j-ice)]">{lastVal === null ? "--" : fmtMetric(metric, lastVal)}</span>
          <LogChip onClick={() => useQuickLog.getState().open({ type: "metric", metric })}>Log</LogChip>
        </div>
      }
    >
      <Sparkline data={data} target={target} height={64} format={(v) => fmtMetric(metric, v)} />
    </Card>
  )
}

function EntryList({ pillar }: { pillar: PillarId }) {
  const logs = useJarvis((s) => s.logs)
  const del = useJarvis((s) => s.deleteLog)
  const entries = logs
    .filter((l) => l.pillar === pillar)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 25)
  return (
    <Card title="Recent entries">
      {entries.length === 0 ? (
        <Empty>No entries yet</Empty>
      ) : (
        <ul className="hud-scroll max-h-64 space-y-1 overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id} className="group flex items-center gap-2 text-[0.78rem]">
              <span className="font-mono-hud w-12 shrink-0 text-[0.65rem] text-[var(--j-faint)]">{prettyDate(e.date)}</span>
              <span className="w-24 shrink-0 text-[var(--j-muted)]">{METRIC_BY_ID[e.metric]?.label ?? e.metric}</span>
              <span className="font-hud text-[0.75rem] text-[var(--j-ice)]">{fmtMetric(e.metric, e.value)}</span>
              <span className="min-w-0 flex-1 truncate text-[0.7rem] text-[var(--j-faint)]">{e.note}</span>
              <button type="button" onClick={() => del(e.id)} className="p-1 text-[var(--j-faint)] opacity-60 hover:text-[var(--j-red)] group-hover:opacity-100" aria-label="Delete entry">
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* ───────────── per-pillar bodies ───────────── */

function MetricsBody({ pillar }: { pillar: PillarId }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {metricsFor(pillar).map((m) => (
        <MetricChart key={m.id} metric={m.id} />
      ))}
      <EntryList pillar={pillar} />
    </div>
  )
}

function WealthBody() {
  const transactions = useJarvis((s) => s.transactions)
  const st = useJarvis((s) => s.settings)
  const update = useJarvis((s) => s.updateSettings)
  const del = useJarvis((s) => s.deleteTransaction)
  const fin = monthFinance(transactions)
  const cats = Object.entries(fin.byCategory).sort((a, b) => b[1] - a[1])
  const maxCat = cats[0]?.[1] ?? 1
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts).slice(0, 40)
  const [nw, setNw] = useState(st.netWorth?.toString() ?? "")
  const [budget, setBudget] = useState(st.monthlyBudget.toString())
  const c = st.currency

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="This month">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Income" value={formatMoney(fin.income, c)} />
          <Stat label="Spent" value={formatMoney(fin.expense, c)} />
          <Stat label="Net" value={formatMoney(fin.net, c)} tone={fin.net < 0 ? "var(--j-amber)" : undefined} />
        </div>
        <div className="mt-3">
          <Sparkline data={spendBurn(transactions)} height={60} format={(v) => formatMoney(v, c)} target={st.monthlyBudget} />
          <div className="font-mono-hud mt-1 text-[0.6rem] text-[var(--j-faint)]">Cumulative spend; dashed line marks your monthly budget</div>
        </div>
      </Card>
      <Card title="Spending by category">
        {cats.length === 0 ? (
          <Empty>No expenses this month</Empty>
        ) : (
          <ul className="space-y-1.5">
            {cats.map(([cat, v]) => (
              <li key={cat} className="group grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-[0.75rem]" title={`${cat}: ${formatMoney(v, c)}`}>
                <span className="truncate capitalize text-[var(--j-muted)]">{cat}</span>
                <span className="h-2 bg-[rgba(41,230,255,0.08)]">
                  <span className="block h-full bg-[var(--j-cyan)] shadow-[0_0_6px_var(--j-cyan)] transition-all group-hover:bg-white" style={{ width: `${(v / maxCat) * 100}%` }} />
                </span>
                <span className="font-mono-hud text-[var(--j-ice)]">{formatMoney(v, c)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card
        title="Transactions"
        right={
          <div className="flex gap-1.5">
            <LogChip onClick={() => useQuickLog.getState().open({ type: "money", kind: "expense" })}>Expense</LogChip>
            <LogChip onClick={() => useQuickLog.getState().open({ type: "money", kind: "income" })}>Income</LogChip>
          </div>
        }
      >
        {recent.length === 0 ? (
          <Empty>No transactions</Empty>
        ) : (
          <ul className="hud-scroll max-h-64 space-y-1 overflow-y-auto">
            {recent.map((t) => (
              <li key={t.id} className="group flex items-center gap-2 text-[0.78rem]">
                <span className="font-mono-hud w-12 shrink-0 text-[0.65rem] text-[var(--j-faint)]">{prettyDate(t.date)}</span>
                <span className="w-24 shrink-0 truncate capitalize text-[var(--j-muted)]">{t.category}</span>
                <span className="min-w-0 flex-1 truncate text-[0.7rem] text-[var(--j-faint)]">{t.note}</span>
                <span className="font-hud text-[0.75rem]" style={{ color: t.kind === "income" ? "var(--j-green)" : "var(--j-ice)" }}>
                  {t.kind === "income" ? "+" : "−"}
                  {formatMoney(t.amount, c)}
                </span>
                <button type="button" onClick={() => del(t.id)} className="p-1 text-[var(--j-faint)] opacity-60 hover:text-[var(--j-red)] group-hover:opacity-100" aria-label="Delete transaction">
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Reactor settings">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="hud-label">Monthly budget</span>
            <input className="hud-input" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} onBlur={() => parseFloat(budget) > 0 && update({ monthlyBudget: parseFloat(budget) })} />
          </label>
          <label className="space-y-1">
            <span className="hud-label">Net worth</span>
            <input className="hud-input" inputMode="decimal" value={nw} placeholder="Total assets − debts" onChange={(e) => setNw(e.target.value)} onBlur={() => nw !== "" && !isNaN(parseFloat(nw)) && update({ netWorth: parseFloat(nw) })} />
          </label>
          <label className="space-y-1">
            <span className="hud-label">Savings target %</span>
            <input
              className="hud-input"
              type="number"
              defaultValue={st.targets.savingsRate}
              onBlur={(e) => update({ targets: { ...st.targets, savingsRate: parseFloat(e.target.value) || 20 } })}
            />
          </label>
          <label className="space-y-1">
            <span className="hud-label">Currency symbol</span>
            <input className="hud-input" maxLength={3} defaultValue={c} onBlur={(e) => update({ currency: e.target.value || "$" })} />
          </label>
        </div>
      </Card>
    </div>
  )
}

const STATUS: ProjectStatus[] = ["idea", "active", "paused", "shipped"]

function CareerBody() {
  const projects = useJarvis((s) => s.projects)
  const { addProject, updateProject, deleteProject } = useJarvis.getState()
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <MetricChart metric="deepwork" />
      <MetricChart metric="shipped" />
      <Card title="Projects" className="md:col-span-2" right={<InlineAdd label="Project" placeholder="Project name, e.g. Album: Not Sorry" onAdd={(name) => addProject({ name })} />}>
        {projects.length === 0 ? (
          <Empty>No projects. Add songs, releases, products or clients</Empty>
        ) : (
          <ul className="space-y-2">
            {[...projects]
              .sort((a, b) => STATUS.indexOf(a.status) - STATUS.indexOf(b.status))
              .map((p) => (
                <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-[var(--j-line)] pb-2 sm:grid-cols-[1fr_7rem_10rem_auto]">
                  <input
                    className="min-w-0 bg-transparent text-[0.85rem] text-[var(--j-text)] outline-none focus:text-white"
                    defaultValue={p.name}
                    onBlur={(e) => e.target.value.trim() && updateProject(p.id, { name: e.target.value.trim() })}
                    aria-label="Project name"
                  />
                  <select className="hud-input py-1 text-xs" value={p.status} onChange={(e) => updateProject(p.id, { status: e.target.value as ProjectStatus })} aria-label="Status">
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={p.progress}
                      onChange={(e) => updateProject(p.id, { progress: parseInt(e.target.value, 10) })}
                      className="w-full accent-[#29e6ff]"
                      aria-label="Progress"
                    />
                    <span className="font-mono-hud w-9 text-right text-[0.7rem] text-[var(--j-ice)]">{p.progress}%</span>
                  </div>
                  <button type="button" onClick={() => deleteProject(p.id)} className="p-1 text-[var(--j-faint)] hover:text-[var(--j-red)]" aria-label="Delete project">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>
      <EntryList pillar="career" />
    </div>
  )
}

function JournalList({ kinds, title, add }: { kinds: JournalKind[]; title: string; add?: { kind: JournalKind; label: string; placeholder: string } }) {
  const journal = useJarvis((s) => s.journal)
  const { addJournal, deleteJournal } = useJarvis.getState()
  const items = journal.filter((j) => kinds.includes(j.kind)).sort((a, b) => b.ts - a.ts)
  return (
    <Card title={title} right={add && <InlineAdd label={add.label} placeholder={add.placeholder} onAdd={(v) => addJournal(add.kind, v)} />}>
      {items.length === 0 ? (
        <Empty>Nothing yet</Empty>
      ) : (
        <ul className="hud-scroll max-h-64 space-y-1.5 overflow-y-auto">
          {items.map((j) => (
            <li key={j.id} className="group flex gap-2 text-[0.8rem]">
              <span className="font-mono-hud w-12 shrink-0 pt-[2px] text-[0.65rem] text-[var(--j-faint)]">{prettyDate(j.date)}</span>
              <span className="min-w-0 flex-1 text-[var(--j-text)]">
                {kinds.length > 1 && <span className="font-mono-hud mr-1 text-[0.6rem] uppercase text-[var(--j-cyan)]">{j.kind}</span>}
                {j.text}
              </span>
              <button type="button" onClick={() => deleteJournal(j.id)} className="p-1 text-[var(--j-faint)] opacity-60 hover:text-[var(--j-red)] group-hover:opacity-100" aria-label="Delete entry">
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function MindBody() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {metricsFor("mind").map((m) => (
        <MetricChart key={m.id} metric={m.id} />
      ))}
      <JournalList kinds={["journal"]} title="Journal" add={{ kind: "journal", label: "Entry", placeholder: "What's on your mind?" }} />
      <EntryList pillar="mind" />
    </div>
  )
}

function HabitsBody() {
  const habits = useJarvis((s) => s.habits)
  const { addHabit, toggleHabit, renameHabit, deleteHabit } = useJarvis.getState()
  const days = lastNDays(28)
  return (
    <div className="space-y-3">
      <Card title="Protocol matrix · 28 days" right={<InlineAdd label="Habit" placeholder="New habit" onAdd={addHabit} />}>
        {habits.length === 0 ? (
          <Empty>No habits yet. Add one to start a streak</Empty>
        ) : (
          <div className="hud-scroll overflow-x-auto">
            <table className="w-full border-separate border-spacing-[3px]">
              <thead>
                <tr>
                  <th className="hud-label w-40 text-left font-normal">Habit</th>
                  {days.map((d, i) => (
                    <th key={d} className="font-mono-hud text-[0.5rem] font-normal text-[var(--j-faint)]">
                      {i % 7 === 6 || i === days.length - 1 ? format(parseISO(d), "d") : ""}
                    </th>
                  ))}
                  <th className="hud-label text-right font-normal">Streak</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {habits.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <input
                        className="w-40 bg-transparent text-[0.8rem] text-[var(--j-text)] outline-none focus:text-white"
                        defaultValue={h.name}
                        onBlur={(e) => e.target.value.trim() && renameHabit(h.id, e.target.value.trim())}
                        aria-label="Habit name"
                      />
                    </td>
                    {days.map((d) => {
                      const on = h.completions.includes(d)
                      return (
                        <td key={d}>
                          <button
                            type="button"
                            title={`${h.name} · ${d}${on ? " · done" : ""}`}
                            onClick={() => toggleHabit(h.id, d)}
                            className="block h-4 w-full min-w-[12px] transition hover:outline hover:outline-1 hover:outline-[var(--j-cyan)]"
                            style={{ background: on ? "var(--j-cyan)" : "rgba(41,230,255,0.09)", boxShadow: on ? "0 0 6px rgba(41,230,255,0.6)" : undefined }}
                            aria-label={`${h.name} ${d} ${on ? "done" : "not done"}`}
                          />
                        </td>
                      )
                    })}
                    <td className="font-hud text-right text-xs text-[var(--j-ice)]">{habitStreak(h)}</td>
                    <td>
                      <button type="button" onClick={() => deleteHabit(h.id)} className="p-1 text-[var(--j-faint)] hover:text-[var(--j-red)]" aria-label={`Delete ${h.name}`}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="font-mono-hud text-[0.65rem] text-[var(--j-faint)]">Click any cell to toggle a past day. Streaks count consecutive days up to today or yesterday.</div>
    </div>
  )
}

function MissionsBody() {
  const missions = useJarvis((s) => s.missions)
  const { addMission, updateMission, toggleMilestone, addMilestone, deleteMission } = useJarvis.getState()
  const [title, setTitle] = useState("")
  const [pillar, setPillar] = useState<PillarId>("career")
  const [horizon, setHorizon] = useState<MissionHorizon>("quarter")
  const [due, setDue] = useState("")
  const [ms, setMs] = useState("")
  const [showDone, setShowDone] = useState(false)
  const list = missions.filter((m) => (showDone ? m.status === "done" : m.status === "active"))

  return (
    <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
      <Card title="New mission">
        <form
          className="space-y-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!title.trim()) return
            addMission({ title, pillar, horizon, due: due || undefined, milestones: ms.split(/[,\n]/).map((x) => x.trim()).filter(Boolean) })
            setTitle("")
            setDue("")
            setMs("")
          }}
        >
          <input className="hud-input" placeholder="Objective, e.g. Release the album" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Mission title" />
          <div className="grid grid-cols-2 gap-2">
            <select className="hud-input" value={pillar} onChange={(e) => setPillar(e.target.value as PillarId)} aria-label="Pillar">
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select className="hud-input" value={horizon} onChange={(e) => setHorizon(e.target.value as MissionHorizon)} aria-label="Horizon">
              {(["week", "quarter", "year", "life"] as const).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <input className="hud-input" type="date" value={due} min={todayKey()} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          <textarea
            className="hud-input min-h-[70px]"
            placeholder="Milestones, comma or line separated"
            value={ms}
            onChange={(e) => setMs(e.target.value)}
            aria-label="Milestones"
          />
          <HudButton variant="solid" type="submit" className="w-full" disabled={!title.trim()}>
            Deploy mission
          </HudButton>
        </form>
      </Card>
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <HudButton variant={showDone ? undefined : "solid"} onClick={() => setShowDone(false)}>
            Active · {missions.filter((m) => m.status === "active").length}
          </HudButton>
          <HudButton variant={showDone ? "solid" : undefined} onClick={() => setShowDone(true)}>
            Completed · {missions.filter((m) => m.status === "done").length}
          </HudButton>
        </div>
        {list.length === 0 && <Empty>{showDone ? "No completed missions yet" : "No active missions"}</Empty>}
        {list.map((m) => {
          const d = m.due ? daysUntil(m.due) : null
          return (
            <div key={m.id} className="inset-panel p-4">
              <div className="flex items-start gap-3">
                <Ring value={m.progress} size={46} label={`${m.progress}%`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[0.95rem] font-semibold text-[var(--j-text)]">{m.title}</div>
                  <div className="font-mono-hud flex flex-wrap gap-x-3 text-[0.62rem] uppercase tracking-wider text-[var(--j-faint)]">
                    <span>{PILLAR_BY_ID[m.pillar]?.name}</span>
                    <span>{m.horizon}</span>
                    {m.due && (
                      <span style={{ color: d !== null && d < 0 && m.status === "active" ? "var(--j-red)" : undefined }}>
                        due {prettyDate(m.due)} {m.status === "active" && d !== null ? (d < 0 ? `· overdue ${-d}d` : `· T-${d}d`) : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {m.status === "active" ? (
                    <HudButton onClick={() => updateMission(m.id, { status: "done", progress: 100 })} title="Mark complete">
                      <Check className="h-3.5 w-3.5" />
                    </HudButton>
                  ) : (
                    <HudButton onClick={() => updateMission(m.id, { status: "active" })} title="Reactivate">
                      Reopen
                    </HudButton>
                  )}
                  <HudButton variant="danger" onClick={() => deleteMission(m.id)} aria-label="Delete mission">
                    <Trash2 className="h-3.5 w-3.5" />
                  </HudButton>
                </div>
              </div>
              {m.milestones.length > 0 ? (
                <ul className="mt-2 space-y-1 pl-[58px]">
                  {m.milestones.map((x) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => toggleMilestone(m.id, x.id)} className="flex items-center gap-2 text-left text-[0.8rem]">
                        <span
                          className={cn(
                            "flex h-3.5 w-3.5 shrink-0 items-center justify-center border",
                            x.done ? "border-[var(--j-cyan)] bg-[var(--j-cyan)] text-[#001218]" : "border-[var(--j-line-strong)]",
                          )}
                        >
                          {x.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                        </span>
                        <span className={x.done ? "text-[var(--j-faint)] line-through" : "text-[var(--j-text)]"}>{x.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                m.status === "active" && (
                  <div className="mt-2 flex items-center gap-2 pl-[58px]">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={m.progress}
                      onChange={(e) => updateMission(m.id, { progress: parseInt(e.target.value, 10) })}
                      className="w-full accent-[#29e6ff]"
                      aria-label="Progress"
                    />
                  </div>
                )
              )}
              {m.status === "active" && (
                <div className="mt-2 pl-[58px]">
                  <InlineAdd label="Milestone" placeholder="Next milestone" onAdd={(v) => addMilestone(m.id, v)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SpiritBody() {
  const st = useJarvis((s) => s.settings)
  const update = useJarvis((s) => s.updateSettings)
  const [vision, setVision] = useState(st.vision)
  const [values, setValues] = useState(st.values.join(", "))
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card title="Life vision" className="md:col-span-2">
        <textarea
          className="hud-input min-h-[80px] text-[0.9rem]"
          placeholder="Who are you becoming? Write the one paragraph you want JARVIS to remind you of every morning."
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          onBlur={() => update({ vision: vision.trim() })}
          aria-label="Life vision"
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="hud-input"
            placeholder="Core values, comma separated: Discipline, Family, Craft"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            onBlur={() => update({ values: values.split(",").map((v) => v.trim()).filter(Boolean) })}
            aria-label="Core values"
          />
          <HudButton
            variant="solid"
            onClick={() => update({ vision: vision.trim(), values: values.split(",").map((v) => v.trim()).filter(Boolean) })}
          >
            Save
          </HudButton>
        </div>
      </Card>
      <JournalList kinds={["gratitude"]} title="Gratitude log" add={{ kind: "gratitude", label: "Gratitude", placeholder: "I'm grateful for…" }} />
      <JournalList kinds={["reflection", "win"]} title="Reflections & wins" add={{ kind: "reflection", label: "Reflection", placeholder: "Today I learned…" }} />
      <MetricChart metric="reflection" />
    </div>
  )
}

export function PillarDetail({ scores }: { scores: Scores }) {
  const active = useJarvis((s) => s.activePillar)
  const close = () => useJarvis.getState().setUI({ activePillar: null })
  const def = active ? PILLAR_BY_ID[active] : null
  return (
    <Modal open={!!active} onClose={close} variant="sheet">
      {def && active && (
        <>
          <ModalHeader title={def.name.toUpperCase()} sub={def.tagline} onClose={close} lead={<Ring value={scores[active]} size={40} />} />
          <div className="p-4 sm:p-5">
            {active === "health" && <MetricsBody pillar="health" />}
            {active === "wealth" && <WealthBody />}
            {active === "career" && <CareerBody />}
            {active === "mind" && <MindBody />}
            {active === "habits" && <HabitsBody />}
            {active === "missions" && <MissionsBody />}
            {active === "spirit" && <SpiritBody />}
          </div>
        </>
      )}
    </Modal>
  )
}
