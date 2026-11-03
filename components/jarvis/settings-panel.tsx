"use client"

import { Download, Upload } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { demoData } from "@/lib/jarvis/demo"
import { ADDRESS_PRESETS } from "@/lib/jarvis/pillars"
import { backupData, useJarvis } from "@/lib/jarvis/store"
import { testKey } from "@/lib/jarvis/brain"
import { geocode, refreshWeather, useWeather, weatherLine } from "@/lib/jarvis/weather"
import type { Targets } from "@/lib/jarvis/types"
import { voice } from "@/lib/jarvis/voice"
import { cn } from "@/lib/utils"
import { HudButton, Toggle } from "./hud"
import { Modal, ModalHeader } from "./quick-log"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5 border-b border-[var(--j-line)] px-5 py-5">
      <h3 className="font-hud text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--j-cyan)]">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[0.85rem] text-[var(--j-text)]">{label}</div>
        {hint && <div className="text-[0.75rem] text-[var(--j-faint)]">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

const TARGET_FIELDS: { key: keyof Targets; label: string; unit: string }[] = [
  { key: "sleep", label: "Sleep", unit: "h / night" },
  { key: "workout", label: "Workouts", unit: "/ week" },
  { key: "water", label: "Water", unit: "glasses / day" },
  { key: "reading", label: "Reading", unit: "min / day" },
  { key: "meditation", label: "Meditation", unit: "min / day" },
  { key: "learning", label: "Learning", unit: "min / day" },
  { key: "deepwork", label: "Deep work", unit: "h / week" },
  { key: "gratitude", label: "Gratitude", unit: "/ week" },
]

export function SettingsPanel({ online }: { online: boolean | null }) {
  const open = useJarvis((s) => s.settingsOpen)
  const st = useJarvis((s) => s.settings)
  const update = useJarvis((s) => s.updateSettings)
  const close = () => useJarvis.getState().setUI({ settingsOpen: false })
  const [address, setAddress] = useState(st.address)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [confirmReset, setConfirmReset] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => setAddress(st.address), [st.address])

  useEffect(() => {
    if (!open || !voice.synthesisSupported) return
    const load = () => setVoices(voice.voices())
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load)
  }, [open])

  const saveAddress = (v: string) => {
    const a = v.trim()
    if (a) update({ address: a })
  }

  const test = () =>
    voice.speak(`Good morning, ${st.address}. All systems are online and standing by.`, {
      voiceURI: st.voiceURI,
      rate: st.voiceRate,
      pitch: st.voicePitch,
    })

  const doExport = () => {
    const blob = new Blob([JSON.stringify(backupData(), null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      useJarvis.getState().importData(data)
    } catch {
      alert("That file isn't a valid Jared backup.")
    }
  }

  const current = voice.pickVoice(st.voiceURI)

  return (
    <Modal open={open} onClose={close} variant="sheet">
      <ModalHeader title="SETTINGS" sub="Saved in this browser" onClose={close} />

      <Section title="Identity">
        <label className="block space-y-1">
          <span className="hud-label">Your name</span>
          <input className="hud-input" value={st.name} placeholder="Tony" onChange={(e) => update({ name: e.target.value })} />
        </label>
        <div className="space-y-1.5">
          <span className="hud-label">How Jared addresses you</span>
          <input
            className="hud-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => saveAddress(address)}
            onKeyDown={(e) => e.key === "Enter" && saveAddress(address)}
            placeholder="Sir"
            aria-label="Form of address"
          />
          <div className="flex flex-wrap gap-1.5">
            {[...ADDRESS_PRESETS, ...(st.name ? [st.name] : [])].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAddress(p)
                  saveAddress(p)
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.78rem] transition-all duration-200",
                  st.address === p ? "border-[rgba(var(--j-cyan-rgb),0.6)] bg-[rgba(var(--j-cyan-rgb),0.14)] text-white" : "border-[var(--j-line)] text-[var(--j-muted)] hover:text-white",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="text-[0.78rem] text-[var(--j-muted)]">
            Preview: “Good morning, {st.address}.” You can also just say “Jared, call me Boss.”
          </div>
        </div>
      </Section>

      <Section title="Neural link · Claude">
        <NeuralLink online={online} />
      </Section>

      <Section title="Look & layout">
        <Row label="Colors, sections, text size" hint="Change them by hand, or just tell the Workshop what you want">
          <HudButton
            onClick={() => {
              close()
              useJarvis.getState().setUI({ workshopOpen: true })
            }}
          >
            Open Workshop
          </HudButton>
        </Row>
      </Section>

      <Section title="Daily ritual">
        <Row label="Morning briefing" hint="Delivered at your wake time, or the first time you open Jared after it">
          <Toggle checked={st.briefingEnabled} onChange={(v) => update({ briefingEnabled: v })} label="Morning briefing" />
        </Row>
        <Row label="Wake time" hint="Briefing, then your morning plan">
          <input type="time" className="hud-input !w-36" value={st.wakeTime} onChange={(e) => e.target.value && update({ wakeTime: e.target.value })} />
        </Row>
        <Row label="Evening review" hint="When the review button lights up">
          <input type="time" className="hud-input !w-36" value={st.reviewTime} onChange={(e) => e.target.value && update({ reviewTime: e.target.value })} />
        </Row>
      </Section>

      <Section title="Weather">
        <WeatherSettings />
      </Section>

      <Section title="Voice">
        <Row label="Spoken replies" hint={voice.synthesisSupported ? undefined : "Not supported in this browser"}>
          <Toggle checked={st.voiceEnabled} onChange={(v) => update({ voiceEnabled: v })} label="Spoken replies" />
        </Row>
        <Row
          label="“Hey Jared” wake word"
          hint={voice.recognitionSupported ? "Listens continuously while this tab is open" : "Needs Chrome, Edge or Safari"}
        >
          <Toggle checked={st.wakeWordEnabled} onChange={(v) => update({ wakeWordEnabled: v })} label="Wake word" />
        </Row>
        <label className="block space-y-1">
          <span className="hud-label">Voice</span>
          <select className="hud-input" value={current?.voiceURI ?? ""} onChange={(e) => update({ voiceURI: e.target.value })}>
            {voices.length === 0 && <option value="">System default</option>}
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="hud-label">Rate · {st.voiceRate.toFixed(2)}</span>
            <input type="range" min={0.7} max={1.4} step={0.05} value={st.voiceRate} onChange={(e) => update({ voiceRate: parseFloat(e.target.value) })} className="w-full" />
          </label>
          <label className="space-y-1">
            <span className="hud-label">Pitch · {st.voicePitch.toFixed(2)}</span>
            <input type="range" min={0.5} max={1.5} step={0.05} value={st.voicePitch} onChange={(e) => update({ voicePitch: parseFloat(e.target.value) })} className="w-full" />
          </label>
        </div>
        <HudButton onClick={test}>Test voice</HudButton>
      </Section>

      <Section title="Targets">
        <div className="grid grid-cols-2 gap-3">
          {TARGET_FIELDS.map((f) => (
            <label key={f.key} className="space-y-1">
              <span className="hud-label">
                {f.label} <span className="normal-case tracking-normal text-[var(--j-faint)]">{f.unit}</span>
              </span>
              <input
                type="number"
                min={0}
                className="hud-input"
                defaultValue={st.targets[f.key]}
                onBlur={(e) => {
                  const v = parseFloat(e.target.value)
                  if (v > 0) update({ targets: { ...st.targets, [f.key]: v } })
                }}
              />
            </label>
          ))}
          <label className="space-y-1">
            <span className="hud-label">Weight unit</span>
            <select className="hud-input" value={st.weightUnit} onChange={(e) => update({ weightUnit: e.target.value as "lb" | "kg" })}>
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Security & system">
        <Row label="Boot sequence" hint="Full power-up animation on launch">
          <Toggle checked={st.bootSequence} onChange={(v) => update({ bootSequence: v })} label="Boot sequence" />
        </Row>
        <label className="block space-y-1">
          <span className="hud-label">Access code</span>
          <input
            type="password"
            className="hud-input"
            placeholder="Optional: required at startup"
            defaultValue={st.passcode ?? ""}
            onBlur={(e) => update({ passcode: e.target.value || undefined })}
          />
          <span className="block text-[0.75rem] text-[var(--j-faint)]">
            Asked for when Jared starts. On a server deploy, set the same value as JARVIS_ACCESS_CODE so strangers can't spend your API credits.
          </span>
        </label>
      </Section>

      <Section title="Data">
        <div className="flex flex-wrap gap-2">
          <HudButton onClick={doExport}>
            <Download className="h-3.5 w-3.5" /> Export backup
          </HudButton>
          <HudButton onClick={() => file.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Import
          </HudButton>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ""
            }}
          />
          <HudButton
            onClick={() => {
              if (confirm("Load sample data? This replaces your current logs, habits, missions and journal.")) {
                useJarvis.getState().importData({ ...demoData(), seenAchievements: [] })
              }
            }}
          >
            Load sample data
          </HudButton>
          {confirmReset ? (
            <HudButton
              variant="danger"
              onClick={() => {
                useJarvis.getState().resetAll()
                setConfirmReset(false)
              }}
            >
              Confirm: erase everything
            </HudButton>
          ) : (
            <HudButton variant="danger" onClick={() => setConfirmReset(true)}>
              Reset all data
            </HudButton>
          )}
        </div>
        <p className="text-[0.75rem] text-[var(--j-faint)]">
          Everything lives in this browser&apos;s storage. Export a backup regularly until cloud sync is connected.
        </p>
      </Section>
    </Modal>
  )
}

function NeuralLink({ online }: { online: boolean | null }) {
  const apiKey = useJarvis((s) => s.settings.apiKey)
  const update = useJarvis((s) => s.updateSettings)
  const [draft, setDraft] = useState("")
  const [test, setTest] = useState<{ state: "idle" | "testing" | "ok" | "fail"; message?: string }>({ state: "idle" })
  const mode = apiKey ? "direct" : online ? "server" : "local"

  const save = async () => {
    const key = draft.trim()
    if (!key) return
    update({ apiKey: key })
    setDraft("")
    setTest({ state: "testing" })
    const r = await testKey(key)
    setTest({ state: r.ok ? "ok" : "fail", message: r.message })
  }

  const runTest = async () => {
    if (!apiKey) return
    setTest({ state: "testing" })
    const r = await testKey(apiKey)
    setTest({ state: r.ok ? "ok" : "fail", message: r.message })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.85rem] text-[var(--j-text)]">Status</span>
        <span className="font-hud text-[0.65rem]" style={{ color: mode === "local" ? "var(--j-amber)" : "var(--j-green)" }}>
          {mode === "direct" ? "CLAUDE ONLINE · YOUR KEY" : mode === "server" ? "CLAUDE ONLINE · SERVER" : "LOCAL MODE"}
        </span>
      </div>

      {apiKey ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono-hud flex-1 text-[0.8rem] text-[var(--j-muted)]">
            Key saved: {apiKey.slice(0, 10)}…{apiKey.slice(-4)}
          </span>
          <HudButton onClick={runTest} disabled={test.state === "testing"}>
            {test.state === "testing" ? "Testing…" : "Test link"}
          </HudButton>
          <HudButton
            variant="danger"
            onClick={() => {
              update({ apiKey: undefined })
              setTest({ state: "idle" })
            }}
          >
            Remove key
          </HudButton>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <input
            type="password"
            className="hud-input"
            placeholder="Paste your Anthropic API key (sk-ant-…)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Anthropic API key"
          />
          <HudButton variant="solid" type="submit" disabled={!draft.trim()}>
            Connect
          </HudButton>
        </form>
      )}

      {test.state === "ok" && <p className="text-[0.82rem] text-[var(--j-green)]">✓ {test.message}</p>}
      {test.state === "fail" && <p className="text-[0.82rem] text-[var(--j-amber)]">! {test.message}</p>}

      <p className="text-[0.75rem] leading-relaxed text-[var(--j-faint)]">
        {mode === "server"
          ? "This deployment's server already has a key. You only need your own key on a static deploy such as Netlify Drop."
          : "Get a key at console.anthropic.com → API Keys (pay as you go; a monthly spend limit there is a good idea). It's saved only in this browser, is sent only to Anthropic, and is never included in backups. Use it only on your own devices."}
      </p>
    </div>
  )
}

function WeatherSettings() {
  const st = useJarvis((s) => s.settings)
  const update = useJarvis((s) => s.updateSettings)
  const weather = useWeather()
  const [city, setCity] = useState("")
  const [status, setStatus] = useState<string | null>(null)

  const find = async () => {
    if (!city.trim()) return
    setStatus("Searching…")
    try {
      const hit = await geocode(city.trim())
      if (!hit) return setStatus("Couldn't find that place. Try a nearby city.")
      update({ location: hit })
      setCity("")
      setStatus(null)
    } catch {
      setStatus("Weather service unreachable. Check your connection.")
    }
  }
  const locate = () => {
    if (!navigator.geolocation) return setStatus("Location isn't available in this browser.")
    setStatus("Locating…")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update({ location: { name: "My location", lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) } })
        setStatus(null)
      },
      () => setStatus("Location permission was denied. Type a city instead."),
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-[0.85rem] text-[var(--j-text)]">
        {st.location ? (weather ? weatherLine(weather) : `Location: ${st.location.name}`) : "Add your city to see live weather in the HUD and your briefings."}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void find()
        }}
      >
        <input className="hud-input" placeholder={st.location ? "Change city" : "City, e.g. Los Angeles"} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" />
        <HudButton type="submit" disabled={!city.trim()}>
          Set
        </HudButton>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <HudButton variant="ghost" onClick={locate}>
          Use my location
        </HudButton>
        <div className="flex overflow-hidden rounded-full border border-[var(--j-line)]">
          {(["f", "c"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                update({ tempUnit: u })
                void refreshWeather(true)
              }}
              className={cn("px-3 py-1 text-[0.8rem]", st.tempUnit === u ? "bg-[rgba(var(--j-cyan-rgb),0.18)] text-white" : "text-[var(--j-muted)]")}
            >
              °{u.toUpperCase()}
            </button>
          ))}
        </div>
        {st.location && (
          <HudButton variant="ghost" onClick={() => update({ location: undefined })}>
            Remove
          </HudButton>
        )}
      </div>
      {status && <p className="text-[0.78rem] text-[var(--j-amber)]">{status}</p>}
    </div>
  )
}
