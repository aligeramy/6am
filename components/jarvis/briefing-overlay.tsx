"use client"

import { format } from "date-fns"
import { useJarvis } from "@/lib/jarvis/store"
import { voice } from "@/lib/jarvis/voice"
import { HudButton } from "./hud"
import { Modal, ModalHeader } from "./quick-log"

export function BriefingOverlay() {
  const open = useJarvis((s) => s.briefingOpen)
  const text = useJarvis((s) => s.briefingText)
  const st = useJarvis((s) => s.settings)
  const close = () => {
    voice.stopSpeaking()
    useJarvis.getState().setUI({ briefingOpen: false })
  }
  // Split on sentence ends followed by a capital, so "7.5 hours" stays intact.
  const sentences = text.split(/(?<=[.!?]["”]?)\s+(?=["“A-Z0-9])/).filter(Boolean)
  return (
    <Modal open={open} onClose={close}>
      <ModalHeader title="Morning briefing" sub={format(new Date(), "EEEE · d MMMM yyyy · HH:mm")} onClose={close} />
      <div className="space-y-2 p-4">
        {sentences.map((s, i) => (
          <p
            key={i}
            className="text-[0.95rem] leading-relaxed text-[var(--j-text)] opacity-0"
            style={{ animation: `j-fade-in 0.5s ease forwards`, animationDelay: `${i * 0.35}s` }}
          >
            {s.trim()}
          </p>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--j-line)] px-4 py-3">
        <span className="font-mono-hud text-[0.62rem] uppercase tracking-[0.2em] text-[var(--j-faint)]">Wake time {st.wakeTime}</span>
        <div className="flex gap-2">
          <HudButton
            onClick={() => voice.speak(text, { voiceURI: st.voiceURI, rate: st.voiceRate, pitch: st.voicePitch })}
          >
            Replay
          </HudButton>
          <HudButton variant="solid" onClick={close}>
            Let&apos;s begin
          </HudButton>
        </div>
      </div>
      <style>{`@keyframes j-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </Modal>
  )
}
