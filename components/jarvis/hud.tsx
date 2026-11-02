"use client"

import { motion } from "framer-motion"
import { Plus } from "lucide-react"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/* ─────────────── Surfaces ─────────────── */

export function HudPanel({
  children,
  className,
  title,
  right,
  onClick,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  right?: ReactNode
  onClick?: () => void
}) {
  return (
    <section
      className={cn("glass flex flex-col", onClick && "glass-hover", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && onClick() : undefined}
    >
      {(title || right) && (
        <header className="relative z-[1] flex items-center justify-between gap-2 px-4 pt-3.5">
          <div className="hud-label min-w-0 truncate">{title}</div>
          {right}
        </header>
      )}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

/* ─────────────── Numbers ─────────────── */

/** Counts smoothly toward `value` whenever it changes. */
export function AnimatedNumber({ value, format = (v) => String(Math.round(v)), duration = 900 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const current = useRef(value)
  useEffect(() => {
    const from = current.current
    const to = value
    if (from === to) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const v = from + (to - from) * (1 - Math.pow(1 - p, 3))
      current.current = v
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{format(display)}</>
}

/* ─────────────── Gauges ─────────────── */

export const scoreTone = (v: number | null) =>
  v === null ? "var(--j-faint)" : v < 35 ? "var(--j-red)" : v < 60 ? "var(--j-amber)" : "var(--j-cyan)"

export function Ring({
  value,
  size = 34,
  stroke = 3,
  label,
  className,
}: {
  value: number | null
  size?: number
  stroke?: number
  label?: ReactNode
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value))
  const tone = scoreTone(value)
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(41,230,255,0.1)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 3px ${tone})` }}
        />
      </svg>
      <span className="font-hud tabular absolute text-[0.56rem] font-semibold" style={{ color: tone }}>
        {label ?? (value === null ? "–" : value)}
      </span>
    </div>
  )
}

/** Smooth progress bar; `value` is a 0..1+ fraction. Amber below 50% unless `warn` is off. */
export function Bar({ value, warn = true, tone: toneOverride, marker, className }: { value: number; warn?: boolean; tone?: string; marker?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const tone = toneOverride ?? (!warn || value >= 0.5 ? "var(--j-cyan)" : "var(--j-amber)")
  return (
    <div
      className={cn("relative h-[5px] w-full rounded-full bg-[rgba(41,230,255,0.08)]", className)}
      role="meter"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${tone} 55%, transparent), ${tone})`, boxShadow: `0 0 10px -1px ${tone}` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
      {marker !== undefined && (
        <span className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full bg-white/80" style={{ left: `${marker * 100}%` }} title="Month elapsed" />
      )}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="hud-label truncate">{label}</div>
      <div className="font-hud tabular truncate text-lg font-semibold" style={{ color: tone ?? "var(--j-text)" }}>
        {value}
      </div>
      {sub && <div className="truncate text-[0.72rem] text-[var(--j-muted)]">{sub}</div>}
    </div>
  )
}

/* ─────────────── Sparkline ─────────────── */

/** Catmull-Rom → cubic Bézier, for gently curved lines. */
function curve(points: [number, number][]) {
  if (points.length === 0) return ""
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

export function Sparkline({
  data,
  height = 44,
  format = (v: number) => String(v),
  target,
  className,
}: {
  data: { date: string; value: number | null }[]
  height?: number
  format?: (v: number) => string
  target?: number
  className?: string
}) {
  const id = useId().replace(/:/g, "")
  const [hover, setHover] = useState<number | null>(null)
  const W = 200
  const H = height
  const pad = 5
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null)
  const max = Math.max(1, target ?? 0, ...vals) * 1.12
  const n = data.length
  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2))
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2)

  // One continuous line through the logged days; empty days are skipped rather than breaking it.
  const pts = data.flatMap((d, i) => (d.value === null ? [] : [[x(i), y(d.value)] as [number, number]]))
  const runs = pts.length ? [pts] : []
  let lastIdx = -1
  data.forEach((d, i) => d.value !== null && (lastIdx = i))
  const h = hover !== null ? data[hover] : null

  return (
    <div className={cn("relative w-full", className)} style={{ height: H }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(41,230,255,0.28)" />
            <stop offset="100%" stopColor="rgba(41,230,255,0)" />
          </linearGradient>
        </defs>
        {target !== undefined && target > 0 && (
          <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="rgba(196,247,255,0.22)" strokeDasharray="2 5" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
        {runs.map((r, i) =>
          r.length > 1 ? (
            <path key={`a${i}`} d={`${curve(r)} L${r[r.length - 1][0]},${H} L${r[0][0]},${H} Z`} fill={`url(#g${id})`} />
          ) : null,
        )}
        {runs.map((r, i) => (
          <motion.path
            key={`l${i}`}
            d={curve(r)}
            fill="none"
            stroke="var(--j-cyan)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: "drop-shadow(0 0 3px rgba(41,230,255,0.7))" }}
          />
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgba(196,247,255,0.35)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {data.map((_, i) => (
          <rect key={`h${i}`} x={x(i) - W / n / 2} y={0} width={W / n} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
      </svg>
      {/* Point markers in HTML so the stretched SVG doesn't squash them. */}
      {data.map((d, i) =>
        d.value !== null && (i === lastIdx || i === hover) ? (
          <span
            key={`p${i}`}
            className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(41,230,255,0.7)]"
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(d.value) / H) * 100}%` }}
          />
        ) : null,
      )}
      {h && (
        <div
          className="pointer-events-none absolute -top-7 z-10 whitespace-nowrap rounded-full border border-[var(--j-line-strong)] bg-[#03141ced] px-2 py-0.5 text-[0.68rem] text-[var(--j-ice)] backdrop-blur"
          style={{ left: `${(x(hover!) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          {h.date.slice(5).replace("-", "/")} · {h.value === null ? "no data" : format(h.value)}
        </div>
      )}
    </div>
  )
}

/* ─────────────── Controls ─────────────── */

export function HudButton({
  children,
  variant,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "danger" | "ghost" }) {
  return (
    <button type="button" data-variant={variant} className={cn("hud-btn", className)} {...rest}>
      {children}
    </button>
  )
}

export function IconButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn("icon-btn", className)} {...rest}>
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="hud-toggle" onClick={() => onChange(!checked)} />
}

/** Small pill that starts a log entry. */
export function LogChip({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 rounded-full border border-[var(--j-line)] bg-[rgba(41,230,255,0.04)] px-2.5 py-1 text-[0.72rem] font-medium text-[var(--j-muted)] transition-colors duration-200 hover:border-[var(--j-line-strong)] hover:bg-[rgba(41,230,255,0.1)] hover:text-white"
    >
      <Plus className="h-3 w-3" />
      {children}
    </button>
  )
}

/** A "+ Add" pill that turns into a text field. */
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
        className="hud-input py-1.5 text-sm"
        aria-label={placeholder}
      />
    </form>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-4 text-center text-[0.8rem] text-[var(--j-faint)]">{children}</div>
}

export function Dot({ tone = "var(--j-cyan)", pulse }: { tone?: string; pulse?: boolean }) {
  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", pulse && "j-pulse")} style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
}
