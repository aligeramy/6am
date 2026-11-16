"use client"

import { differenceInCalendarDays, format, startOfDay, subDays, subMonths, subYears } from "date-fns"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { DAY2, MAX_EVERY, WEEK, monthName, ordinal, ruleText, type Rule, type Unit } from "@/lib/fourm/repeat"
import { PILLARS, useFourM, type PillarId, type Task } from "@/lib/fourm/store"

/* Routes live in the URL hash so the phone's back gesture works and it runs as plain static files:
   #/                 home
   #/settings         settings
   #/music            a pillar
   #/music/repeating  that pillar's repeating lines
   #/completed        everything completed; #/music/completed for one pillar */
type Route =
  | { view: "home" }
  | { view: "settings" }
  | { view: "pillar"; pillar: PillarId }
  | { view: "repeating"; pillar: PillarId }
  | { view: "completed"; pillar?: PillarId }

const isPillar = (s: string): s is PillarId => PILLARS.some((p) => p.id === s)

function parse(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, "").split("/")
  if (a === "completed") return { view: "completed" }
  if (a === "settings") return { view: "settings" }
  if (a && isPillar(a)) {
    if (b === "completed") return { view: "completed", pillar: a }
    if (b === "repeating") return { view: "repeating", pillar: a }
    return { view: "pillar", pillar: a }
  }
  return { view: "home" }
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => (typeof window === "undefined" ? { view: "home" } : parse(window.location.hash)))
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  return route
}

/** Re-render when the date rolls over, so yesterday's ticked lines clean up and repeating lines come due. */
function useToday() {
  const [day, setDay] = useState(() => startOfDay(new Date()).getTime())
  useEffect(() => {
    const t = setInterval(() => setDay(startOfDay(new Date()).getTime()), 60_000)
    return () => clearInterval(t)
  }, [])
  return day
}

const shortDate = (ts: number) => {
  const d = new Date(ts)
  return format(d, d.getFullYear() === new Date().getFullYear() ? "d MMM" : "d MMM yyyy").toLowerCase()
}
const dayName = (ts: number) => format(ts, "EEE d MMM").toLowerCase()
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`
const since = (ts: number) => differenceInCalendarDays(new Date(), new Date(ts))

/** The small grey lines under a line: how old it is, how it repeats (and since when it's due), or when it was done. */
function meta(t: Task): string[] {
  if (t.completedAt) return [`done ${shortDate(t.completedAt)}`]
  if (t.repeat) {
    const late = since(t.due ?? Date.now())
    return late > 0 ? [ruleText(t.repeat), `due ${shortDate(t.due!)} · ${days(late)}`] : [ruleText(t.repeat)]
  }
  const n = since(t.createdAt)
  return [n === 0 ? "added today" : `added ${shortDate(t.createdAt)} · ${days(n)}`]
}

const Meta = ({ lines }: { lines: string[] }) => (
  <>
    {lines.map((l) => (
      <div key={l} className="fm-meta">
        {l}
      </div>
    ))}
  </>
)

const name = (id: PillarId) => PILLARS.find((p) => p.id === id)!.name

/* ───────── Home ───────── */

function Home() {
  return (
    <main className="fm-screen">
      <div className="fm-small">{format(new Date(), "EEE d MMM").toUpperCase()}</div>
      <nav className="fm-words">
        {PILLARS.map((p) => (
          <a key={p.id} href={`#/${p.id}`} className="fm-word">
            {p.name}
          </a>
        ))}
      </nav>
      <div className="fm-foot">
        <a href="#/completed" className="fm-small">
          completed
        </a>
        <a href="#/settings" className="fm-small">
          settings
        </a>
      </div>
    </main>
  )
}

/* ───────── A pillar: your own short list ───────── */

function Confirm({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="fm-meta">
      <button type="button" className="fm-act" onClick={onYes}>
        delete
      </button>
      {"  ·  "}
      <button type="button" className="fm-act" onClick={onNo}>
        keep
      </button>
    </div>
  )
}

function Line({ task }: { task: Task }) {
  const { toggle, remove } = useFourM.getState()
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)

  // Hold a line to delete it; a normal tap ticks it.
  const down = () => {
    held.current = false
    timer.current = setTimeout(() => {
      held.current = true
      setArmed(true)
      if (navigator.vibrate) navigator.vibrate(15)
    }, 550)
  }
  const up = () => timer.current && clearTimeout(timer.current)

  return (
    <li className="fm-line">
      <button
        type="button"
        className={task.completedAt ? "fm-task fm-done" : "fm-task"}
        onPointerDown={down}
        onPointerUp={up}
        onPointerLeave={up}
        onContextMenu={(e) => {
          e.preventDefault()
          setArmed(true)
        }}
        onClick={() => {
          if (held.current) return
          toggle(task.id)
        }}
        onKeyDown={(e) => (e.key === "Delete" || e.key === "Backspace") && setArmed(true)}
      >
        <span className="fm-box">{task.completedAt ? "[x]" : "[ ]"}</span> <span className="fm-text">{task.text}</span>
      </button>
      {armed ? <Confirm onYes={() => remove(task.id)} onNo={() => setArmed(false)} /> : <Meta lines={meta(task)} />}
    </li>
  )
}

/* Repeat picker: presets are shortcuts into one rule; "custom" opens all of it. */

type Preset = "never" | "daily" | "days" | "few" | "monthly" | "custom"
const PRESETS: { id: Preset; label: string }[] = [
  { id: "never", label: "never" },
  { id: "daily", label: "every day" },
  { id: "days", label: "certain days" },
  { id: "few", label: "every few days" },
  { id: "monthly", label: "monthly" },
  { id: "custom", label: "custom" },
]
const UNITS: Unit[] = ["day", "week", "month", "year"]

interface Draft {
  preset: Preset
  days: number[]
  few: number
  date: number
  month: number
  every: number
  unit: Unit
}

const freshDraft = (): Draft => {
  const d = new Date()
  return { preset: "never", days: [d.getDay()], few: 3, date: d.getDate(), month: d.getMonth(), every: 1, unit: "week" }
}

function toRule(d: Draft): Rule | undefined {
  switch (d.preset) {
    case "never":
      return undefined
    case "daily":
      return { every: 1, unit: "day" }
    case "days":
      return { every: 1, unit: "week", days: d.days }
    case "few":
      return { every: d.few, unit: "day" }
    case "monthly":
      return { every: 1, unit: "month", date: d.date }
    case "custom": {
      const r: Rule = { every: d.every, unit: d.unit }
      if (d.unit === "week") r.days = d.days
      if (d.unit === "month" || d.unit === "year") r.date = d.date
      if (d.unit === "year") r.month = d.month
      return r
    }
  }
}

function Stepper({ value, min, max, onChange, show = String, label }: { value: number; min: number; max: number; onChange: (n: number) => void; show?: (n: number) => string; label: string }) {
  return (
    <span className="fm-stepper" role="group" aria-label={label}>
      <button type="button" className="fm-step" aria-label={`fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        -
      </button>
      <span className="fm-stepval">{show(value)}</span>
      <button type="button" className="fm-step" aria-label={`more ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </span>
  )
}

function DayChips({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="fm-chips">
      {WEEK.map((d) => {
        const on = value.includes(d)
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            className={on ? "fm-range fm-on" : "fm-range"}
            // At least one day stays picked.
            onClick={() => (on ? value.length > 1 && onChange(value.filter((x) => x !== d)) : onChange([...value, d]))}
          >
            {DAY2[d]}
          </button>
        )
      })}
    </div>
  )
}

function RepeatPicker({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const [open, setOpen] = useState(false)
  const rule = toRule(draft)
  const patch = (p: Partial<Draft>) => onChange({ ...draft, ...p })
  const date = <Stepper label="day of month" value={draft.date} min={1} max={31} show={ordinal} onChange={(date) => patch({ date })} />
  const usesDate = draft.preset === "monthly" || (draft.preset === "custom" && (draft.unit === "month" || draft.unit === "year"))
  return (
    <div className="fm-repeat">
      <button type="button" className={open ? "fm-repeatbtn fm-open" : "fm-repeatbtn"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        repeat: {rule ? ruleText(rule) : "never"}
      </button>
      {open && (
        <>
          <div className="fm-ranges fm-presets">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" aria-pressed={draft.preset === p.id} className={draft.preset === p.id ? "fm-range fm-on" : "fm-range"} onClick={() => patch({ preset: p.id })}>
                {p.label}
              </button>
            ))}
          </div>
          {draft.preset === "days" && <DayChips value={draft.days} onChange={(days) => patch({ days })} />}
          {draft.preset === "few" && (
            <div className="fm-pick">
              every <Stepper label="days" value={draft.few} min={2} max={60} onChange={(few) => patch({ few })} /> days
            </div>
          )}
          {draft.preset === "monthly" && <div className="fm-pick">on the {date}</div>}
          {draft.preset === "custom" && (
            <>
              <div className="fm-pick">
                every <Stepper label="interval" value={draft.every} min={1} max={MAX_EVERY[draft.unit]} onChange={(every) => patch({ every })} />
              </div>
              <div className="fm-chips">
                {UNITS.map((u) => (
                  <button key={u} type="button" aria-pressed={draft.unit === u} className={draft.unit === u ? "fm-range fm-on" : "fm-range"} onClick={() => patch({ unit: u, every: Math.min(draft.every, MAX_EVERY[u]) })}>
                    {draft.every === 1 ? u : `${u}s`}
                  </button>
                ))}
              </div>
              {draft.unit === "week" && <DayChips value={draft.days} onChange={(days) => patch({ days })} />}
              {draft.unit === "month" && <div className="fm-pick">on the {date}</div>}
              {draft.unit === "year" && (
                <div className="fm-pick">
                  on {date} <Stepper label="month" value={draft.month} min={0} max={11} show={monthName} onChange={(month) => patch({ month })} />
                </div>
              )}
            </>
          )}
          {usesDate && draft.date > 28 && <div className="fm-meta">shorter months use their last day</div>}
        </>
      )}
    </div>
  )
}

function AddLine({ pillar }: { pillar: PillarId }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [draft, setDraft] = useState(freshDraft)
  const [note, setNote] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const add = useFourM((s) => s.add)

  if (!open)
    return (
      <button type="button" className="fm-add" onClick={() => setOpen(true)}>
        + add
      </button>
    )

  const close = () => {
    setOpen(false)
    setText("")
    setDraft(freshDraft())
    setNote("")
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = add(pillar, text, toRule(draft))
    if (t) {
      setText("")
      setDraft(freshDraft())
      // A repeating line that doesn't fall on today won't show yet, so say when it will.
      setNote(t.due !== undefined && t.due > startOfDay(new Date()).getTime() ? `"${t.text}" starts ${dayName(t.due)}` : "")
    }
    input.current?.focus() // stay open for the next line
  }

  return (
    <form className="fm-addform" onSubmit={submit}>
      <input
        ref={input}
        autoFocus
        className="fm-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        placeholder="new line"
        enterKeyHint="done"
        aria-label="New line"
        maxLength={120}
      />
      <RepeatPicker draft={draft} onChange={setDraft} />
      <div className="fm-formacts">
        <button type="submit" className="fm-act">
          add
        </button>
        {"  ·  "}
        <button type="button" className="fm-act" onClick={close}>
          close
        </button>
      </div>
      {note && <div className="fm-meta fm-note">{note}</div>}
    </form>
  )
}

function Pillar({ pillar }: { pillar: PillarId }) {
  const tasks = useFourM((s) => s.tasks)
  const autoClean = useFourM((s) => s.autoClean)
  const today = useToday()
  const [showDone, setShowDone] = useState(false)

  const mine = tasks.filter((t) => t.pillar === pillar)
  // Open lines, oldest first so the stale ones rise to the top. A repeating line counts from the day it fell due.
  const age = (t: Task) => (t.repeat ? t.due ?? 0 : t.createdAt)
  const open = mine.filter((t) => (t.repeat ? (t.due ?? 0) <= today : !t.completedAt)).sort((a, b) => age(a) - age(b))
  const doneToday = mine.filter((t) => t.completedAt && t.completedAt >= today).sort((a, b) => a.completedAt! - b.completedAt!)
  const repeating = mine.filter((t) => t.repeat).length
  const shown = autoClean || showDone ? [...open, ...doneToday] : open

  useEffect(() => {
    if (!doneToday.length) setShowDone(false)
  }, [doneToday.length])

  return (
    <main className="fm-screen">
      <a href="#/" className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">{name(pillar)}</h1>
      <ul className="fm-list">
        {shown.map((t) => (
          <Line key={t.id} task={t} />
        ))}
      </ul>
      {!shown.length && <p className="fm-empty">{mine.length ? "nothing left today." : "nothing here yet."}</p>}
      <AddLine pillar={pillar} />
      {!autoClean && doneToday.length > 0 && (
        <button type="button" className="fm-toggle" aria-pressed={showDone} onClick={() => setShowDone((v) => !v)}>
          {showDone ? "hide completed" : `show completed (${doneToday.length})`}
        </button>
      )}
      <div className="fm-foot">
        {repeating > 0 && (
          <a href={`#/${pillar}/repeating`} className="fm-small">
            repeating ({repeating})
          </a>
        )}
        <a href={`#/${pillar}/completed`} className="fm-small">
          completed history
        </a>
      </div>
    </main>
  )
}

/* ───────── A pillar's repeating lines, including ones not due today ───────── */

function RepeatItem({ task }: { task: Task }) {
  const remove = useFourM((s) => s.remove)
  const [armed, setArmed] = useState(false)
  const due = task.due ?? Date.now()
  const late = since(due)
  const when = late > 0 ? `due ${shortDate(due)} · ${days(late)}` : late === 0 ? "due today" : `next ${dayName(due)}`
  return (
    <li className="fm-line">
      <button type="button" className="fm-task" onClick={() => setArmed((a) => !a)}>
        {task.text}
      </button>
      {armed ? (
        <Confirm onYes={() => remove(task.id)} onNo={() => setArmed(false)} />
      ) : (
        <Meta lines={[ruleText(task.repeat!), when]} />
      )}
    </li>
  )
}

function Repeating({ pillar }: { pillar: PillarId }) {
  const tasks = useFourM((s) => s.tasks)
  useToday()
  const list = tasks.filter((t) => t.pillar === pillar && t.repeat).sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
  return (
    <main className="fm-screen">
      <a href={`#/${pillar}`} className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">REPEATING</h1>
      <div className="fm-small">{name(pillar)}</div>
      <ul className="fm-list">
        {list.map((t) => (
          <RepeatItem key={t.id} task={t} />
        ))}
      </ul>
      {!list.length && <p className="fm-empty">no repeating lines.</p>}
      {list.length > 0 && <div className="fm-small fm-foot fm-hint">tap a line to delete it</div>}
    </main>
  )
}

/* ───────── Settings ───────── */

function Settings() {
  const autoClean = useFourM((s) => s.autoClean)
  const setAutoClean = useFourM((s) => s.setAutoClean)
  return (
    <main className="fm-screen">
      <a href="#/" className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">SETTINGS</h1>
      <section className="fm-setting">
        <h2 className="fm-label">daily auto clean</h2>
        <div className="fm-ranges" role="radiogroup" aria-label="Daily auto clean">
          {[false, true].map((on) => (
            <button key={String(on)} type="button" role="radio" aria-checked={autoClean === on} className={autoClean === on ? "fm-range fm-on" : "fm-range"} onClick={() => setAutoClean(on)}>
              {on ? "on" : "off"}
            </button>
          ))}
        </div>
        <p className="fm-meta fm-explain">
          {autoClean
            ? "ticked lines stay on the list, crossed out, for the rest of the day. the next day they're cleaned off into completed."
            : "ticked lines leave the list right away and go to completed. tap “show completed” in a pillar to see today's."}
        </p>
      </section>
    </main>
  )
}

/* ───────── Completed ───────── */

const RANGES = [
  { id: "today", label: "today" },
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "1y", label: "year" },
  { id: "custom", label: "custom" },
] as const
type RangeId = (typeof RANGES)[number]["id"]

function rangeStart(id: RangeId) {
  const today = startOfDay(new Date())
  switch (id) {
    case "today":
      return today
    case "7":
      return subDays(today, 6)
    case "14":
      return subDays(today, 13)
    case "30":
      return subDays(today, 29)
    case "3m":
      return subMonths(today, 3)
    case "6m":
      return subMonths(today, 6)
    case "1y":
      return subYears(today, 1)
    default:
      return today
  }
}

const dayInput = (d: Date) => format(d, "yyyy-MM-dd")

function Completed({ pillar }: { pillar?: PillarId }) {
  const tasks = useFourM((s) => s.tasks)
  const [range, setRange] = useState<RangeId>("today")
  const [from, setFrom] = useState(() => dayInput(subDays(new Date(), 6)))
  const [to, setTo] = useState(() => dayInput(new Date()))

  const start = range === "custom" ? startOfDay(new Date(`${from}T00:00`)).getTime() : rangeStart(range).getTime()
  const end = range === "custom" ? startOfDay(new Date(`${to}T00:00`)).getTime() + 86_400_000 : Infinity
  const done = tasks
    .filter((t) => t.completedAt && (!pillar || t.pillar === pillar) && t.completedAt >= start && t.completedAt < end)
    .sort((a, b) => b.completedAt! - a.completedAt!)

  return (
    <main className="fm-screen">
      <a href={pillar ? `#/${pillar}` : "#/"} className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">COMPLETED</h1>
      <div className="fm-small">{pillar ? name(pillar) : "ALL FOUR"}</div>

      <div className="fm-ranges" role="tablist">
        {RANGES.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={range === r.id} className={range === r.id ? "fm-range fm-on" : "fm-range"} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="fm-custom">
          <input type="date" className="fm-date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} aria-label="From" />
          <span>to</span>
          <input type="date" className="fm-date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} aria-label="To" />
        </div>
      )}

      <div className="fm-small fm-count">{done.length} completed</div>
      <ul className="fm-list">
        {done.map((t) => (
          <li key={t.id} className="fm-line">
            <div className="fm-task fm-static">{t.text}</div>
            <div className="fm-meta">
              {!pillar && `${name(t.pillar).toLowerCase()} · `}
              {/* A repeating line's record says which day it was for. */}
              {t.of ? "due" : "added"} {shortDate(t.createdAt)} · done {shortDate(t.completedAt!)}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default function FourM() {
  const route = useRoute()
  switch (route.view) {
    case "pillar":
      return <Pillar pillar={route.pillar} />
    case "repeating":
      return <Repeating pillar={route.pillar} />
    case "completed":
      return <Completed pillar={route.pillar} />
    case "settings":
      return <Settings />
    default:
      return <Home />
  }
}
