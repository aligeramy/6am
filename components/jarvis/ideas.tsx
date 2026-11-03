"use client"

import { formatDistanceToNowStrict } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Lightbulb, Mic, Search, Star, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useJarvis } from "@/lib/jarvis/store"
import type { Idea, IdeaStatus } from "@/lib/jarvis/types"
import { voice } from "@/lib/jarvis/voice"
import { cn } from "@/lib/utils"
import { Empty, HudButton, HudPanel } from "./hud"
import { useQuickLog } from "./quick-log"

const STATUSES: { id: IdeaStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "exploring", label: "Exploring" },
  { id: "doing", label: "Doing" },
  { id: "parked", label: "Parked" },
  { id: "done", label: "Done" },
]

/* ───────── Stars ───────── */

export function StarRating({ value, onChange, size = 16, className }: { value: number; onChange?: (n: number) => void; size?: number; className?: string }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className={cn("flex items-center", className)} onMouseLeave={() => setHover(0)} role={onChange ? "radiogroup" : "img"} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= shown
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={cn("transition-all duration-200", on ? "fill-[var(--j-amber)] text-[var(--j-amber)] drop-shadow-[0_0_6px_var(--j-amber)]" : "text-[var(--j-faint)]")}
            strokeWidth={1.6}
          />
        )
        return onChange ? (
          <motion.button
            key={n}
            type="button"
            whileTap={{ scale: 0.8 }}
            onMouseEnter={() => setHover(n)}
            onClick={(e) => {
              e.stopPropagation()
              onChange(n === value ? 0 : n)
            }}
            className="p-[2px]"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            title={n === value ? "Clear rating" : `${n} star${n > 1 ? "s" : ""}`}
          >
            {star}
          </motion.button>
        ) : (
          <span key={n} className="p-[1px]">
            {star}
          </span>
        )
      })}
    </div>
  )
}

/* ───────── Capture (text or voice) ───────── */

function useCapture() {
  const addIdea = useJarvis((s) => s.addIdea)
  const capture = (title: string, extra?: { note?: string; rating?: number; tags?: string[] }) => {
    const t = title.trim()
    if (!t) return null
    const idea = addIdea({ title: t, ...extra })
    useQuickLog.getState().flash("Idea captured")
    return idea
  }
  const listen = () => voice.beginCommand((spoken) => capture(spoken.charAt(0).toUpperCase() + spoken.slice(1)))
  return { capture, listen }
}

function CaptureRow({ autoFocus }: { autoFocus?: boolean }) {
  const [text, setText] = useState("")
  const { capture, listen } = useCapture()
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (capture(text)) setText("")
      }}
    >
      <div className="relative flex-1">
        <Lightbulb className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--j-faint)]" />
        <input
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture an idea…"
          className="hud-input !rounded-full py-2 pl-9"
          aria-label="New idea"
        />
      </div>
      <button type="button" onClick={listen} className="icon-btn border border-[var(--j-line)]" aria-label="Say an idea" title="Say an idea">
        <Mic className="h-4 w-4" />
      </button>
    </form>
  )
}

const sortIdeas = (ideas: Idea[], sort: string) =>
  [...ideas].sort((a, b) => {
    if (sort === "newest") return b.createdAt - a.createdAt
    if (sort === "updated") return b.updatedAt - a.updatedAt
    if (sort === "unrated") return (a.rating === 0 ? -1 : 0) - (b.rating === 0 ? -1 : 0) || b.createdAt - a.createdAt
    return b.rating - a.rating || b.updatedAt - a.updatedAt
  })

const openIdea = (id?: string) => useJarvis.getState().setUI({ activePillar: "ideas", focusIdea: id ?? null })

/* ───────── Dashboard card ───────── */

export function IdeasCard() {
  const ideas = useJarvis((s) => s.ideas)
  const updateIdea = useJarvis((s) => s.updateIdea)
  // "Recent" keeps a just-captured idea in view so it can be rated straight away.
  const [view, setView] = useState<"recent" | "top">("recent")
  const top = sortIdeas(
    ideas.filter((i) => i.status !== "done"),
    view === "top" ? "top" : "updated",
  ).slice(0, 4)
  return (
    <HudPanel
      title="Ideas"
      section="ideas"
      right={
        <div className="flex items-center gap-2 text-[0.75rem]">
          {(["recent", "top"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn("capitalize transition-colors", view === v ? "text-[var(--j-ice)]" : "text-[var(--j-faint)] hover:text-[var(--j-muted)]")}
              aria-pressed={view === v}
            >
              {v}
            </button>
          ))}
          <button type="button" onClick={() => openIdea()} className="ml-1 rounded-full border border-[var(--j-line)] px-2 py-0.5 text-[var(--j-muted)] transition-colors hover:text-white">
            {ideas.length ? `All ${ideas.length}` : "Open"}
          </button>
        </div>
      }
    >
      <div className="space-y-2 px-3 pb-3 pt-2.5">
        <CaptureRow />
        {top.length === 0 ? (
          <Empty>Capture ideas by typing, the mic, or “Jared, idea: …”</Empty>
        ) : (
          <ul className="space-y-0.5">
            {top.map((i) => (
              <li key={i.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openIdea(i.id)}
                  onKeyDown={(e) => e.key === "Enter" && openIdea(i.id)}
                  className="group flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-[rgba(var(--j-cyan-rgb),0.05)]"
                >
                  <span className="min-w-0 flex-1 truncate text-[0.9rem] text-[var(--j-text)]">{i.title}</span>
                  {i.notes.length > 0 && <span className="text-[0.7rem] text-[var(--j-faint)]">{i.notes.length} note{i.notes.length > 1 ? "s" : ""}</span>}
                  <StarRating value={i.rating} size={13} onChange={(n) => updateIdea(i.id, { rating: n })} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </HudPanel>
  )
}

/* ───────── Full vault (detail sheet) ───────── */

function IdeaRow({ idea, open, onToggle }: { idea: Idea; open: boolean; onToggle: () => void }) {
  const { updateIdea, addIdeaNote, deleteIdeaNote, deleteIdea } = useJarvis.getState()
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 250)
  }, [open])

  return (
    <motion.div ref={ref} layout="position" className={cn("inset-panel overflow-hidden transition-colors duration-300", open && "border-[rgba(var(--j-cyan-rgb),0.22)]")}>
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()} className="flex cursor-pointer items-center gap-3 px-4 py-3">
        <StarRating value={idea.rating} size={15} onChange={(n) => updateIdea(idea.id, { rating: n })} />
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[0.95rem] font-medium", idea.status === "done" ? "text-[var(--j-faint)] line-through" : "text-[var(--j-text)]")}>{idea.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.72rem] text-[var(--j-faint)]">
            <span className="capitalize text-[var(--j-muted)]">{idea.status}</span>
            {idea.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
            {idea.notes.length > 0 && <span>{idea.notes.length} note{idea.notes.length > 1 ? "s" : ""}</span>}
            <span>{formatDistanceToNowStrict(idea.createdAt, { addSuffix: true })}</span>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--j-faint)] transition-transform duration-300", open && "rotate-180")} />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-[var(--j-line)] px-4 pb-4 pt-3">
              <input
                className="hud-input text-base font-medium"
                defaultValue={idea.title}
                onBlur={(e) => e.target.value.trim() && e.target.value !== idea.title && updateIdea(idea.id, { title: e.target.value.trim() })}
                aria-label="Idea title"
              />

              <div className="flex flex-wrap gap-1">
                {STATUSES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateIdea(idea.id, { status: st.id })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[0.78rem] transition-all duration-200",
                      idea.status === st.id
                        ? "border-[rgba(var(--j-cyan-rgb),0.6)] bg-[rgba(var(--j-cyan-rgb),0.14)] text-white"
                        : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="hud-label mb-2">Notes</div>
                {idea.notes.length === 0 && <div className="text-[0.82rem] text-[var(--j-faint)]">No notes yet. Annotate as the idea evolves.</div>}
                <ul className="space-y-2">
                  {idea.notes.map((n) => (
                    <li key={n.id} className="group flex gap-3">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--j-cyan)] shadow-[0_0_6px_var(--j-cyan)]" />
                      <div className="min-w-0 flex-1">
                        <div className="whitespace-pre-wrap text-[0.88rem] leading-relaxed text-[var(--j-text)]">{n.text}</div>
                        <div className="text-[0.7rem] text-[var(--j-faint)]">{formatDistanceToNowStrict(n.ts, { addSuffix: true })}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteIdeaNote(idea.id, n.id)}
                        className="self-start p-1 text-[var(--j-faint)] opacity-0 transition-opacity hover:text-[var(--j-red)] group-hover:opacity-100"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!note.trim()) return
                    addIdeaNote(idea.id, note)
                    setNote("")
                  }}
                >
                  <input className="hud-input" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} aria-label="New note" />
                  <button
                    type="button"
                    onClick={() => voice.beginCommand((t) => addIdeaNote(idea.id, t))}
                    className="icon-btn shrink-0 border border-[var(--j-line)]"
                    aria-label="Dictate a note"
                    title="Dictate a note"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <HudButton type="submit" disabled={!note.trim()}>
                    Add
                  </HudButton>
                </form>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="hud-input max-w-xs py-1.5 text-sm"
                  placeholder="Tags, comma separated"
                  defaultValue={idea.tags.join(", ")}
                  onBlur={(e) => updateIdea(idea.id, { tags: e.target.value.split(",") })}
                  aria-label="Tags"
                />
                <div className="flex-1" />
                {confirm ? (
                  <HudButton variant="danger" onClick={() => deleteIdea(idea.id)}>
                    Confirm delete
                  </HudButton>
                ) : (
                  <HudButton variant="ghost" onClick={() => setConfirm(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </HudButton>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function IdeasBody() {
  const ideas = useJarvis((s) => s.ideas)
  const focus = useJarvis((s) => s.focusIdea)
  const [openId, setOpenId] = useState<string | null>(focus)
  const [q, setQ] = useState("")
  const [sort, setSort] = useState("top")
  const [minStars, setMinStars] = useState(0)
  const [status, setStatus] = useState<IdeaStatus | "all" | "active">("active")
  const [tag, setTag] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: "", note: "", rating: 0, tags: "" })
  const { capture, listen } = useCapture()

  useEffect(() => {
    if (focus) setOpenId(focus)
  }, [focus])

  const tags = useMemo(() => [...new Set(ideas.flatMap((i) => i.tags))].sort(), [ideas])
  const shown = sortIdeas(
    ideas.filter(
      (i) =>
        (status === "all" || (status === "active" ? i.status !== "done" && i.status !== "parked" : i.status === status)) &&
        i.rating >= minStars &&
        (!tag || i.tags.includes(tag)) &&
        (!q.trim() || `${i.title} ${i.notes.map((n) => n.text).join(" ")} ${i.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())),
    ),
    sort,
  )
  const avg = ideas.filter((i) => i.rating).reduce((a, i, _, arr) => a + i.rating / arr.length, 0)

  return (
    <div className="space-y-4">
      <form
        className="inset-panel space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (capture(draft.title, { note: draft.note, rating: draft.rating, tags: draft.tags.split(",") })) setDraft({ title: "", note: "", rating: 0, tags: "" })
        }}
      >
        <div className="flex items-center justify-between">
          <span className="hud-label">New idea</span>
          <StarRating value={draft.rating} onChange={(n) => setDraft((d) => ({ ...d, rating: n }))} />
        </div>
        <div className="flex gap-2">
          <input
            className="hud-input text-base"
            placeholder="What's the idea?"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            aria-label="Idea title"
          />
          <button type="button" onClick={listen} className="icon-btn shrink-0 border border-[var(--j-line)]" aria-label="Say an idea" title="Say an idea">
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <textarea
          className="hud-input min-h-[60px]"
          placeholder="First note (optional)"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          aria-label="First note"
        />
        <div className="flex gap-2">
          <input className="hud-input" placeholder="Tags, comma separated" value={draft.tags} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} aria-label="Tags" />
          <HudButton variant="solid" type="submit" disabled={!draft.title.trim()}>
            Save idea
          </HudButton>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--j-faint)]" />
          <input className="hud-input !rounded-full py-1.5 pl-9 text-sm" placeholder="Search ideas and notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ideas" />
        </div>
        <select className="hud-input !w-auto !rounded-full py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="top">Top rated</option>
          <option value="newest">Newest</option>
          <option value="updated">Recently updated</option>
          <option value="unrated">Unrated first</option>
        </select>
        <select className="hud-input !w-auto !rounded-full py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status filter">
          <option value="active">Active</option>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[0.75rem] text-[var(--j-faint)]">At least</span>
        <StarRating value={minStars} size={14} onChange={setMinStars} />
        {tags.length > 0 && <span className="mx-2 h-4 w-px bg-[var(--j-line-strong)]" />}
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(tag === t ? null : t)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[0.75rem] transition-all",
              tag === t ? "border-[rgba(var(--j-cyan-rgb),0.6)] bg-[rgba(var(--j-cyan-rgb),0.14)] text-white" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
            )}
          >
            #{t}
          </button>
        ))}
        <span className="ml-auto text-[0.75rem] text-[var(--j-faint)]">
          {shown.length} of {ideas.length}
          {avg ? ` · avg ${avg.toFixed(1)}★` : ""}
        </span>
      </div>

      <div className="space-y-2">
        {shown.length === 0 ? (
          <Empty>{ideas.length ? "No ideas match these filters." : "Your ideas vault is empty. Capture the first one above."}</Empty>
        ) : (
          shown.map((i) => <IdeaRow key={i.id} idea={i} open={openId === i.id} onToggle={() => setOpenId(openId === i.id ? null : i.id)} />)
        )}
      </div>
    </div>
  )
}
