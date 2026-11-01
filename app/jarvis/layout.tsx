import type { Metadata, Viewport } from "next"
import { Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google"
import "./jarvis.css"

const display = Orbitron({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jarvis-display" })
const body = Rajdhani({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jarvis-body" })
const mono = Share_Tech_Mono({ subsets: ["latin"], weight: "400", variable: "--font-jarvis-mono" })

export const metadata: Metadata = {
  title: "J.A.R.V.I.S.",
  description: "Personal life operating system",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#01050a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function JarvisLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</div>
}
