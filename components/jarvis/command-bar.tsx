"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, ChevronUp, Mic, Square, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { sendCommand } from "@/lib/jarvis/brain"
import { useJarvis } from "@/lib/jarvis/store"
import type { ChatMessage } from "@/lib/jarvis/types"
import { voice, type VoiceState } from "@/lib/jarvis/voice"
import { cn } from "@/lib/utils"
import { IconButton } from "./hud"
import { Modal, ModalHeader } from "./quick-log"
import { Waveform } from "./waveform"

const SUGGESTIONS = ["Status report", "Slept 7.5 hours", "Spent $24 on lunch", "2 hours in the studio"]

function Typewriter({ text, animate }: { text: string; animate: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length)
  useEffect(() => {
    if (!animate) {
      setN(text.length)
      return
    }
    setN(0)
    const step = Math.max(1, Math.round(text.length / 70))
    const t = setInterval(() => {
      setN((x) => {
        if (x >= text.length) {
          clearInterval(t)
          return x
        }
        return x + step
      })
    }, 18)
    return () => clearInterval(t)
  }, [text, animate])
  return <span className={cn(n < text.length && "j-caret")}>{text.slice(0, n)}</span>
}

function Bubble({ m, latest }: { m: ChatMessage; latest: boolean }) {
  const isUser = m.role === "user"
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[88%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-3.5 py-2 text-left text-[0.92rem] leading-relaxed",
            isUser ? "rounded-br-md bg-[rgba(41,230,255,0.1)] text-[var(--j-ice)]" : "rounded-bl-md text-[var(--j-text)]",
          )}
        >
          {!isUser && <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-[2px] rounded-full bg-[var(--j-cyan)] shadow-[0_0_8px_var(--j-cyan)]" />}
          {isUser ? m.text : <Typewriter text={m.text} animate={latest && Date.now() - m.ts < 4000} />}
        </div>
        {m.actions && m.actions.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1 px-1", isUser && "justify-end")}>
            {m.actions.map((a, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="rounded-full border px-2 py-[2px] text-[0.7rem]"
                style={{
                  borderColor: a.ok ? "rgba(41,230,255,0.3)" : "rgba(255,181,71,0.4)",
                  color: a.ok ? "var(--j-cyan)" : "var(--j-amber)",
                  background: a.ok ? "rgba(41,230,255,0.06)" : "rgba(255,181,71,0.06)",
                }}
              >
                {a.ok ? "✓" : "!"} {a.label}
              </motion.span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/** Conversation as soft bubbles, newest at the bottom, fading out at the top edge. */
export function Conversation({ online, className, limit }: { online: boolean; className?: string; limit?: number }) {
  const chat = useJarvis((s) => s.chat)
  const address = useJarvis((s) => s.settings.address)
  const box = useRef<HTMLDivElement>(null)
  const shown = limit ? chat.slice(-limit) : chat
  useEffect(() => {
    const el = box.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [chat.length])

  return (
    <div ref={box} className={cn("no-scrollbar fade-y flex flex-col gap-2 overflow-y-auto px-1 pb-2 pt-8", className)}>
      <div className="flex-1" />
      {chat.length === 0 && (
        <div className="space-y-3 pb-1 text-center">
          <p className="text-[0.95rem] text-[var(--j-muted)]">All systems online, {address}. What can I do for you?</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void sendCommand(s, online)}
                className="rounded-full border border-[var(--j-line)] px-3 py-1 text-[0.78rem] text-[var(--j-muted)] transition-all duration-200 hover:border-[var(--j-line-strong)] hover:bg-[rgba(41,230,255,0.06)] hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {shown.map((m, i) => (
        <Bubble key={m.id} m={m} latest={i === shown.length - 1} />
      ))}
    </div>
  )
}

function MicOrb({ state, level }: { state: VoiceState; level: number }) {
  const listening = state === "command"
  const speaking = state === "speaking"
  return (
    <button
      type="button"
      onClick={() => (listening ? voice.cancelCommand() : speaking ? voice.stopSpeaking() : voice.beginCommand())}
      aria-label={listening ? "Stop listening" : speaking ? "Stop speaking" : "Speak a command"}
      title={listening ? "Stop listening" : speaking ? "Stop speaking" : "Speak a command  ( / to type )"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
    >
      {(listening || speaking) && (
        <>
          <span className="absolute inset-0 rounded-full border border-[var(--j-cyan)]" style={{ animation: "j-ring 1.6s ease-out infinite" }} />
          <span className="absolute inset-0 rounded-full border border-[var(--j-cyan)]" style={{ animation: "j-ring 1.6s ease-out 0.8s infinite" }} />
        </>
      )}
      <motion.span
        className="absolute inset-0 rounded-full"
        animate={{
          scale: listening || speaking ? 1 + level * 0.12 : 1,
          boxShadow: listening || speaking ? "0 0 28px 2px rgba(41,230,255,0.75)" : "0 0 18px -4px rgba(41,230,255,0.55)",
        }}
        transition={{ duration: 0.12 }}
        style={{
          background: listening || speaking ? "radial-gradient(circle at 35% 30%, #b8f8ff, #29e6ff 45%, #0a8fae)" : "radial-gradient(circle at 35% 30%, rgba(41,230,255,0.4), rgba(41,230,255,0.12) 60%, rgba(41,230,255,0.06))",
        }}
      />
      {listening || speaking ? <Square className="relative h-3.5 w-3.5 fill-[#00141b] text-[#00141b]" /> : <Mic className="relative h-[18px] w-[18px] text-[var(--j-ice)]" />}
    </button>
  )
}

export function CommandBar({
  online,
  state,
  level,
  interim,
  error,
  inputRef,
}: {
  online: boolean
  state: VoiceState
  level: number
  interim: string
  error: string | null
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [text, setText] = useState("")
  const submit = () => {
    const v = text.trim()
    if (!v) return
    setText("")
    void sendCommand(v, online)
  }
  const placeholder =
    state === "command" ? "Listening…" : state === "thinking" ? "Thinking…" : state === "wake" ? "Say “Jarvis…” or type" : "Ask JARVIS or log anything…"

  return (
    <div className="w-full">
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 px-4 text-[0.78rem] text-[var(--j-amber)]">
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className={cn(
          "glass flex items-center gap-2 !rounded-full p-1.5 pr-2 transition-shadow duration-500",
          state === "command" || state === "speaking" ? "shadow-[0_0_40px_-10px_rgba(41,230,255,0.7)]" : "",
        )}
      >
        <MicOrb state={state} level={level} />
        <input
          ref={inputRef}
          value={state === "command" && interim ? interim : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-1 text-[0.98rem] text-[var(--j-text)] outline-none placeholder:text-[var(--j-faint)]"
          aria-label="Command"
          autoComplete="off"
        />
        <AnimatePresence mode="wait" initial={false}>
          {text.trim() ? (
            <motion.button
              key="send"
              type="submit"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--j-cyan)] text-[#00141b] shadow-[0_0_18px_-4px_var(--j-cyan)]"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Waveform state={state} level={level} bars={14} className="h-6 w-16" />
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  )
}

/** Phones: command bar docked at the bottom, with JARVIS's last line floating above it. */
export function MobileDock(props: { online: boolean; state: VoiceState; level: number; interim: string; error: string | null }) {
  const [open, setOpen] = useState(false)
  const last = useJarvis((s) => s.chat[s.chat.length - 1])
  const clearChat = useJarvis((s) => s.clearChat)
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#01060b] from-40% to-transparent px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-6 lg:hidden">
        <div className="pointer-events-auto">
          <AnimatePresence mode="wait">
            {last && (
              <motion.button
                key={last.id}
                type="button"
                onClick={() => setOpen(true)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mb-2 flex w-full items-center gap-2.5 rounded-2xl border border-[var(--j-line)] bg-[rgba(3,16,24,0.94)] px-3.5 py-2.5 text-left shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--j-cyan)] shadow-[0_0_8px_var(--j-cyan)]" />
                <span className="line-clamp-2 flex-1 text-[0.85rem] text-[var(--j-muted)]">{props.state === "command" ? props.interim || "Listening…" : last.text}</span>
                <ChevronUp className="h-4 w-4 shrink-0 text-[var(--j-faint)]" />
              </motion.button>
            )}
          </AnimatePresence>
          <CommandBar {...props} />
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} variant="sheet">
        <ModalHeader
          title="CONVERSATION"
          onClose={() => setOpen(false)}
          lead={
            <IconButton onClick={clearChat} aria-label="Clear conversation" title="Clear">
              <Trash2 className="h-4 w-4" />
            </IconButton>
          }
        />
        <Conversation online={props.online} className="min-h-[50vh] px-4" />
      </Modal>
    </>
  )
}
