"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { create } from "zustand"
import { applyAction } from "@/lib/jarvis/actions"
import { todayKey } from "@/lib/jarvis/dates"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METRIC_BY_ID, PILLAR_BY_ID, metricsFor } from "@/lib/jarvis/pillars"
import { useJarvis } from "@/lib/jarvis/store"
import type { PillarId } from "@/lib/jarvis/types"
import { cn } from "@/lib/utils"
import { HudButton, IconButton } from "./hud"

type Target =
  | { type: "metric"; metric: string }
  | { type: "money"; kind: "expense" | "income" }
  | { type: "pillar"; pillar: PillarId }
  | null

export const useQuickLog = create<{
  target: Target
  toast: string | null
  open: (t: Target) => void
  close: () => void
  flash: (msg: string) => void
}>((set) => ({
  target: null,
  toast: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
  flash: (toast) => {
    set({ toast })
    setTimeout(() => set((s) => (s.toast === toast ? { toast: null } : s)), 2200)
  },
}))

const PRESETS: Record<string, number[]> = {
  sleep: [5, 6, 7, 7.5, 8, 9],
  workout: [20, 30, 45, 60, 90],
  water: [1, 2, 3, 4, 8],
  deepwork: [30, 60, 90, 120, 180, 240],
  shipped: [1],
  reading: [10, 20, 30, 45, 60],
  meditation: [5, 10, 15, 20, 30],
  learning: [15, 30, 45, 60, 90],
  reflection: [5, 10, 15, 30],
}

const SPRING = { type: "spring", damping: 32, stiffness: 320, mass: 0.9 } as const

/** Dialog (centered) or sheet (slides from the right on desktop, from the bottom on phones). */
export function Modal({
  open,
  onClose,
  children,
  variant = "dialog",
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  variant?: "dialog" | "sheet"
}) {
  const [desktop, setDesktop] = useState(true)
  useEffect(() => {
    if (!open) return
    setDesktop(window.matchMedia("(min-width: 640px)").matches)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const sheet = variant === "sheet"
  const from = sheet ? (desktop ? { x: "100%" } : { y: "100%" }) : desktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" }
  const to = sheet ? { x: 0, y: 0 } : { opacity: 1, scale: 1, y: 0 }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 flex bg-[rgba(0,5,9,0.55)] backdrop-blur-[3px]",
            sheet ? "items-end sm:items-stretch sm:justify-end" : "items-end justify-center sm:items-center sm:p-6",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={from}
            animate={to}
            exit={from}
            transition={SPRING}
            className={cn(
              "glass relative w-full overflow-hidden !rounded-b-none bg-[rgba(3,14,21,0.92)] sm:!rounded-b-[20px]",
              sheet ? "max-h-[92dvh] sm:max-h-none sm:h-full sm:w-[min(760px,92vw)] sm:!rounded-r-none" : "max-h-[92dvh] sm:max-w-md",
            )}
          >
            <div className={cn("hud-scroll relative z-[1] overflow-y-auto", sheet ? "max-h-[92dvh] sm:h-full sm:max-h-none" : "max-h-[92dvh]")}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ModalHeader({ title, sub, onClose, lead }: { title: string; sub?: string; onClose: () => void; lead?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--j-line)] bg-[rgba(3,14,21,0.85)] px-5 py-4 backdrop-blur-xl">
      {lead}
      <div className="min-w-0 flex-1">
        <div className="font-hud text-glow-soft truncate text-[0.95rem] font-semibold tracking-[0.18em] text-[var(--j-ice)]">{title}</div>
        {sub && <div className="mt-0.5 truncate text-[0.75rem] text-[var(--j-muted)]">{sub}</div>}
      </div>
      <IconButton onClick={onClose} aria-label="Close">
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  )
}

function Chips<T extends string | number>({ items, value, onPick, render }: { items: T[]; value: T; onPick: (v: T) => void; render?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {items.map((p) => (
        <button
          key={String(p)}
          type="button"
          onClick={() => onPick(p)}
          className={cn(
            "rounded-full border px-3 py-1 text-[0.8rem] capitalize transition-all duration-200",
            value === p
              ? "border-[rgba(41,230,255,0.6)] bg-[rgba(41,230,255,0.16)] text-white shadow-[0_0_14px_-4px_rgba(41,230,255,0.8)]"
              : "border-[var(--j-line)] text-[var(--j-muted)] hover:border-[var(--j-line-strong)] hover:text-white",
          )}
        >
          {render ? render(p) : String(p)}
        </button>
      ))}
    </div>
  )
}

function DateNote({ note, setNote, date, setDate }: { note: string; setNote: (v: string) => void; date: string; setDate: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input className="hud-input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
      <input className="hud-input w-[9.5rem]" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
    </div>
  )
}

function MetricForm({ metric, onDone }: { metric: string; onDone: (msg: string) => void }) {
  const def = METRIC_BY_ID[metric]
  const weightUnit = useJarvis((s) => s.settings.weightUnit)
  const lastWeight = useJarvis((s) => [...s.logs].reverse().find((l) => l.metric === "weight")?.value)
  const [value, setValue] = useState<number>(metric === "weight" ? (lastWeight ?? 170) : (def.quick ?? def.min))
  const [note, setNote] = useState("")
  const [date, setDate] = useState(todayKey())
  const isScale = def.unit === "/10"
  const unit = metric === "weight" ? weightUnit : def.unit
  const step = (dir: 1 | -1) => setValue((v) => Math.min(def.max, Math.max(def.min, +(v + dir * def.step).toFixed(2))))

  return (
    <form
      className="space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        onDone(applyAction({ type: "log_metric", metric, value, note: note || undefined, date }).label)
      }}
    >
      {isScale ? (
        <div className="space-y-3 text-center">
          <div className="font-hud text-glow text-5xl font-bold text-white">{value}</div>
          <Chips items={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} value={value} onPick={setValue} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4">
            <button type="button" className="icon-btn border border-[var(--j-line)]" onClick={() => step(-1)} aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </button>
            <div className="text-center">
              <input
                type="number"
                step={def.step}
                min={def.min}
                max={def.max}
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="font-hud text-glow w-36 bg-transparent text-center text-5xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`${def.label} value`}
              />
              <div className="hud-label mt-1">{unit}</div>
            </div>
            <button type="button" className="icon-btn border border-[var(--j-line)]" onClick={() => step(1)} aria-label="Increase">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {PRESETS[metric] && (
            <Chips items={PRESETS[metric]} value={value} onPick={setValue} render={(p) => `${p}${def.unit === "min" ? "m" : def.unit === "h" ? "h" : ""}`} />
          )}
        </>
      )}
      <DateNote note={note} setNote={setNote} date={date} setDate={setDate} />
      <HudButton variant="solid" type="submit" className="w-full py-3">
        Log {def.label}
      </HudButton>
    </form>
  )
}

function MoneyForm({ initialKind, onDone }: { initialKind: "expense" | "income"; onDone: (msg: string) => void }) {
  const currency = useJarvis((s) => s.settings.currency)
  const [kind, setKind] = useState(initialKind)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState(initialKind === "expense" ? "food" : "salary")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(todayKey())
  const cats = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  return (
    <form
      className="space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        const n = parseFloat(amount)
        if (!n) return
        onDone(applyAction({ type: "add_transaction", kind, amount: n, category, note: note || undefined, date }).label)
      }}
    >
      <div className="mx-auto grid w-56 grid-cols-2 rounded-full border border-[var(--j-line)] p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k)
              setCategory(k === "expense" ? "food" : "salary")
            }}
            className="relative rounded-full py-1.5 text-[0.8rem] font-semibold capitalize"
          >
            {kind === k && <motion.span layoutId="money-kind" className="absolute inset-0 rounded-full bg-[rgba(41,230,255,0.18)]" transition={SPRING} />}
            <span className={cn("relative", kind === k ? "text-white" : "text-[var(--j-muted)]")}>{k}</span>
          </button>
        ))}
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span className="font-hud text-3xl text-[var(--j-muted)]">{currency}</span>
        <input
          autoFocus
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          className="font-hud text-glow w-48 bg-transparent text-center text-5xl font-bold text-white outline-none placeholder:text-[var(--j-faint)]"
          aria-label="Amount"
        />
      </div>
      <Chips items={cats} value={category} onPick={setCategory} />
      <DateNote note={note} setNote={setNote} date={date} setDate={setDate} />
      <HudButton variant="solid" type="submit" className="w-full py-3" disabled={!parseFloat(amount)}>
        Record {kind}
      </HudButton>
    </form>
  )
}

function GratitudeForm({ onDone }: { onDone: (msg: string) => void }) {
  const [text, setText] = useState("")
  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onDone(applyAction({ type: "add_journal_entry", kind: "gratitude", text }).label)
      }}
    >
      <textarea
        autoFocus
        className="hud-input min-h-[110px] text-base"
        placeholder="Today I'm grateful for…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Gratitude"
      />
      <HudButton variant="solid" type="submit" className="w-full py-3" disabled={!text.trim()}>
        Save gratitude
      </HudButton>
    </form>
  )
}

/** Which forms a pillar's "+" offers. */
const pillarTabs = (pillar: PillarId): { id: string; label: string }[] => {
  if (pillar === "wealth")
    return [
      { id: "money:expense", label: "Expense" },
      { id: "money:income", label: "Income" },
    ]
  const metrics = metricsFor(pillar).map((m) => ({ id: m.id, label: m.label }))
  return pillar === "spirit" ? [{ id: "gratitude", label: "Gratitude" }, ...metrics] : metrics
}

export function QuickLogModal() {
  const { target, close, flash } = useQuickLog()
  const [tab, setTab] = useState<string>("")
  const done = (msg: string) => {
    close()
    flash(msg)
  }

  const tabs = target?.type === "pillar" ? pillarTabs(target.pillar) : []
  useEffect(() => {
    if (target?.type === "pillar") setTab(pillarTabs(target.pillar)[0]?.id ?? "")
  }, [target])

  const active = target?.type === "pillar" ? tab : target?.type === "metric" ? target.metric : target ? `money:${target.kind}` : ""
  const title =
    target?.type === "pillar" ? `Log ${PILLAR_BY_ID[target.pillar].name}` : target?.type === "metric" ? `Log ${METRIC_BY_ID[target.metric]?.label}` : "Money"

  return (
    <Modal open={!!target} onClose={close}>
      {target && (
        <>
          <ModalHeader title={title.toUpperCase()} onClose={close} />
          {tabs.length > 1 && (
            <div className="no-scrollbar flex gap-1 overflow-x-auto px-5 pt-4">
              {tabs.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className="relative shrink-0 rounded-full px-3 py-1.5 text-[0.8rem] font-medium">
                  {active === t.id && <motion.span layoutId="log-tab" className="absolute inset-0 rounded-full bg-[rgba(41,230,255,0.14)]" transition={SPRING} />}
                  <span className={cn("relative", active === t.id ? "text-white" : "text-[var(--j-muted)]")}>{t.label}</span>
                </button>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {active.startsWith("money:") ? (
                <MoneyForm initialKind={active === "money:income" ? "income" : "expense"} onDone={done} />
              ) : active === "gratitude" ? (
                <GratitudeForm onDone={done} />
              ) : active && METRIC_BY_ID[active] ? (
                <MetricForm metric={active} onDone={done} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </Modal>
  )
}

export function Toast() {
  const toast = useQuickLog((s) => s.toast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={SPRING}
            className="rounded-full border border-[var(--j-line-strong)] bg-[rgba(3,18,26,0.92)] px-4 py-2 text-[0.8rem] font-medium text-[var(--j-ice)] shadow-[0_10px_40px_-10px_rgba(41,230,255,0.5)] backdrop-blur-xl"
          >
            <span className="mr-1.5 text-[var(--j-cyan)]">✓</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
