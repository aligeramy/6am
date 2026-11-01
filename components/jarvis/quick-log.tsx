"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import { useEffect, useState } from "react"
import { create } from "zustand"
import { applyAction } from "@/lib/jarvis/actions"
import { todayKey } from "@/lib/jarvis/dates"
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METRIC_BY_ID } from "@/lib/jarvis/pillars"
import { useJarvis } from "@/lib/jarvis/store"
import { cn } from "@/lib/utils"
import { Corners, HudButton } from "./hud"

type Target = { type: "metric"; metric: string } | { type: "money"; kind: "expense" | "income" } | null

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

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(0,6,10,0.7)] backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={cn(
              "hud-panel box-glow relative max-h-[92dvh] w-full overflow-hidden",
              wide ? "sm:max-w-5xl" : "sm:max-w-md",
            )}
          >
            <Corners />
            <div className="hud-scan" />
            <div className="hud-scroll relative z-[1] max-h-[92dvh] overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ModalHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--j-line)] px-4 py-3">
      <div>
        <div className="font-hud text-glow text-sm font-bold uppercase tracking-[0.25em] text-[var(--j-ice)]">{title}</div>
        {sub && <div className="font-mono-hud mt-0.5 text-[0.65rem] uppercase tracking-[0.2em] text-[var(--j-faint)]">{sub}</div>}
      </div>
      <HudButton variant="ghost" onClick={onClose} aria-label="Close" className="px-1.5">
        <X className="h-4 w-4" />
      </HudButton>
    </div>
  )
}

function MetricForm({ metric, onDone }: { metric: string; onDone: (msg: string) => void }) {
  const def = METRIC_BY_ID[metric]
  const weightUnit = useJarvis((s) => s.settings.weightUnit)
  const lastWeight = useJarvis((s) => [...s.logs].reverse().find((l) => l.metric === "weight")?.value)
  const [value, setValue] = useState<number>(metric === "weight" ? lastWeight ?? 170 : def.quick ?? def.min)
  const [note, setNote] = useState("")
  const [date, setDate] = useState(todayKey())
  const isScale = def.unit === "/10"
  const unit = metric === "weight" ? weightUnit : def.unit

  const submit = () => {
    const r = applyAction({ type: "log_metric", metric, value, note: note || undefined, date })
    onDone(r.label)
  }

  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {isScale ? (
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue(n)}
              className={cn(
                "font-hud border py-2 text-sm transition",
                value === n ? "border-[var(--j-cyan)] bg-[rgba(41,230,255,0.2)] text-white shadow-[0_0_10px_rgba(41,230,255,0.4)]" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3">
            <HudButton onClick={() => setValue((v) => Math.max(def.min, +(v - def.step).toFixed(2)))} aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </HudButton>
            <div className="text-center">
              <input
                type="number"
                step={def.step}
                min={def.min}
                max={def.max}
                value={value}
                onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                className="font-hud text-glow w-32 bg-transparent text-center text-4xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`${def.label} value`}
              />
              <div className="hud-label">{unit}</div>
            </div>
            <HudButton onClick={() => setValue((v) => Math.min(def.max, +(v + def.step).toFixed(2)))} aria-label="Increase">
              <Plus className="h-4 w-4" />
            </HudButton>
          </div>
          {PRESETS[metric] && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {PRESETS[metric].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue(p)}
                  className={cn(
                    "font-mono-hud border px-2.5 py-1 text-xs transition",
                    value === p ? "border-[var(--j-cyan)] text-white" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
                  )}
                >
                  {p}
                  {def.unit === "min" ? "m" : def.unit === "h" ? "h" : ""}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="hud-input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        <input className="hud-input w-[9.5rem]" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </div>
      <HudButton variant="solid" type="submit" className="w-full py-2.5">
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
      className="space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        const n = parseFloat(amount)
        if (!n) return
        const r = applyAction({ type: "add_transaction", kind, amount: n, category, note: note || undefined, date })
        onDone(r.label)
      }}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k)
              setCategory(k === "expense" ? "food" : "salary")
            }}
            className={cn(
              "font-hud border py-2 text-[0.65rem] uppercase tracking-[0.25em] transition",
              kind === k ? "border-[var(--j-cyan)] bg-[rgba(41,230,255,0.15)] text-white" : "border-[var(--j-line)] text-[var(--j-muted)]",
            )}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex items-baseline justify-center gap-1">
        <span className="font-hud text-2xl text-[var(--j-muted)]">{currency}</span>
        <input
          autoFocus
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          className="font-hud text-glow w-44 bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-[var(--j-faint)]"
          aria-label="Amount"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "font-mono-hud border px-2 py-1 text-[0.68rem] capitalize transition",
              category === c ? "border-[var(--j-cyan)] text-white" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="hud-input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        <input className="hud-input w-[9.5rem]" type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
      </div>
      <HudButton variant="solid" type="submit" className="w-full py-2.5" disabled={!parseFloat(amount)}>
        Record {kind}
      </HudButton>
    </form>
  )
}

export function QuickLogModal() {
  const { target, close, flash } = useQuickLog()
  const done = (msg: string) => {
    close()
    flash(msg)
  }
  const title =
    target?.type === "metric" ? `Log ${METRIC_BY_ID[target.metric]?.label}` : target?.type === "money" ? "Money transfer" : ""
  return (
    <Modal open={!!target} onClose={close}>
      {target && (
        <>
          <ModalHeader title={title} sub="Manual telemetry entry" onClose={close} />
          {target.type === "metric" ? <MetricForm metric={target.metric} onDone={done} /> : <MoneyForm initialKind={target.kind} onDone={done} />}
        </>
      )}
    </Modal>
  )
}

export function Toast() {
  const toast = useQuickLog((s) => s.toast)
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="font-hud box-glow fixed left-1/2 top-16 z-[70] -translate-x-1/2 bg-[rgba(2,20,28,0.95)] px-4 py-2 text-[0.65rem] uppercase tracking-[0.25em] text-[var(--j-ice)]"
        >
          ✓ {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
