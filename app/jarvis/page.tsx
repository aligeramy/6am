"use client"

import dynamic from "next/dynamic"

// Client-only: the dashboard reads browser storage, speech APIs and canvas on first render.
const JarvisApp = dynamic(() => import("@/components/jarvis/jarvis-app"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100dvh", background: "#01050a" }} />,
})

export default function JarvisPage() {
  return <JarvisApp />
}
