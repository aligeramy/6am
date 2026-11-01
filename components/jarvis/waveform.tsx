"use client"

import { useEffect, useRef } from "react"
import type { VoiceState } from "@/lib/jarvis/voice"

/** Mirrored audio-style bars. Amplitude follows the voice engine's state and level. */
export function Waveform({ state, level, bars = 32, className }: { state: VoiceState; level: number; bars?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef({ state, level })
  live.current = { state, level }

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    let raf = 0
    let t = 0
    const smooth = new Array(bars).fill(0)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const frame = () => {
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== w * dpr) {
        c.width = w * dpr
        c.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      t += 0.06
      const { state: s, level: lv } = live.current
      const amp =
        s === "speaking" ? 0.35 + lv * 0.65 : s === "command" ? 0.25 + lv * 0.6 : s === "thinking" ? 0.3 : s === "wake" ? 0.08 : 0.04
      const bw = w / bars
      for (let i = 0; i < bars; i++) {
        const center = 1 - Math.abs(i - bars / 2) / (bars / 2)
        let target: number
        if (s === "thinking") target = 0.15 + 0.5 * Math.max(0, Math.sin(t * 2 - i * 0.45)) * center
        else target = amp * center * (0.45 + 0.55 * Math.abs(Math.sin(t * 1.7 + i * 0.9) * Math.cos(t * 0.6 + i * 0.3)))
        if (s === "speaking" || s === "command") target *= 0.6 + Math.random() * 0.6
        smooth[i] += (target - smooth[i]) * 0.25
        const bh = Math.max(1.5, smooth[i] * h)
        const x = i * bw + bw * 0.2
        ctx.fillStyle = `rgba(41,230,255,${0.35 + smooth[i] * 0.65})`
        ctx.shadowColor = "rgba(41,230,255,0.9)"
        ctx.shadowBlur = 6
        ctx.fillRect(x, (h - bh) / 2, bw * 0.6, bh)
      }
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [bars])

  return <canvas ref={ref} className={className} aria-hidden />
}
