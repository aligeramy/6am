"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ChevronUp, Mic, MicOff, SendHorizontal, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { sendCommand } from "@/lib/jarvis/brain"
import { useJarvis } from "@/lib/jarvis/store"
import type { ChatMessage } from "@/lib/jarvis/types"
import { voice, type VoiceState } from "@/lib/jarvis/voice"
import { cn } from "@/lib/utils"
import { HudButton, HudPanel } from "./hud"
import { Waveform } from "./waveform"

const SUGGESTIONS = ["Status report", "Slept 7.5 hours", "Spent $24 on lunch", "2 hours in the studio", "Grateful for my family", "Call me Boss"]

function Typewriter({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length)
  useEffect(() => {
    if (!animate) {
      setN(text.length)
      return
    }
    setN(0)
    const step = Math.max(1, Math.round(text.length / 90))
    const t = setInterval(() => {
      setN((x) => {
        if (x >= text.length) {
          clearInterval(t)
          return x
        }
        return x + step
      })
    }, 16)
    return () => clearInterval(t)
  }, [text, animate])
  return <span className={cn(n < text.length && "j-caret")}>{text.slice(0, n)}</span>
}

function Message({ m, latest }: { m: ChatMessage; latest: boolean }) {
  const isUser = m.role === "user"
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-2", isUser && "justify-end")}>
      {!isUser && <span className="font-hud mt-[3px] shrink-0 text-[0.55rem] tracking-[0.2em] text-[var(--j-cyan)]">JARVIS</span>}
      <div className={cn("min-w-0 max-w-[88%]", isUser && "text-right")}>
        <div
          className={cn(
            "text-[0.86rem] leading-snug",
            isUser ? "font-mono-hud text-[var(--j-muted)]" : "text-[var(--j-text)]",
          )}
        >
          {isUser ? <span>&gt; {m.text}</span> : <Typewriter text={m.text} animate={latest && Date.now() - m.ts < 4000} />}
        </div>
        {m.actions && m.actions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.actions.map((a, i) => (
              <span
                key={i}
                className="font-mono-hud border px-1.5 py-[1px] text-[0.6rem] uppercase tracking-wider"
                style={{
                  borderColor: a.ok ? "rgba(41,230,255,0.4)" : "rgba(255,179,64,0.5)",
                  color: a.ok ? "var(--j-cyan)" : "var(--j-amber)",
                  background: a.ok ? "rgba(41,230,255,0.06)" : "rgba(255,179,64,0.06)",
                }}
              >
                {a.ok ? "✓" : "!"} {a.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function useConsole(online: boolean) {
  const [text, setText] = useState("")
  const submit = (value?: string) => {
    const v = (value ?? text).trim()
    if (!v) return
    setText("")
    void sendCommand(v, online)
  }
  return { text, setText, submit }
}

function MicButton({ state, size = "md" }: { state: VoiceState; size?: "md" | "lg" }) {
  const listening = state === "command"
  return (
    <button
      type="button"
      onClick={() => (listening ? voice.cancelCommand() : voice.beginCommand())}
      aria-label={listening ? "Stop listening" : "Speak a command"}
      title={listening ? "Stop listening" : "Speak a command"}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border transition-all",
        size === "lg" ? "h-11 w-11" : "h-9 w-9",
        listening
          ? "border-[var(--j-cyan)] bg-[rgba(41,230,255,0.25)] text-white shadow-[0_0_18px_rgba(41,230,255,0.7)]"
          : "border-[var(--j-line-strong)] bg-[rgba(41,230,255,0.06)] text-[var(--j-ice)] hover:bg-[rgba(41,230,255,0.15)]",
      )}
    >
      {listening && <span className="absolute inset-0 animate-ping rounded-full border border-[var(--j-cyan)] opacity-60" />}
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  )
}

function InputRow({
  online,
  state,
  interim,
  inputRef,
}: {
  online: boolean
  state: VoiceState
  interim: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const { text, setText, submit } = useConsole(online)
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <MicButton state={state} />
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={state === "command" && interim ? interim : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={state === "command" ? "Listening…" : state === "wake" ? "Say “Jarvis…” or type a command" : "Speak or type a command"}
          className="hud-input pr-9"
          aria-label="Command"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[var(--j-muted)] hover:text-[var(--j-cyan)]"
          aria-label="Send"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}

function Transcript({ online, className }: { online: boolean; className?: string }) {
  const chat = useJarvis((s) => s.chat)
  const address = useJarvis((s) => s.settings.address)
  const box = useRef<HTMLDivElement>(null)
  const { submit } = useConsole(online)
  useEffect(() => {
    const el = box.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [chat.length])

  return (
    <div ref={box} className={cn("hud-scroll flex flex-col gap-2.5 overflow-y-auto px-3 py-2", className)}>
      {chat.length === 0 && (
        <div className="py-2">
          <div className="text-[0.86rem] text-[var(--j-text)]">
            <span className="font-hud mr-2 text-[0.55rem] tracking-[0.2em] text-[var(--j-cyan)]">JARVIS</span>
            All systems online, {address}. Tell me what you did today, or ask how things are going.
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="font-mono-hud border border-[var(--j-line)] px-2 py-1 text-[0.65rem] text-[var(--j-muted)] transition hover:border-[var(--j-cyan)] hover:text-[var(--j-ice)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {chat.map((m, i) => (
        <Message key={m.id} m={m} latest={i === chat.length - 1} />
      ))}
    </div>
  )
}

export function ConsolePanel({
  online,
  state,
  level,
  interim,
  error,
  inputRef,
  className,
}: {
  online: boolean
  state: VoiceState
  level: number
  interim: string
  error: string | null
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
}) {
  const clearChat = useJarvis((s) => s.clearChat)
  return (
    <HudPanel
      title="Command console"
      index="00"
      className={className}
      right={
        <div className="flex items-center gap-2">
          <Waveform state={state} level={level} className="h-5 w-28" />
          <HudButton variant="ghost" onClick={clearChat} title="Clear transcript" aria-label="Clear transcript" className="px-1.5">
            <Trash2 className="h-3.5 w-3.5" />
          </HudButton>
        </div>
      }
    >
      <Transcript online={online} className="min-h-0 flex-1" />
      <div className="border-t border-[var(--j-line)] p-2">
        {error && <div className="font-mono-hud mb-1.5 text-[0.65rem] text-[var(--j-amber)]">{error}</div>}
        <InputRow online={online} state={state} interim={interim} inputRef={inputRef} />
      </div>
    </HudPanel>
  )
}

/** Mobile: docked command bar with an expandable transcript sheet. */
export function ConsoleDock({ online, state, level, interim, error }: { online: boolean; state: VoiceState; level: number; interim: string; error: string | null }) {
  const [open, setOpen] = useState(false)
  const last = useJarvis((s) => [...s.chat].reverse().find((m) => m.role === "jarvis"))
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--j-line-strong)] bg-[rgba(1,10,16,0.92)] backdrop-blur-lg lg:hidden">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "55vh" }} exit={{ height: 0 }} className="overflow-hidden">
            <Transcript online={online} className="h-full" />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="mb-2 flex w-full items-center gap-2 text-left">
          <Waveform state={state} level={level} className="h-4 w-14 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-[0.78rem] text-[var(--j-muted)]">
            {error ?? (state === "command" ? interim || "Listening…" : last?.text ?? "Tap to open the console")}
          </span>
          <ChevronUp className={cn("h-4 w-4 shrink-0 text-[var(--j-cyan)] transition", open && "rotate-180")} />
        </button>
        <InputRow online={online} state={state} interim={interim} />
      </div>
    </div>
  )
}
