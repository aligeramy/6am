"use client"

/* Browser voice I/O: Web Speech synthesis for JARVIS's voice and SpeechRecognition for yours.
   Kept as a small singleton so every component sees the same state. */

export type VoiceState = "off" | "wake" | "command" | "thinking" | "speaking"

type Listener = (s: { state: VoiceState; interim: string; level: number; error: string | null }) => void

// Minimal typings; the Web Speech API isn't in TS's DOM lib everywhere.
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const PREFERRED_VOICES = [
  "Daniel",
  "Google UK English Male",
  "Microsoft Ryan",
  "Microsoft George",
  "Arthur",
  "Oliver",
  "Microsoft Thomas",
  "en-GB",
]

const WAKE = /\b(?:hey\s+|ok(?:ay)?\s+|yo\s+)?(jarvis|jervis|jarvis's)\b/i

class VoiceEngine {
  state: VoiceState = "off"
  interim = ""
  level = 0
  error: string | null = null
  private listeners = new Set<Listener>()
  private rec: SpeechRecognitionLike | null = null
  private running = false
  private wakeArmed = false
  private wantCommand = false
  private commandTimer: ReturnType<typeof setTimeout> | null = null
  private onCommand: ((text: string) => void) | null = null
  private levelTimer: ReturnType<typeof setInterval> | null = null

  get recognitionSupported() {
    return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }
  get synthesisSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    fn(this.snapshot())
    return () => {
      this.listeners.delete(fn)
    }
  }
  private snapshot() {
    return { state: this.state, interim: this.interim, level: this.level, error: this.error }
  }
  private emit() {
    const snap = this.snapshot()
    this.listeners.forEach((l) => l(snap))
  }
  private setState(s: VoiceState) {
    this.state = s
    this.emit()
  }

  setCommandHandler(fn: (text: string) => void) {
    this.onCommand = fn
  }

  /* ───────── Output ───────── */

  voices(): SpeechSynthesisVoice[] {
    if (!this.synthesisSupported) return []
    return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"))
  }

  pickVoice(uri?: string): SpeechSynthesisVoice | null {
    const all = this.voices()
    if (uri) {
      const v = all.find((x) => x.voiceURI === uri)
      if (v) return v
    }
    for (const pref of PREFERRED_VOICES) {
      const v = all.find((x) => x.name.includes(pref) || x.lang === pref)
      if (v) return v
    }
    return all[0] ?? null
  }

  speak(text: string, opts: { voiceURI?: string; rate?: number; pitch?: number; enabled?: boolean } = {}): Promise<void> {
    if (!this.synthesisSupported || opts.enabled === false || !text.trim()) return Promise.resolve()
    const synth = window.speechSynthesis
    synth.cancel()
    // Stop listening while speaking so JARVIS doesn't hear himself.
    this.pauseRecognition()
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, ""))
      const v = this.pickVoice(opts.voiceURI)
      if (v) u.voice = v
      u.lang = v?.lang ?? "en-GB"
      u.rate = opts.rate ?? 1
      u.pitch = opts.pitch ?? 0.9
      let finished = false
      const done = () => {
        if (finished) return
        finished = true
        if (this.levelTimer) clearInterval(this.levelTimer)
        this.level = 0
        this.resumeAfterSpeech()
        resolve()
      }
      u.onstart = () => {
        this.setState("speaking")
        // Synthetic amplitude for the visualizer; browsers don't expose TTS audio.
        if (this.levelTimer) clearInterval(this.levelTimer)
        this.levelTimer = setInterval(() => {
          this.level = 0.35 + Math.random() * 0.65
          this.emit()
        }, 90)
      }
      u.onboundary = () => {
        this.level = 1
        this.emit()
      }
      u.onend = done
      u.onerror = done
      synth.speak(u)
      // Chrome sometimes never fires onstart for long queues; guarantee progress.
      setTimeout(() => {
        if (!synth.speaking && this.state !== "speaking") done()
      }, 4000)
    })
  }

  stopSpeaking() {
    if (this.synthesisSupported) window.speechSynthesis.cancel()
  }

  setThinking(on: boolean) {
    if (on) this.setState("thinking")
    else if (this.state === "thinking") this.setState(this.wakeArmed ? "wake" : "off")
  }

  /* ───────── Input ───────── */

  private ensureRec() {
    if (this.rec || !this.recognitionSupported) return this.rec
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec: SpeechRecognitionLike = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = "en-US"
    rec.onresult = (e) => {
      let finalText = ""
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      if (this.wantCommand) {
        this.interim = interim || finalText
        this.level = 0.5 + Math.random() * 0.5
        this.emit()
      }
      if (finalText) this.handleFinal(finalText.trim())
      else if (!this.wantCommand && WAKE.test(interim)) {
        // Light up as soon as the wake word is heard, before the phrase finalises.
        this.wantCommand = true
        this.setState("command")
      }
    }
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.error = "Microphone access was denied. Allow it in your browser's site settings."
        this.wakeArmed = false
        this.wantCommand = false
        this.running = false
        this.setState("off")
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        this.error = `Voice input error: ${e.error}`
        this.emit()
      }
    }
    rec.onend = () => {
      this.running = false
      // Chrome ends continuous recognition periodically; keep it alive while needed.
      if ((this.wakeArmed || this.wantCommand) && this.state !== "speaking" && this.state !== "thinking") {
        setTimeout(() => this.startRec(), 250)
      }
    }
    this.rec = rec
    return rec
  }

  private startRec() {
    const rec = this.ensureRec()
    if (!rec || this.running) return
    try {
      rec.start()
      this.running = true
      this.error = null
    } catch {
      /* already started */
    }
  }

  private handleFinal(text: string) {
    if (this.wantCommand) {
      const cleaned = text.replace(WAKE, "").replace(/^[\s,.!?]+/, "").trim()
      if (!cleaned) return // heard only the wake word; keep listening for the command
      this.finishCommand(cleaned)
      return
    }
    const m = text.match(WAKE)
    if (m && m.index !== undefined) {
      const after = text.slice(m.index + m[0].length).replace(/^[\s,.!?]+/, "").trim()
      if (after.length > 1) {
        this.finishCommand(after)
      } else {
        this.beginCommand()
      }
    }
  }

  private finishCommand(text: string) {
    this.wantCommand = false
    this.interim = ""
    if (this.commandTimer) clearTimeout(this.commandTimer)
    this.setState(this.wakeArmed ? "wake" : "off")
    if (!this.wakeArmed) this.rec?.stop()
    this.onCommand?.(text)
  }

  /** Listen for one spoken command (mic button, or after the wake word). */
  beginCommand() {
    if (!this.recognitionSupported) {
      this.error = "Voice input isn't supported in this browser. Try Chrome, Edge or Safari."
      this.emit()
      return
    }
    this.stopSpeaking()
    this.wantCommand = true
    this.interim = ""
    this.setState("command")
    this.startRec()
    if (this.commandTimer) clearTimeout(this.commandTimer)
    this.commandTimer = setTimeout(() => {
      if (this.wantCommand) {
        this.wantCommand = false
        this.interim = ""
        this.setState(this.wakeArmed ? "wake" : "off")
        if (!this.wakeArmed) this.rec?.stop()
      }
    }, 9000)
  }

  cancelCommand() {
    this.wantCommand = false
    this.interim = ""
    if (this.commandTimer) clearTimeout(this.commandTimer)
    this.setState(this.wakeArmed ? "wake" : "off")
    if (!this.wakeArmed) this.rec?.stop()
  }

  setWakeWord(on: boolean) {
    if (on === this.wakeArmed) return
    this.wakeArmed = on
    if (on) {
      if (!this.recognitionSupported) {
        this.error = "Wake word needs SpeechRecognition (Chrome, Edge or Safari)."
        this.wakeArmed = false
        this.emit()
        return
      }
      if (this.state === "off") this.setState("wake")
      this.startRec()
    } else {
      if (!this.wantCommand) {
        this.rec?.stop()
        this.setState("off")
      }
    }
  }

  private pauseRecognition() {
    if (this.running) {
      try {
        this.rec?.abort()
      } catch {
        /* ignore */
      }
      this.running = false
    }
  }

  private resumeAfterSpeech() {
    this.setState(this.wantCommand ? "command" : this.wakeArmed ? "wake" : "off")
    if (this.wakeArmed || this.wantCommand) setTimeout(() => this.startRec(), 300)
  }
}

export const voice = new VoiceEngine()
