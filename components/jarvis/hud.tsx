"use client"

import { useId, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/* ─────────────── Frame ─────────────── */

export function Corners({ size = 12 }: { size?: number }) {
  const s = { width: size, height: size }
  return (
    <>
      <span className="hud-corner left-0 top-0 border-l border-t" style={s} />
      <span className="hud-corner right-0 top-0 border-r border-t" style={{ ...s, right: 14, opacity: 0.5 }} />
      <span className="hud-corner bottom-0 left-0 border-b border-l" style={{ ...s, left: 14, opacity: 0.5 }} />
      <span className="hud-corner bottom-0 right-0 border-b border-r" style={s} />
    </>
  )
}

export function HudPanel({
  children,
  className,
  title,
  index,
  right,
  onTitleClick,
  scan = false,
}: {
  children: ReactNode
  className?: string
  title?: string
  index?: string
  right?: ReactNode
  onTitleClick?: () => void
  scan?: boolean
}) {
  return (
    <section className={cn("hud-panel flex flex-col", className)}>
      <Corners />
      {scan && <div className="hud-scan" />}
      {title && (
        <header className="relative z-[1] flex items-center justify-between gap-2 border-b border-[var(--j-line)] px-3 py-2">
          <button
            type="button"
            onClick={onTitleClick}
            className={cn("group flex min-w-0 items-center gap-2 text-left", onTitleClick && "cursor-pointer")}
          >
            {index && <span className="font-mono-hud text-[0.65rem] text-[var(--j-faint)]">{index} //</span>}
            <span className="font-hud truncate text-[0.7rem] font-semibold uppercase text-[var(--j-ice)] text-glow-soft group-hover:text-white">
              {title}
            </span>
          </button>
          {right}
        </header>
      )}
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
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
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(41,230,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          strokeLinecap="butt"
          style={{ filter: `drop-shadow(0 0 3px ${tone})`, transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <span className="font-hud absolute text-[0.55rem] font-bold" style={{ color: tone }}>
        {label ?? (value === null ? "--" : value)}
      </span>
    </div>
  )
}

/** Segmented bar; `value` is a 0..1+ fraction of target. Warning tone below 50%. */
export function SegBar({
  value,
  segments = 18,
  warn = true,
  tone: toneOverride,
  className,
}: {
  value: number
  segments?: number
  warn?: boolean
  tone?: string
  className?: string
}) {
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments)
  const tone = toneOverride ?? (!warn || value >= 0.5 ? "var(--j-cyan)" : "var(--j-amber)")
  return (
    <div className={cn("flex h-2 gap-[2px]", className)} role="meter" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="flex-1 transition-all duration-500"
          style={{
            background: i < lit ? tone : "rgba(41,230,255,0.1)",
            boxShadow: i < lit ? `0 0 5px ${tone}` : undefined,
            transitionDelay: `${i * 18}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="hud-label truncate">{label}</div>
      <div className="font-hud truncate text-base font-semibold text-glow-soft" style={{ color: tone ?? "var(--j-text)" }}>
        {value}
      </div>
      {sub && <div className="font-mono-hud truncate text-[0.65rem] text-[var(--j-muted)]">{sub}</div>}
    </div>
  )
}

/* ─────────────── Sparkline with hover ─────────────── */

export function Sparkline({
  data,
  height = 44,
  format = (v: number) => String(v),
  target,
  className,
  area = true,
}: {
  data: { date: string; value: number | null }[]
  height?: number
  format?: (v: number) => string
  target?: number
  className?: string
  area?: boolean
}) {
  const id = useId().replace(/:/g, "")
  const [hover, setHover] = useState<number | null>(null)
  const W = 200
  const H = height
  const pad = 4
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null)
  const max = Math.max(1, target ?? 0, ...vals) * 1.1
  const n = data.length
  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2))
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2)

  // Break the line at gaps (null days) rather than drawing through them.
  const segments: string[] = []
  let cur = ""
  data.forEach((d, i) => {
    if (d.value === null) {
      if (cur) segments.push(cur)
      cur = ""
    } else {
      cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)} `
    }
  })
  if (cur) segments.push(cur)
  const firstIdx = data.findIndex((d) => d.value !== null)
  let lastIdx = -1
  data.forEach((d, i) => d.value !== null && (lastIdx = i))
  const areaPath =
    area && firstIdx >= 0
      ? `M${x(firstIdx)},${H - pad} ` +
        data
          .map((d, i) => (d.value !== null ? `L${x(i).toFixed(1)},${y(d.value).toFixed(1)}` : ""))
          .join(" ") +
        ` L${x(lastIdx)},${H - pad} Z`
      : ""

  const h = hover !== null ? data[hover] : null

  return (
    <div className={cn("relative w-full", className)} style={{ height: H }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(41,230,255,0.35)" />
            <stop offset="100%" stopColor="rgba(41,230,255,0)" />
          </linearGradient>
        </defs>
        <line x1={0} x2={W} y1={H - pad} y2={H - pad} stroke="rgba(41,230,255,0.15)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {target !== undefined && target > 0 && (
          <line
            x1={0}
            x2={W}
            y1={y(target)}
            y2={y(target)}
            stroke="rgba(185,246,255,0.35)"
            strokeDasharray="3 4"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {areaPath && <path d={areaPath} fill={`url(#g${id})`} />}
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="var(--j-cyan)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px rgba(41,230,255,0.8))" }}
          />
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="rgba(185,246,255,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
        {data.map((_, i) => (
          <rect
            key={`h${i}`}
            x={x(i) - W / n / 2}
            y={0}
            width={W / n}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {/* Point markers live in HTML so the stretched SVG doesn't squash them into ovals. */}
      {data.map((d, i) =>
        d.value !== null && (i === lastIdx || i === hover) ? (
          <span
            key={`p${i}`}
            className="pointer-events-none absolute h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--j-cyan)] bg-white shadow-[0_0_6px_var(--j-cyan)]"
            style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(d.value) / H) * 100}%` }}
          />
        ) : null,
      )}
      {h && (
        <div
          className="font-mono-hud pointer-events-none absolute -top-6 z-10 whitespace-nowrap border border-[var(--j-line-strong)] bg-[#021219ee] px-1.5 py-0.5 text-[0.62rem] text-[var(--j-ice)]"
          style={{ left: `${(x(hover!) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          {h.date.slice(5)} · {h.value === null ? "no data" : format(h.value)}
        </div>
      )}
    </div>
  )
}

/* ─────────────── Misc ─────────────── */

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

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="hud-toggle" onClick={() => onChange(!checked)} />
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="font-mono-hud py-3 text-center text-[0.7rem] uppercase tracking-widest text-[var(--j-faint)]">{children}</div>
}

export function Dot({ tone = "var(--j-cyan)", pulse }: { tone?: string; pulse?: boolean }) {
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", pulse && "j-pulse")}
      style={{ background: tone, boxShadow: `0 0 6px ${tone}` }}
    />
  )
}
