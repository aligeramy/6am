"use client"

import { differenceInCalendarDays, format, startOfDay, subDays, subMonths, subYears } from "date-fns"
import { useEffect, useRef, useState } from "react"
import { PILLARS, useFourM, type PillarId, type Task } from "@/lib/fourm/store"

/* Routes live in the URL hash so the phone's back gesture works and it runs as plain static files:
   #/           home
   #/music      a pillar
   #/completed  everything completed; #/music/completed for one pillar */
type Route = { view: "home" } | { view: "pillar"; pillar: PillarId } | { view: "completed"; pillar?: PillarId }

const isPillar = (s: string): s is PillarId => PILLARS.some((p) => p.id === s)

function parse(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, "").split("/")
  if (a === "completed") return { view: "completed" }
  if (a && isPillar(a)) return b === "completed" ? { view: "completed", pillar: a } : { view: "pillar", pillar: a }
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

/** Re-render when the date rolls over, so yesterday's ticked lines move to Completed. */
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

function age(ts: number) {
  const n = differenceInCalendarDays(new Date(), new Date(ts))
  return n === 0 ? "added today" : `added ${shortDate(ts)} · ${n} day${n === 1 ? "" : "s"}`
}

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
      <a href="#/completed" className="fm-small fm-foot">
        completed
      </a>
    </main>
  )
}

/* ───────── A pillar: your own short list ───────── */

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
      {armed ? (
        <div className="fm-meta">
          <button type="button" className="fm-act" onClick={() => remove(task.id)}>
            delete
          </button>
          {"  ·  "}
          <button type="button" className="fm-act" onClick={() => setArmed(false)}>
            keep
          </button>
        </div>
      ) : (
        <div className="fm-meta">{task.completedAt ? `done ${shortDate(task.completedAt)}` : age(task.createdAt)}</div>
      )}
    </li>
  )
}

function AddLine({ pillar }: { pillar: PillarId }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const add = useFourM((s) => s.add)
  if (!open)
    return (
      <button type="button" className="fm-add" onClick={() => setOpen(true)}>
        + add
      </button>
    )
  return (
    <form
      className="fm-addform"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) add(pillar, text)
        setText("") // stay open for the next line
      }}
    >
      <input
        autoFocus
        className="fm-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => !text.trim() && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="new line"
        enterKeyHint="done"
        aria-label="New line"
        maxLength={120}
      />
    </form>
  )
}

function Pillar({ pillar }: { pillar: PillarId }) {
  const tasks = useFourM((s) => s.tasks)
  const today = useToday()
  // Open lines, oldest first (the stale ones rise to the top), then anything ticked today.
  const open = tasks.filter((t) => t.pillar === pillar && !t.completedAt).sort((a, b) => a.createdAt - b.createdAt)
  const doneToday = tasks.filter((t) => t.pillar === pillar && t.completedAt && t.completedAt >= today).sort((a, b) => a.completedAt! - b.completedAt!)
  return (
    <main className="fm-screen">
      <a href="#/" className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">{name(pillar)}</h1>
      <ul className="fm-list">
        {[...open, ...doneToday].map((t) => (
          <Line key={t.id} task={t} />
        ))}
      </ul>
      {!open.length && !doneToday.length && <p className="fm-empty">nothing here yet.</p>}
      <AddLine pillar={pillar} />
      <a href={`#/${pillar}/completed`} className="fm-small fm-foot">
        completed
      </a>
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

      <div className="fm-small fm-count">
        {done.length} completed
      </div>
      <ul className="fm-list">
        {done.map((t) => (
          <li key={t.id} className="fm-line">
            <div className="fm-task fm-static">{t.text}</div>
            <div className="fm-meta">
              {!pillar && `${name(t.pillar).toLowerCase()} · `}added {shortDate(t.createdAt)} · done {shortDate(t.completedAt!)}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default function FourM() {
  const route = useRoute()
  return route.view === "pillar" ? <Pillar pillar={route.pillar} /> : route.view === "completed" ? <Completed pillar={route.pillar} /> : <Home />
}
