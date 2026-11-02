"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { PILLARS } from "@/lib/jarvis/pillars"
import type { Scores } from "@/lib/jarvis/scoring"
import type { PillarId } from "@/lib/jarvis/types"
import type { VoiceState } from "@/lib/jarvis/voice"
import { scoreTone } from "./hud"

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: r * Math.cos(a), y: r * Math.sin(a) }
}

const arc = (r: number, start: number, end: number) => {
  const s = polar(r, start)
  const e = polar(r, end)
  const large = end - start > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

/** A trapezoid wedge between two radii (the reactor's coil segments). */
const wedge = (r1: number, r2: number, start: number, end: number) => {
  const a = polar(r2, start)
  const b = polar(r2, end)
  const c = polar(r1, end - 2)
  const d = polar(r1, start + 2)
  return `M ${a.x} ${a.y} A ${r2} ${r2} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${r1} ${r1} 0 0 0 ${d.x} ${d.y} Z`
}

const STATE_LABEL: Record<VoiceState, string> = {
  off: "LIFE INDEX",
  wake: "LIFE INDEX",
  command: "LISTENING",
  thinking: "PROCESSING",
  speaking: "SPEAKING",
}

export function ArcReactor({
  scores,
  life,
  voiceState = "off",
  level = 0,
  onSelect,
  size = 440,
  powered = true,
}: {
  scores: Scores
  life: number | null
  voiceState?: VoiceState
  level?: number
  onSelect?: (p: PillarId) => void
  size?: number | string
  powered?: boolean
}) {
  const [hover, setHover] = useState<PillarId | null>(null)
  const seg = 360 / PILLARS.length
  const gap = 4
  const active = voiceState === "command" || voiceState === "thinking" || voiceState === "speaking"
  const hovered = hover ? PILLARS.find((p) => p.id === hover)! : null
  const centerValue = hovered ? scores[hovered.id] : life
  const glow = active ? 0.55 + level * 0.45 : 0.55

  return (
    <div className="relative mx-auto aspect-square w-full select-none" style={{ maxWidth: size }}>
      <svg viewBox="-220 -220 440 440" className="h-full w-full overflow-visible" role="img" aria-label={`Life index ${life ?? "no data"}`}>
        <defs>
          <radialGradient id="core" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(90)">
            <stop offset="0%" stopColor="rgba(220,252,255,0.55)" />
            <stop offset="35%" stopColor="rgba(41,230,255,0.28)" />
            <stop offset="100%" stopColor="rgba(41,230,255,0)" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer tick ring */}
        <g className="j-spin" style={{ ["--dur" as string]: active ? "24s" : "90s" }} opacity={powered ? 0.8 : 0.15}>
          {Array.from({ length: 120 }, (_, i) => {
            const long = i % 10 === 0
            const a = polar(212, i * 3)
            const b = polar(long ? 200 : 206, i * 3)
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--j-cyan)"
                strokeWidth={long ? 1.6 : 0.8}
                opacity={long ? 0.9 : 0.45}
              />
            )
          })}
        </g>

        {/* Pillar ring */}
        {PILLARS.map((p, i) => {
          const start = i * seg + gap / 2
          const end = (i + 1) * seg - gap / 2
          const v = scores[p.id]
          const fillEnd = start + ((end - start) * (v ?? 0)) / 100
          const tone = scoreTone(v)
          const mid = polar(168, (start + end) / 2)
          const isHover = hover === p.id
          return (
            <g
              key={p.id}
              className="cursor-pointer"
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect?.(p.id)}
              role="button"
              aria-label={`${p.name} ${v ?? "no data"}`}
            >
              <path d={arc(188, start, end)} fill="none" stroke="transparent" strokeWidth={46} />
              <motion.path
                d={arc(188, start, end)}
                fill="none"
                stroke="rgba(41,230,255,0.13)"
                strokeWidth={isHover ? 14 : 10}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: powered ? 1 : 0 }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
              />
              {v !== null && v > 0 && (
                <motion.path
                  d={arc(188, start, Math.max(start + 0.5, fillEnd))}
                  fill="none"
                  stroke={tone}
                  strokeWidth={isHover ? 14 : 10}
                  filter="url(#glow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: powered ? 1 : 0 }}
                  transition={{ duration: 1.2, delay: 0.6 + i * 0.1, ease: "easeOut" }}
                />
              )}
              <text
                x={mid.x}
                y={mid.y - 3}
                textAnchor="middle"
                className="font-hud"
                fontSize={9}
                fill={isHover ? "#fff" : "var(--j-muted)"}
                style={{ letterSpacing: "0.18em" }}
              >
                {p.short}
              </text>
              <text x={mid.x} y={mid.y + 9} textAnchor="middle" className="font-hud" fontSize={10} fontWeight={700} fill={tone}>
                {v ?? "--"}
              </text>
            </g>
          )
        })}

        {/* Dashed counter-rotating ring */}
        <g className="j-spin-rev" style={{ ["--dur" as string]: active ? "10s" : "40s" }}>
          <circle r={146} fill="none" stroke="var(--j-cyan)" strokeWidth={1.2} strokeDasharray="2 7" opacity={0.65} />
        </g>
        {/* Broken bracket ring */}
        <g className="j-spin" style={{ ["--dur" as string]: active ? "6s" : "28s" }}>
          {/* invisible full circle keeps the rotation centred */}
          <circle r={139} fill="none" />
          {/* Layered strokes fake the glow; a blur filter here would re-render every frame while spinning. */}
          {[0, 120, 240].map((a) => (
            <g key={a}>
              <path d={arc(136, a + 8, a + 92)} fill="none" stroke="var(--j-cyan)" strokeWidth={8} opacity={0.08} strokeLinecap="round" />
              <path d={arc(136, a + 8, a + 92)} fill="none" stroke="var(--j-cyan)" strokeWidth={4} opacity={0.18} strokeLinecap="round" />
              <path d={arc(136, a + 8, a + 92)} fill="none" stroke="var(--j-cyan)" strokeWidth={2} opacity={0.95} strokeLinecap="round" />
            </g>
          ))}
          {[60, 180, 300].map((a) => (
            <circle key={a} cx={polar(136, a).x} cy={polar(136, a).y} r={2.2} fill="var(--j-ice)" />
          ))}
        </g>

        {/* Reactor coils */}
        <g className="j-spin-rev" style={{ ["--dur" as string]: "120s" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <motion.path
              key={i}
              d={wedge(96, 122, i * 36 + 3, i * 36 + 33)}
              fill="rgba(41,230,255,0.08)"
              stroke="var(--j-cyan)"
              strokeWidth={1.2}
              initial={{ opacity: 0 }}
              animate={{ opacity: powered ? glow + (i % 2) * 0.12 : 0.05 }}
              transition={{ duration: active ? 0.12 : 0.8, delay: powered && !active ? 0.9 + i * 0.05 : 0 }}
            />
          ))}
        </g>

        <motion.circle
          r={90}
          fill="none"
          stroke="var(--j-cyan)"
          strokeWidth={1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: powered ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          opacity={0.8}
        />

        {/* Core glow */}
        <motion.circle
          r={88}
          fill="url(#core)"
          animate={{ opacity: powered ? 0.75 + level * 0.25 : 0.1, scale: 1 + (active ? level * 0.06 : 0) }}
          transition={{ duration: 0.12 }}
        />
        <circle r={64} fill="rgba(1,8,14,0.72)" stroke="rgba(41,230,255,0.4)" strokeWidth={1} />
        <circle r={58} fill="none" stroke="rgba(41,230,255,0.18)" strokeWidth={6} strokeDasharray="1 3" />
      </svg>

      {/* Center readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-hud text-[0.5rem] tracking-[0.3em] text-[var(--j-muted)] sm:text-[0.55rem]">
          {hovered ? hovered.name.toUpperCase() : STATE_LABEL[voiceState]}
        </div>
        <div
          className="font-hud text-glow text-[2.2rem] font-bold leading-none sm:text-[2.8rem]"
          style={{ color: hovered ? scoreTone(centerValue) : "#eaffff" }}
        >
          {voiceState === "thinking" && !hovered ? (
            <span className="j-pulse">···</span>
          ) : centerValue === null ? (
            "--"
          ) : (
            centerValue
          )}
        </div>
        <div className="font-mono-hud mt-0.5 text-[0.55rem] uppercase tracking-[0.25em] text-[var(--j-faint)]">
          {hovered ? hovered.tagline : life === null ? "awaiting telemetry" : "of 100"}
        </div>
      </div>
    </div>
  )
}
