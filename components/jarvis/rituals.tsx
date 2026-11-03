"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, Moon, Play, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { runReview } from "@/lib/jarvis/brain"
import { todayKey } from "@/lib/jarvis/dates"
import { prioritySuggestions, ritualState, tomorrowKey } from "@/lib/jarvis/ritual"
import { exportData, useJarvis } from "@/lib/jarvis/store"
import { voice } from "@/lib/jarvis/voice"
import { cn } from "@/lib/utils"
import { HudButton, HudPanel } from "./hud"
import { Modal, ModalHeader, useQuickLog } from "./quick-log"

const openRitual = (r: "plan" | "review") => useJarvis.getState().setUI({ ritual: r })

function speak(text: string) {
  const st = useJarvis.getState().settings
  void voice.speak(text, { voiceURI: st.voiceURI, rate: st.voiceRate, pitch: st.voicePitch, enabled: st.voiceEnabled })
}

export function startFocus(label: string, minutes = 50) {
  useJarvis.getState().setFocus({ label, startedAt: Date.now(), durationMin: minutes })
  useQuickLog.getState().flash(`Focus · ${minutes} min · ${label.slice(0, 28)}`)
}

/* ───────── Today card ───────── */

export function TodayCard() {
  useJarvis((s) => s.days) // re-render on plan/review changes
  const settings = useJarvis((s) => s.settings)
  const focus = useJarvis((s) => s.focus)
  const toggle = useJarvis((s) => s.togglePriority)
  const r = ritualState(exportData())
  const day = r.day

  return (
    <HudPanel
      title="Today"
      index="00"
      section="today"
      right={
        <div className="flex items-center gap-2 text-[0.72rem]">
          <span className={cn("flex items-center gap-1", r.planned ? "text-[var(--j-cyan)]" : "text-[var(--j-faint)]")} title={r.planned ? "Morning plan done" : "Morning plan pending"}>
            <Sun className="h-3.5 w-3.5" />
            {r.planned && <Check className="h-3 w-3" />}
          </span>
          <span className={cn("flex items-center gap-1", r.reviewed ? "text-[var(--j-cyan)]" : "text-[var(--j-faint)]")} title={r.reviewed ? "Evening review done" : `Evening review from ${settings.reviewTime}`}>
            <Moon className="h-3.5 w-3.5" />
            {r.reviewed && <Check className="h-3 w-3" />}
          </span>
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-4 pt-3">
        {!r.planned ? (
          <div className="space-y-2.5">
            <p className="text-[0.88rem] leading-relaxed text-[var(--j-muted)]">Two minutes: how you feel, your three priorities, and one intention for the day.</p>
            <HudButton variant="solid" className="w-full py-2.5" onClick={() => openRitual("plan")}>
              <Sun className="h-3.5 w-3.5" /> Plan my day
            </HudButton>
          </div>
        ) : (
          <>
            <ul className="space-y-1">
              {day!.top3.map((p, i) => (
                <li key={p.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={p.done}
                    aria-label={`${p.done ? "Undo" : "Complete"} ${p.text}`}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                      p.done ? "border-transparent bg-[var(--j-cyan)] shadow-[0_0_12px_-2px_var(--j-cyan)]" : "border-[var(--j-line-strong)] hover:border-[var(--j-cyan)]",
                    )}
                  >
                    {p.done && <Check className="h-3 w-3 text-[var(--j-bg)]" strokeWidth={3.5} />}
                  </button>
                  <span className="font-mono-hud w-4 shrink-0 text-[0.7rem] text-[var(--j-faint)]">{i + 1}</span>
                  <span className={cn("min-w-0 flex-1 text-[0.92rem] leading-snug", p.done ? "text-[var(--j-faint)] line-through" : "text-[var(--j-text)]")}>{p.text}</span>
                  {!p.done && !focus && (
                    <button
                      type="button"
                      onClick={() => startFocus(p.text)}
                      className="icon-btn h-7 w-7 opacity-60 group-hover:opacity-100"
                      title="Start a 50-minute focus session on this"
                      aria-label={`Focus on ${p.text}`}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {day!.intention && <p className="border-l-2 border-[var(--j-cyan)] pl-2.5 text-[0.85rem] italic text-[var(--j-ice)]">{day!.intention}</p>}
            {r.reviewed ? (
              <button type="button" onClick={() => openRitual("review")} className="w-full rounded-lg bg-[rgba(var(--j-cyan-rgb),0.04)] p-2.5 text-left">
                <div className="mb-1 flex items-center justify-between">
                  <span className="hud-label">Jared&apos;s debrief</span>
                  {day!.rating && <span className="font-hud text-[0.75rem] text-[var(--j-ice)]">{day!.rating}/10</span>}
                </div>
                <p className="line-clamp-3 text-[0.82rem] leading-relaxed text-[var(--j-muted)]">{day!.feedback || "Review saved."}</p>
              </button>
            ) : r.reviewOpen ? (
              <HudButton variant="solid" className="w-full py-2.5 shadow-[0_0_24px_-6px_var(--j-cyan)]" onClick={() => openRitual("review")}>
                <Moon className="h-3.5 w-3.5" /> Evening review
              </HudButton>
            ) : (
              <div className="flex items-center justify-between text-[0.75rem] text-[var(--j-faint)]">
                <span>Evening review opens at {settings.reviewTime}</span>
                <button type="button" onClick={() => openRitual("review")} className="underline-offset-2 hover:text-[var(--j-muted)] hover:underline">
                  Review now
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </HudPanel>
  )
}

/* ───────── Shared bits ───────── */

function Scale({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <div className="hud-label mb-2">{label}</div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "font-hud rounded-lg border py-2 text-[0.8rem] transition-all duration-200",
              n === value ? "border-[var(--j-cyan)] bg-[rgba(var(--j-cyan-rgb),0.2)] text-white shadow-[0_0_14px_-4px_var(--j-cyan)]" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ───────── Morning plan ───────── */

function PlanForm({ onDone }: { onDone: () => void }) {
  const existing = useJarvis.getState().days[todayKey()]
  const [energy, setEnergy] = useState(0)
  const [items, setItems] = useState<string[]>(() => {
    const t = existing?.top3.map((p) => p.text) ?? []
    return [t[0] ?? "", t[1] ?? "", t[2] ?? ""]
  })
  const [intention, setIntention] = useState(existing?.intention ?? "")
  const suggestions = prioritySuggestions(exportData()).filter((s) => !items.includes(s))

  const fill = (text: string) =>
    setItems((cur) => {
      const i = cur.findIndex((x) => !x.trim())
      if (i === -1) return cur
      const next = [...cur]
      next[i] = text
      return next
    })

  const submit = () => {
    const s = useJarvis.getState()
    const list = items.map((x) => x.trim()).filter(Boolean)
    s.setTop3(list)
    s.setDay(todayKey(), { intention: intention.trim() || undefined, plannedAt: existing?.plannedAt ?? Date.now() })
    if (energy) s.addLog({ metric: "energy", value: energy, note: "Morning check-in" })
    useQuickLog.getState().flash("Plan locked in")
    speak(list.length ? `Plan locked in, ${s.settings.address}. First up: ${list[0]}.` : `Noted, ${s.settings.address}.`)
    onDone()
  }

  return (
    <form
      className="space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Scale label="How's your energy this morning?" value={energy} onChange={setEnergy} />
      <div>
        <div className="hud-label mb-2">Today's top 3</div>
        <div className="space-y-2">
          {items.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-hud w-5 text-center text-[0.85rem] text-[var(--j-cyan)]">{i + 1}</span>
              <input
                autoFocus={i === 0}
                className="hud-input"
                value={v}
                placeholder={i === 0 ? "The one thing that makes today a win" : i === 1 ? "Second priority" : "Third priority"}
                onChange={(e) => setItems((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`Priority ${i + 1}`}
              />
            </div>
          ))}
        </div>
        {suggestions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 6).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => fill(sug)}
                className="max-w-full truncate rounded-full border border-[var(--j-line)] px-2.5 py-1 text-[0.75rem] text-[var(--j-muted)] transition-all hover:border-[var(--j-line-strong)] hover:text-white"
              >
                + {sug}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="hud-label mb-2">Intention</div>
        <input className="hud-input" value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="e.g. Calm, focused, no phone before noon" aria-label="Intention" />
      </div>
      <HudButton variant="solid" type="submit" className="w-full py-3" disabled={!items.some((x) => x.trim())}>
        Lock in the plan
      </HudButton>
    </form>
  )
}

/* ───────── Evening review ───────── */

function ReviewForm({ online, onDone }: { online: boolean; onDone: () => void }) {
  const today = todayKey()
  const day = useJarvis((s) => s.days[today])
  const toggle = useJarvis((s) => s.togglePriority)
  const [rating, setRating] = useState(day?.rating ?? 0)
  const [win, setWin] = useState(day?.win ?? "")
  const [lesson, setLesson] = useState(day?.lesson ?? "")
  const [gratitude, setGratitude] = useState("")
  const [tomorrow, setTomorrow] = useState(day?.top3.find((p) => !p.done)?.text ?? "")
  const [phase, setPhase] = useState<"form" | "thinking" | "done">(day?.reviewedAt && day.feedback ? "done" : "form")

  const submit = async () => {
    const s = useJarvis.getState()
    s.setDay(today, { rating: rating || undefined, win: win.trim() || undefined, lesson: lesson.trim() || undefined, reviewedAt: Date.now() })
    if (win.trim()) s.addJournal("win", win)
    if (lesson.trim()) s.addJournal("reflection", lesson)
    if (gratitude.trim()) s.addJournal("gratitude", gratitude)
    if (tomorrow.trim()) s.setTop3([tomorrow], tomorrowKey())
    setPhase("thinking")
    await runReview(online)
    setPhase("done")
  }

  if (phase !== "form") {
    const fresh = useJarvis.getState().days[today]
    return (
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="font-hud text-3xl font-bold text-white">{fresh?.rating ?? "–"}</span>
          <span className="text-[0.8rem] text-[var(--j-muted)]">/10 · {fresh?.top3.filter((p) => p.done).length ?? 0} of {fresh?.top3.length ?? 0} priorities done</span>
        </div>
        <div className="inset-panel min-h-[90px] p-4">
          <div className="hud-label mb-2">Jared&apos;s debrief</div>
          {phase === "thinking" ? (
            <p className="j-pulse text-[0.95rem] text-[var(--j-muted)]">Reviewing your day…</p>
          ) : (
            <p className="text-[0.95rem] leading-relaxed text-[var(--j-text)]">{fresh?.feedback}</p>
          )}
        </div>
        <div className="flex gap-2">
          <HudButton onClick={() => setPhase("form")} disabled={phase === "thinking"}>
            Edit review
          </HudButton>
          <HudButton variant="solid" className="flex-1" onClick={onDone} disabled={phase === "thinking"}>
            Done
          </HudButton>
        </div>
      </div>
    )
  }

  return (
    <form
      className="space-y-5 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div>
        <div className="hud-label mb-2">Today&apos;s priorities</div>
        {day?.top3.length ? (
          <ul className="space-y-1.5">
            {day.top3.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => toggle(p.id)} className="flex w-full items-center gap-2.5 text-left">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                      p.done ? "border-transparent bg-[var(--j-cyan)]" : "border-[var(--j-line-strong)]",
                    )}
                  >
                    {p.done && <Check className="h-3 w-3 text-[var(--j-bg)]" strokeWidth={3.5} />}
                  </span>
                  <span className={cn("text-[0.92rem]", p.done ? "text-[var(--j-faint)] line-through" : "text-[var(--j-text)]")}>{p.text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.85rem] text-[var(--j-faint)]">No priorities were set this morning.</p>
        )}
      </div>
      <Scale label="Rate the day" value={rating} onChange={setRating} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="hud-label">Win of the day</span>
          <input className="hud-input" value={win} onChange={(e) => setWin(e.target.value)} placeholder="What went right?" />
        </label>
        <label className="space-y-1.5">
          <span className="hud-label">What would you do differently?</span>
          <input className="hud-input" value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="One honest lesson" />
        </label>
        <label className="space-y-1.5">
          <span className="hud-label">Grateful for</span>
          <input className="hud-input" value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="Optional" />
        </label>
        <label className="space-y-1.5">
          <span className="hud-label">Tomorrow&apos;s #1</span>
          <input className="hud-input" value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} placeholder="Sets up tomorrow's plan" />
        </label>
      </div>
      <HudButton variant="solid" type="submit" className="w-full py-3" disabled={!rating}>
        Close out the day
      </HudButton>
    </form>
  )
}

export function RitualModal({ online }: { online: boolean }) {
  const ritual = useJarvis((s) => s.ritual)
  const close = () => useJarvis.getState().setUI({ ritual: null })
  const [shown, setShown] = useState(ritual)
  useEffect(() => {
    if (ritual) setShown(ritual)
  }, [ritual])
  return (
    <Modal open={!!ritual} onClose={close}>
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div key={shown} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ModalHeader
              title={shown === "plan" ? "MORNING PLAN" : "EVENING REVIEW"}
              sub={shown === "plan" ? "Set the day up in two minutes" : "Close the loop and set up tomorrow"}
              onClose={close}
              lead={
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(var(--j-cyan-rgb),0.12)] text-[var(--j-cyan)]">
                  {shown === "plan" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </span>
              }
            />
            {shown === "plan" ? <PlanForm onDone={close} /> : <ReviewForm online={online} onDone={close} />}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
