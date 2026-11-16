"use client"

import { differenceInCalendarDays, format, startOfDay, subDays, subMonths, subYears } from "date-fns"
import { Fragment, useEffect, useRef, useState, type FormEvent, type MouseEvent, type RefObject } from "react"
import { DAY2, MAX_EVERY, WEEK, monthName, ordinal, ruleText, type Rule, type Unit } from "@/lib/fourm/repeat"
import { PILLARS, useFourM, type PillarId, type Task, type Term } from "@/lib/fourm/store"

/* Routes live in the URL hash so the phone's back gesture works and it runs as plain static files:
   #/                    home
   #/settings            settings
   #/terms               every term: open one, add one, rename or remove one
   #/term/short          one term across all four pillars
   #/music               a pillar, grouped by term
   #/music/term/short    a pillar, one term
   #/music/repeating     that pillar's repeating lines
   #/completed           everything completed; #/music/completed for one pillar */
type Route =
  | { view: "home" }
  | { view: "settings" }
  | { view: "terms" }
  | { view: "term"; term: string }
  | { view: "pillar"; pillar: PillarId; term?: string }
  | { view: "repeating"; pillar: PillarId }
  | { view: "completed"; pillar?: PillarId }

const isPillar = (s: string): s is PillarId => PILLARS.some((p) => p.id === s)

function parse(hash: string): Route {
  const [a, b, c] = hash.replace(/^#\/?/, "").split("/")
  if (a === "completed") return { view: "completed" }
  if (a === "settings") return { view: "settings" }
  if (a === "terms") return { view: "terms" }
  if (a === "term" && b) return { view: "term", term: b }
  if (a && isPillar(a)) {
    if (b === "completed") return { view: "completed", pillar: a }
    if (b === "repeating") return { view: "repeating", pillar: a }
    if (b === "term" && c) return { view: "pillar", pillar: a, term: c }
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
const lines = (n: number) => `${n} line${n === 1 ? "" : "s"}`
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

/** Focus an input with the cursor after its words, so editing starts at the end. */
function useFocusEnd(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [ref])
}

/** Hold (or right-click) to open a line's options; `held` lets the click that ends a hold be ignored. */
function useHold(onHold: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)
  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
  }
  return {
    held,
    handlers: {
      onPointerDown: () => {
        held.current = false
        clear()
        timer.current = setTimeout(() => {
          held.current = true
          onHold()
          navigator.vibrate?.(15)
        }, 550)
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        onHold()
      },
    },
  }
}

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
        <a href="#/terms" className="fm-small">
          terms
        </a>
        <a href="#/settings" className="fm-small">
          settings
        </a>
      </div>
    </main>
  )
}

/* ───────── Lines ───────── */

/** A row of small underlined choices, e.g. edit · delete · keep. */
function Actions({ items }: { items: [string, () => void][] }) {
  return (
    <div className="fm-meta fm-actions">
      {items.map(([label, run], i) => (
        <Fragment key={label}>
          {i > 0 && "  ·  "}
          <button type="button" className="fm-act" onClick={run}>
            {label}
          </button>
        </Fragment>
      ))}
    </div>
  )
}

/** After an edit, say where the line went if it left the list it was on. */
function editNote(before: Task, after: Task, terms: Term[]) {
  if (after.repeat && after.due !== undefined && after.due > startOfDay(new Date()).getTime()) return `"${after.text}" next due ${dayName(after.due)}`
  if (before.repeat && !after.repeat) return `"${after.text}" no longer repeats`
  if (before.term !== after.term) {
    const t = terms.find((x) => x.id === after.term)
    return t ? `"${after.text}" moved to ${t.name.toLowerCase()}` : `"${after.text}" has no term now`
  }
  return ""
}

/** A note that clears itself after a few seconds. */
function useNote() {
  const [note, setNote] = useState("")
  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(""), 6000)
    return () => clearTimeout(t)
  }, [note])
  return [note, setNote] as const
}

function Line({ task, onNote }: { task: Task; onNote: (note: string) => void }) {
  const { toggle, remove, edit } = useFourM.getState()
  const [mode, setMode] = useState<"idle" | "armed" | "editing">("idle")
  // Hold a line to edit or delete it; a normal tap ticks it.
  const { held, handlers } = useHold(() => setMode("armed"))

  if (mode === "editing")
    return (
      <li className="fm-line">
        <LineForm
          text={task.text}
          draft={fromRule(task.repeat)}
          term={task.term}
          label="Edit line"
          submit="save"
          cancel="cancel"
          onCancel={() => setMode("idle")}
          onSubmit={(text, rule, term) => {
            const after = edit(task.id, text, rule, term)
            setMode("idle")
            if (after) onNote(editNote(task, after, useFourM.getState().terms))
          }}
        />
      </li>
    )

  return (
    <li className="fm-line">
      <button
        type="button"
        className={task.completedAt ? "fm-task fm-done" : "fm-task"}
        {...handlers}
        onClick={() => {
          if (held.current) return
          toggle(task.id)
        }}
        onKeyDown={(e) => (e.key === "Delete" || e.key === "Backspace") && setMode("armed")}
      >
        <span className="fm-box">{task.completedAt ? "[x]" : "[ ]"}</span> <span className="fm-text">{task.text}</span>
      </button>
      {mode === "armed" ? (
        // Ticked lines can only be deleted (or unticked); editing is for open ones.
        <Actions
          items={[
            ...(task.completedAt ? [] : ([["edit", () => setMode("editing")]] as [string, () => void][])),
            ["delete", () => remove(task.id)],
            ["keep", () => setMode("idle")],
          ]}
        />
      ) : (
        <Meta lines={meta(task)} />
      )}
    </li>
  )
}

/** A list's lines for today: open ones (stalest first, a repeating line counting from the day it fell due), and ones ticked today. */
function useDay(list: Task[]) {
  const autoClean = useFourM((s) => s.autoClean)
  const today = useToday()
  const [showDone, setShowDone] = useState(false)
  const age = (t: Task) => (t.repeat ? t.due ?? 0 : t.createdAt)
  const open = list.filter((t) => (t.repeat ? (t.due ?? 0) <= today : !t.completedAt)).sort((a, b) => age(a) - age(b))
  const doneToday = list.filter((t) => t.completedAt && t.completedAt >= today).sort((a, b) => a.completedAt! - b.completedAt!)

  useEffect(() => {
    if (!doneToday.length) setShowDone(false)
  }, [doneToday.length])

  return {
    shown: autoClean || showDone ? [...open, ...doneToday] : open,
    toggle:
      !autoClean && doneToday.length > 0 ? (
        <button type="button" className="fm-toggle" aria-pressed={showDone} onClick={() => setShowDone((v) => !v)}>
          {showDone ? "hide completed" : `show completed (${doneToday.length})`}
        </button>
      ) : null,
  }
}

interface Group {
  key: string
  /** No title: the lines show without a heading. */
  title?: string
  href?: string
  items: Task[]
}

/** Lines under ── HEADING ── dividers; a heading with a link opens that group on its own. */
function Sections({ groups, onNote }: { groups: Group[]; onNote: (note: string) => void }) {
  return (
    <>
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <Fragment key={g.key}>
            {g.title &&
              (g.href ? (
                <a className="fm-section" href={g.href}>
                  {g.title}
                </a>
              ) : (
                <div className="fm-section">{g.title}</div>
              ))}
            <ul className="fm-list">
              {g.items.map((t) => (
                <Line key={t.id} task={t} onNote={onNote} />
              ))}
            </ul>
          </Fragment>
        ))}
    </>
  )
}

/** all · short · medium · long · …  The chosen one is inverted. */
function TagRow({ terms, active, href, all }: { terms: Term[]; active?: string; href: (id: string) => string; all?: string }) {
  if (!terms.length) return null
  const tag = (key: string, link: string, label: string, on: boolean) => (
    <a key={key} href={link} className={on ? "fm-range fm-on" : "fm-range"} aria-current={on ? "page" : undefined}>
      {label}
    </a>
  )
  return (
    <nav className="fm-ranges fm-tags" aria-label="Terms">
      {all !== undefined && tag("", all, "all", !active)}
      {terms.map((t) => tag(t.id, href(t.id), t.name.toLowerCase(), t.id === active))}
    </nav>
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

/** The picker's state for an existing line's rule, so editing opens on what's set. */
function fromRule(r?: Rule): Draft {
  const d = freshDraft()
  if (!r) return d
  const base: Draft = { ...d, every: r.every, unit: r.unit, days: r.days?.length ? r.days : d.days, date: r.date ?? d.date, month: r.month ?? d.month }
  if (r.unit === "day" && r.every === 1) return { ...base, preset: "daily" }
  if (r.unit === "day" && r.every <= 60) return { ...base, preset: "few", few: r.every }
  if (r.unit === "week" && r.every === 1) return { ...base, preset: "days" }
  if (r.unit === "month" && r.every === 1) return { ...base, preset: "monthly" }
  return { ...base, preset: "custom" }
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

/** term: none · short · medium · long · …, plus "+ new" to make a term without leaving the line. */
function TermPicker({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const terms = useFourM((s) => s.terms)
  const addTerm = useFourM((s) => s.addTerm)
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [newName, setNewName] = useState("")
  const current = terms.find((t) => t.id === value)
  const create = () => {
    const t = addTerm(newName)
    if (!t) return
    onChange(t.id)
    setNaming(false)
    setNewName("")
  }
  const chip = (key: string, label: string, on: boolean, run: () => void) => (
    <button key={key} type="button" aria-pressed={on} className={on ? "fm-range fm-on" : "fm-range"} onClick={run}>
      {label}
    </button>
  )
  return (
    <div className="fm-repeat">
      <button type="button" className={open ? "fm-termbtn fm-open" : "fm-termbtn"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        term: {current ? current.name.toLowerCase() : "none"}
      </button>
      {open && (
        <div className="fm-ranges fm-termchips">
          {chip("", "none", !current, () => onChange(undefined))}
          {terms.map((t) => chip(t.id, t.name.toLowerCase(), t.id === current?.id, () => onChange(t.id)))}
          {!naming && chip("+", "+ new", false, () => setNaming(true))}
        </div>
      )}
      {open && naming && (
        // Not a <form>: this sits inside the line's form.
        <div className="fm-newterm">
          <input
            autoFocus
            className="fm-input fm-input-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                create()
              } else if (e.key === "Escape") {
                e.preventDefault()
                setNaming(false)
              }
            }}
            placeholder="term name"
            aria-label="New term name"
            enterKeyHint="done"
            maxLength={24}
          />
          <div className="fm-formacts fm-formacts-sm">
            <button type="button" className="fm-act" onClick={create}>
              add term
            </button>
            {"  ·  "}
            <button type="button" className="fm-act" onClick={() => setNaming(false)}>
              cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** The words, term and repeat for a line: used both to add new lines and to edit one in place. */
function LineForm({
  text: initialText = "",
  draft: initialDraft,
  term: initialTerm,
  label,
  submit,
  cancel,
  reset = false,
  onSubmit,
  onCancel,
}: {
  text?: string
  draft?: Draft
  term?: string
  label: string
  submit: string
  cancel: string
  /** Clear after submitting, ready for the next line (the term stays). */
  reset?: boolean
  onSubmit: (text: string, rule: Rule | undefined, term: string | undefined) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initialText)
  const [draft, setDraft] = useState<Draft>(() => initialDraft ?? freshDraft())
  const [term, setTerm] = useState(initialTerm)
  const input = useRef<HTMLInputElement>(null)
  useFocusEnd(input)

  return (
    <form
      className="fm-addform"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        if (!text.trim()) return input.current?.focus()
        onSubmit(text, toRule(draft), term)
        if (reset) {
          setText("")
          setDraft(freshDraft())
          input.current?.focus() // stay open for the next line
        }
      }}
    >
      <input
        ref={input}
        className="fm-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        placeholder="new line"
        enterKeyHint="done"
        aria-label={label}
        maxLength={120}
      />
      <TermPicker value={term} onChange={setTerm} />
      <RepeatPicker draft={draft} onChange={setDraft} />
      <div className="fm-formacts">
        <button type="submit" className="fm-act">
          {submit}
        </button>
        {"  ·  "}
        <button type="button" className="fm-act" onClick={onCancel}>
          {cancel}
        </button>
      </div>
    </form>
  )
}

function AddLine({ pillar, term }: { pillar: PillarId; term?: string }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const add = useFourM((s) => s.add)

  if (!open)
    return (
      <button type="button" className="fm-add" onClick={() => setOpen(true)}>
        + add
      </button>
    )

  return (
    <>
      <LineForm
        term={term}
        label="New line"
        submit="add"
        cancel="close"
        reset
        onSubmit={(text, rule, chosen) => {
          const t = add(pillar, text, rule, chosen)
          // Say where a new line went if it won't show here yet: a repeat that starts later, or another term than this page's.
          const other = term && chosen !== term ? useFourM.getState().terms.find((x) => x.id === chosen) : undefined
          setNote(
            t?.due !== undefined && t.due > startOfDay(new Date()).getTime()
              ? `"${t.text}" starts ${dayName(t.due)}`
              : t && term && chosen !== term
                ? `"${t.text}" added to ${other ? other.name.toLowerCase() : "no term"}`
                : "",
          )
        }}
        onCancel={() => {
          setOpen(false)
          setNote("")
        }}
      />
      {note && <div className="fm-meta fm-note">{note}</div>}
    </>
  )
}

/* ───────── A pillar: your own short list, by term ───────── */

function Pillar({ pillar, term }: { pillar: PillarId; term?: string }) {
  const tasks = useFourM((s) => s.tasks)
  const terms = useFourM((s) => s.terms)
  const [note, setNote] = useNote()
  const active = terms.find((t) => t.id === term)

  const mine = tasks.filter((t) => t.pillar === pillar)
  const inView = active ? mine.filter((t) => t.term === active.id) : mine
  const { shown, toggle } = useDay(inView)
  const repeating = mine.filter((t) => t.repeat).length

  // Under "all", lines sit under their term's heading, in the terms' order, then any without a term.
  const known = (t: Task) => (t.term && terms.some((x) => x.id === t.term) ? t.term : "")
  const grouped = !active && shown.some(known)
  const groups: Group[] = grouped
    ? [
        ...terms.map((x) => ({ key: x.id, title: x.name.toUpperCase(), href: `#/${pillar}/term/${x.id}`, items: shown.filter((t) => known(t) === x.id) })),
        { key: "", title: "NO TERM", items: shown.filter((t) => !known(t)) },
      ]
    : [{ key: "", items: shown }]

  return (
    <main className="fm-screen">
      <a href="#/" className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">{name(pillar)}</h1>
      <TagRow terms={terms} active={active?.id} all={`#/${pillar}`} href={(id) => `#/${pillar}/term/${id}`} />
      <Sections groups={groups} onNote={setNote} />
      {!shown.length && <p className="fm-empty">{inView.length ? "nothing left today." : "nothing here yet."}</p>}
      {note && <div className="fm-meta fm-note">{note}</div>}
      <AddLine key={active?.id ?? ""} pillar={pillar} term={active?.id} />
      {toggle}
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

/* ───────── Terms ───────── */

/** A small form for a term's name: new, or renaming. */
function NameForm({ text = "", label, submit, cancel, reset = false, onSubmit, onCancel }: { text?: string; label: string; submit: string; cancel: string; reset?: boolean; onSubmit: (name: string) => boolean; onCancel: () => void }) {
  const [value, setValue] = useState(text)
  const [taken, setTaken] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useFocusEnd(input)
  return (
    <form
      className="fm-addform"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        if (!value.trim()) return input.current?.focus()
        const ok = onSubmit(value)
        setTaken(!ok)
        if (ok && reset) setValue("")
        input.current?.focus()
      }}
    >
      <input
        ref={input}
        className="fm-input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setTaken(false)
        }}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        placeholder="term name"
        enterKeyHint="done"
        aria-label={label}
        maxLength={24}
      />
      {taken && <div className="fm-meta fm-note">another term has that name</div>}
      <div className="fm-formacts">
        <button type="submit" className="fm-act">
          {submit}
        </button>
        {"  ·  "}
        <button type="button" className="fm-act" onClick={onCancel}>
          {cancel}
        </button>
      </div>
    </form>
  )
}

function TermItem({ term, count }: { term: Term; count: number }) {
  const { renameTerm, removeTerm } = useFourM.getState()
  const [mode, setMode] = useState<"idle" | "armed" | "renaming" | "removing">("idle")
  const { held, handlers } = useHold(() => setMode("armed"))

  if (mode === "renaming")
    return (
      <li className="fm-line">
        <NameForm
          text={term.name}
          label="Rename term"
          submit="save"
          cancel="cancel"
          onCancel={() => setMode("idle")}
          onSubmit={(n) => {
            const ok = renameTerm(term.id, n)
            if (ok) setMode("idle")
            return ok
          }}
        />
      </li>
    )

  return (
    <li className="fm-line">
      <button
        type="button"
        className="fm-task"
        {...handlers}
        onClick={() => {
          if (!held.current) window.location.hash = `#/term/${term.id}`
        }}
      >
        {term.name.toLowerCase()}
      </button>
      {mode === "armed" ? (
        <Actions
          items={[
            ["rename", () => setMode("renaming")],
            ["remove", () => setMode("removing")],
            ["keep", () => setMode("idle")],
          ]}
        />
      ) : mode === "removing" ? (
        <>
          <div className="fm-meta">
            remove &ldquo;{term.name.toLowerCase()}&rdquo;?{count > 0 && ` its ${lines(count)} ${count === 1 ? "stays" : "stay"}, without a term.`}
          </div>
          <Actions
            items={[
              ["remove", () => removeTerm(term.id)],
              ["keep", () => setMode("idle")],
            ]}
          />
        </>
      ) : (
        <Meta lines={[count ? lines(count) : "no lines"]} />
      )}
    </li>
  )
}

function Terms() {
  const terms = useFourM((s) => s.terms)
  const tasks = useFourM((s) => s.tasks)
  const addTerm = useFourM((s) => s.addTerm)
  const [adding, setAdding] = useState(false)
  // Lines still to do: open one-offs and repeating lines.
  const count = (id: string) => tasks.filter((t) => t.term === id && !t.completedAt).length
  return (
    <main className="fm-screen">
      <a href="#/" className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">TERMS</h1>
      <ul className="fm-list">
        {terms.map((t) => (
          <TermItem key={t.id} term={t} count={count(t.id)} />
        ))}
      </ul>
      {!terms.length && <p className="fm-empty">no terms.</p>}
      {adding ? (
        <NameForm
          label="New term"
          submit="add"
          cancel="close"
          reset
          onCancel={() => setAdding(false)}
          onSubmit={(n) => {
            const before = useFourM.getState().terms.length
            addTerm(n)
            return useFourM.getState().terms.length > before
          }}
        />
      ) : (
        <button type="button" className="fm-add" onClick={() => setAdding(true)}>
          + new term
        </button>
      )}
      {terms.length > 0 && <div className="fm-small fm-foot fm-hint">hold a term to rename or remove it</div>}
    </main>
  )
}

/** One term across all four pillars, grouped by pillar. */
function TermPage({ id }: { id: string }) {
  const tasks = useFourM((s) => s.tasks)
  const terms = useFourM((s) => s.terms)
  const [note, setNote] = useNote()
  const term = terms.find((t) => t.id === id)
  const inView = term ? tasks.filter((t) => t.term === id) : []
  const { shown, toggle } = useDay(inView)

  if (!term)
    return (
      <main className="fm-screen">
        <a href="#/terms" className="fm-small">
          ‹ back
        </a>
        <h1 className="fm-title">TERMS</h1>
        <p className="fm-empty">this term was removed.</p>
      </main>
    )

  const groups: Group[] = PILLARS.map((p) => ({ key: p.id, title: p.name, href: `#/${p.id}/term/${id}`, items: shown.filter((t) => t.pillar === p.id) }))
  return (
    <main className="fm-screen">
      <a href="#/terms" className="fm-small">
        ‹ back
      </a>
      <h1 className="fm-title">{term.name.toUpperCase()}</h1>
      <div className="fm-small">ALL FOUR</div>
      <TagRow terms={terms} active={id} href={(t) => `#/term/${t}`} />
      <Sections groups={groups} onNote={setNote} />
      {!shown.length && <p className="fm-empty">{inView.length ? "nothing left today." : "nothing here yet."}</p>}
      {note && <div className="fm-meta fm-note">{note}</div>}
      {toggle}
      <div className="fm-small fm-foot fm-hint">to add a line, open a pillar</div>
    </main>
  )
}

/* ───────── A pillar's repeating lines, including ones not due today ───────── */

function RepeatItem({ task, onNote }: { task: Task; onNote: (note: string) => void }) {
  const { remove, edit } = useFourM.getState()
  const [mode, setMode] = useState<"idle" | "armed" | "editing">("idle")
  const due = task.due ?? Date.now()
  const late = since(due)
  const when = late > 0 ? `due ${shortDate(due)} · ${days(late)}` : late === 0 ? "due today" : `next ${dayName(due)}`

  if (mode === "editing")
    return (
      <li className="fm-line">
        <LineForm
          text={task.text}
          draft={fromRule(task.repeat)}
          term={task.term}
          label="Edit line"
          submit="save"
          cancel="cancel"
          onCancel={() => setMode("idle")}
          onSubmit={(text, rule, term) => {
            const after = edit(task.id, text, rule, term)
            setMode("idle")
            // Here the new date already shows under the line; only say so if it left this screen.
            if (after && !after.repeat) onNote(`"${after.text}" no longer repeats; it's on the ${name(after.pillar).toLowerCase()} list`)
          }}
        />
      </li>
    )

  return (
    <li className="fm-line">
      <button type="button" className="fm-task" onClick={() => setMode((m) => (m === "armed" ? "idle" : "armed"))}>
        {task.text}
      </button>
      {mode === "armed" ? (
        <Actions
          items={[
            ["edit", () => setMode("editing")],
            ["delete", () => remove(task.id)],
            ["keep", () => setMode("idle")],
          ]}
        />
      ) : (
        <Meta lines={[ruleText(task.repeat!), when]} />
      )}
    </li>
  )
}

function Repeating({ pillar }: { pillar: PillarId }) {
  const tasks = useFourM((s) => s.tasks)
  useToday()
  const [note, setNote] = useNote()
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
          <RepeatItem key={t.id} task={t} onNote={setNote} />
        ))}
      </ul>
      {!list.length && <p className="fm-empty">no repeating lines.</p>}
      {note && <div className="fm-meta fm-note">{note}</div>}
      {list.length > 0 && <div className="fm-small fm-foot fm-hint">tap a line to edit or delete it</div>}
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
      return <Pillar key={route.pillar} pillar={route.pillar} term={route.term} />
    case "repeating":
      return <Repeating pillar={route.pillar} />
    case "completed":
      return <Completed pillar={route.pillar} />
    case "terms":
      return <Terms />
    case "term":
      return <TermPage key={route.term} id={route.term} />
    case "settings":
      return <Settings />
    default:
      return <Home />
  }
}
