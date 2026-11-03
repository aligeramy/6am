"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUp, Eye, EyeOff, Mic, Minimize2, RotateCcw, Trash2, Undo2, Wrench } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { canUndo, sendWorkshop, undoWorkshop } from "@/lib/jarvis/brain"
import { DEFAULT_APPEARANCE, useJarvis } from "@/lib/jarvis/store"
import type { ChatMessage, SectionId } from "@/lib/jarvis/types"
import { voice } from "@/lib/jarvis/voice"
import { cn } from "@/lib/utils"
import { HudButton, IconButton } from "./hud"
import { Modal, ModalHeader } from "./quick-log"

const SUGGESTIONS = [
  "Make it red and gold like the Iron Man suit",
  "Minimize everything except Habits and Ideas",
  "Rename Spirit to Faith",
  "Make the text a bit bigger",
  "Make the cards more see-through",
  "Delete any duplicate sleep entries from this week",
]

const SECTION_LABEL: Record<SectionId, string> = {
  greeting: "Greeting",
  habits: "Habits",
  missions: "Missions",
  ideas: "Ideas",
  health: "Health",
  wealth: "Wealth",
  career: "Career",
  mind: "Mind",
  spirit: "Spirit",
}

const SWATCHES = [
  { name: "Arc cyan", accent: "#29e6ff" },
  { name: "Mark red", accent: "#ff3b3b", warning: "#ffc247", danger: "#ff7ad9" },
  { name: "Gold", accent: "#ffc247", warning: "#ff8a3d", danger: "#ff4d4d" },
  { name: "Vibranium", accent: "#b26bff" },
  { name: "Emerald", accent: "#3dff9a" },
  { name: "Ice", accent: "#e8f4f8" },
]

function Message({ m, online, last }: { m: ChatMessage; online: boolean; last: boolean }) {
  const isUser = m.role === "user"
  const [, force] = useState(0)
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[90%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-left text-[0.92rem] leading-relaxed",
            isUser ? "rounded-br-md bg-[rgba(var(--j-cyan-rgb),0.1)] text-[var(--j-ice)]" : "rounded-bl-md bg-[rgba(var(--j-cyan-rgb),0.03)] text-[var(--j-text)]",
          )}
        >
          {!isUser && <Wrench className="mr-2 inline h-3.5 w-3.5 -translate-y-[1px] text-[var(--j-cyan)]" />}
          {m.text}
        </div>
        {m.actions && m.actions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 px-1">
            {m.actions.map((a, i) => (
              <span
                key={i}
                className="rounded-full border px-2 py-[2px] text-[0.7rem]"
                style={{
                  borderColor: a.ok ? "rgba(var(--j-cyan-rgb),0.3)" : "color-mix(in srgb, var(--j-amber) 45%, transparent)",
                  color: a.ok ? "var(--j-cyan)" : "var(--j-amber)",
                }}
              >
                {a.ok ? "✓" : "!"} {a.label}
              </span>
            ))}
          </div>
        )}
        {(m.undoable && canUndo(m.id)) || (last && m.options?.length) ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
            {last &&
              m.options?.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => void sendWorkshop(o, online)}
                  className="rounded-full border border-[rgba(var(--j-cyan-rgb),0.4)] bg-[rgba(var(--j-cyan-rgb),0.08)] px-3 py-1 text-[0.8rem] text-[var(--j-ice)] transition-all hover:bg-[rgba(var(--j-cyan-rgb),0.18)] hover:text-white"
                >
                  {o}
                </button>
              ))}
            {m.undoable && canUndo(m.id) && (
              <button
                type="button"
                onClick={() => {
                  undoWorkshop(m.id)
                  force((n) => n + 1)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--j-line)] px-2.5 py-1 text-[0.75rem] text-[var(--j-muted)] transition-colors hover:border-[var(--j-line-strong)] hover:text-white"
              >
                <Undo2 className="h-3 w-3" /> Undo
              </button>
            )}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

function AskTab({ online }: { online: boolean }) {
  const chat = useJarvis((s) => s.workshop)
  const [text, setText] = useState("")
  const [listening, setListening] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" })
  }, [chat.length])
  useEffect(() => voice.subscribe((s) => setListening(s.state === "command")), [])

  const send = (v: string) => {
    if (!v.trim()) return
    setText("")
    void sendWorkshop(v, online)
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col">
      <div ref={box} className="hud-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {chat.length === 0 && (
          <div className="space-y-4 py-4">
            <p className="text-[0.95rem] leading-relaxed text-[var(--j-muted)]">
              Tell me what to change about the app: colors, layout, section names, text size, or fixes to your data. I&apos;ll ask if something&apos;s unclear, and every
              change has an undo.
            </p>
            {!online && (
              <p className="rounded-xl border border-[color-mix(in_srgb,var(--j-amber)_35%,transparent)] px-3 py-2 text-[0.8rem] text-[var(--j-amber)]">
                Basic mode: without Claude I can do colors, text size and sections. Add your Anthropic key in Settings for everything else.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-[var(--j-line)] px-3 py-1 text-left text-[0.8rem] text-[var(--j-muted)] transition-all hover:border-[var(--j-line-strong)] hover:bg-[rgba(var(--j-cyan-rgb),0.06)] hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <Message key={m.id} m={m} online={online} last={i === chat.length - 1} />
        ))}
      </div>
      <form
        className="sticky bottom-0 border-t border-[var(--j-line)] bg-[color-mix(in_srgb,var(--j-bg)_90%,transparent)] px-4 py-3 backdrop-blur-xl"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <div className="glass flex items-center gap-2 !rounded-full p-1.5">
          <button
            type="button"
            onClick={() => (listening ? voice.cancelCommand() : voice.beginCommand((t) => send(t)))}
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
              listening ? "bg-[var(--j-cyan)] text-[var(--j-bg)] shadow-[0_0_24px_var(--j-cyan)]" : "bg-[rgba(var(--j-cyan-rgb),0.12)] text-[var(--j-ice)]",
            )}
            aria-label={listening ? "Stop listening" : "Speak to the Workshop"}
          >
            {listening && <span className="absolute inset-0 rounded-full border border-[var(--j-cyan)]" style={{ animation: "j-ring 1.6s ease-out infinite" }} />}
            <Mic className="relative h-4 w-4" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={listening ? "Listening…" : "Change anything about the app…"}
            className="min-w-0 flex-1 bg-transparent px-1 text-[0.95rem] text-[var(--j-text)] outline-none placeholder:text-[var(--j-faint)]"
            aria-label="Workshop request"
          />
          <AnimatePresence>
            {text.trim() && (
              <motion.button
                type="submit"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--j-cyan)] text-[var(--j-bg)]"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  )
}

function ControlsTab() {
  const a = useJarvis((s) => s.appearance)
  const { updateAppearance, setSection, moveSection, resetAppearance } = useJarvis.getState()
  const row = (id: SectionId, col: "left" | "right", i: number, len: number) => {
    const pref = a.sections[id] || {}
    return (
      <li key={id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[rgba(var(--j-cyan-rgb),0.04)]">
        <input
          className="min-w-0 flex-1 bg-transparent text-[0.9rem] text-[var(--j-text)] outline-none focus:text-white"
          defaultValue={pref.title || SECTION_LABEL[id]}
          onBlur={(e) => setSection(id, { title: e.target.value.trim() && e.target.value.trim() !== SECTION_LABEL[id] ? e.target.value.trim() : undefined })}
          aria-label={`${SECTION_LABEL[id]} name`}
          key={pref.title || SECTION_LABEL[id]}
        />
        <IconButton onClick={() => i > 0 && moveSection(id, col, i)} disabled={i === 0} className="h-7 w-7 disabled:opacity-30" aria-label="Move up" title="Move up">
          ↑
        </IconButton>
        <IconButton onClick={() => i < len - 1 && moveSection(id, col, i + 2)} disabled={i === len - 1} className="h-7 w-7 disabled:opacity-30" aria-label="Move down" title="Move down">
          ↓
        </IconButton>
        <IconButton onClick={() => moveSection(id, col === "left" ? "right" : "left")} className="h-7 w-7 text-[0.7rem]" title={`Move to ${col === "left" ? "right" : "left"} column`}>
          {col === "left" ? "→" : "←"}
        </IconButton>
        <IconButton onClick={() => setSection(id, { collapsed: !pref.collapsed })} aria-pressed={!!pref.collapsed} className="h-7 w-7" title={pref.collapsed ? "Expand" : "Minimize"}>
          <Minimize2 className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton onClick={() => setSection(id, { hidden: !pref.hidden })} className="h-7 w-7" title={pref.hidden ? "Show" : "Hide"}>
          {pref.hidden ? <EyeOff className="h-3.5 w-3.5 text-[var(--j-faint)]" /> : <Eye className="h-3.5 w-3.5" />}
        </IconButton>
      </li>
    )
  }
  return (
    <div className="space-y-6 px-5 py-5">
      <section className="space-y-3">
        <div className="hud-label">Color</div>
        <div className="flex flex-wrap gap-2">
          {SWATCHES.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => updateAppearance({ accent: s.accent, warning: s.warning ?? DEFAULT_APPEARANCE.warning, danger: s.danger ?? DEFAULT_APPEARANCE.danger })}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.8rem] transition-all",
                a.accent.toLowerCase() === s.accent ? "border-white/60 text-white" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
              )}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: s.accent, boxShadow: `0 0 10px ${s.accent}` }} />
              {s.name}
            </button>
          ))}
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-[var(--j-line)] px-3 py-1.5 text-[0.8rem] text-[var(--j-muted)] hover:text-white">
            <input type="color" value={a.accent} onChange={(e) => updateAppearance({ accent: e.target.value })} className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0" aria-label="Custom accent color" />
            Custom
          </label>
        </div>
      </section>

      <section className="space-y-2">
        <div className="hud-label">Text size · {Math.round(a.fontScale * 100)}%</div>
        <input type="range" min={0.85} max={1.3} step={0.05} value={a.fontScale} onChange={(e) => updateAppearance({ fontScale: parseFloat(e.target.value) })} className="w-full" />
      </section>

      <section className="space-y-2">
        <div className="hud-label">Left column</div>
        <ul>{a.left.map((id, i) => row(id, "left", i, a.left.length))}</ul>
        <div className="hud-label pt-2">Right column</div>
        <ul>{a.right.map((id, i) => row(id, "right", i, a.right.length))}</ul>
      </section>

      {a.customCss && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="hud-label">Custom styling</span>
            <HudButton variant="ghost" onClick={() => updateAppearance({ customCss: "" })}>
              Clear
            </HudButton>
          </div>
          <pre className="hud-scroll max-h-40 overflow-auto rounded-xl bg-black/30 p-3 text-[0.72rem] text-[var(--j-muted)]">{a.customCss}</pre>
        </section>
      )}

      <HudButton variant="danger" onClick={resetAppearance}>
        <RotateCcw className="h-3.5 w-3.5" /> Reset look &amp; layout
      </HudButton>
    </div>
  )
}

export function Workshop({ online }: { online: boolean }) {
  const open = useJarvis((s) => s.workshopOpen)
  const clear = useJarvis((s) => s.clearWorkshop)
  const close = () => useJarvis.getState().setUI({ workshopOpen: false })
  const [tab, setTab] = useState<"ask" | "controls">("ask")
  return (
    <Modal open={open} onClose={close} variant="sheet">
      <ModalHeader
        title="WORKSHOP"
        sub={online ? "Claude engineering · changes the app itself" : "Basic mode · connect Claude in Settings for full power"}
        onClose={close}
        lead={
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(var(--j-cyan-rgb),0.12)] text-[var(--j-cyan)]">
            <Wrench className="h-4 w-4" />
          </span>
        }
      />
      <div className="flex items-center gap-1 px-5 pt-3">
        {(["ask", "controls"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className="relative rounded-full px-3.5 py-1.5 text-[0.85rem] font-medium">
            {tab === t && <motion.span layoutId="workshop-tab" className="absolute inset-0 rounded-full bg-[rgba(var(--j-cyan-rgb),0.14)]" transition={{ type: "spring", damping: 30, stiffness: 320 }} />}
            <span className={cn("relative", tab === t ? "text-white" : "text-[var(--j-muted)]")}>{t === "ask" ? "Ask" : "Controls"}</span>
          </button>
        ))}
        <div className="flex-1" />
        {tab === "ask" && (
          <IconButton onClick={clear} title="Clear conversation" aria-label="Clear conversation">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        )}
      </div>
      {tab === "ask" ? <AskTab online={online} /> : <ControlsTab />}
    </Modal>
  )
}
