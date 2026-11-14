import type { Metadata, Viewport } from "next"
import { VT323 } from "next/font/google"
import "./fourm.css"

const pixel = VT323({ subsets: ["latin"], weight: "400", variable: "--font-fm" })

export const metadata: Metadata = {
  title: "4M",
  description: "Mind, Muscle, Money, Music",
  robots: { index: false, follow: false },
  manifest: "/4m/manifest.webmanifest",
  icons: { icon: "/4m/icon-192.png", apple: "/4m/icon-180.png" },
  appleWebApp: { capable: true, title: "4M", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  themeColor: "#a7b98a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function FourMLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${pixel.variable} fm-root`}>{children}</div>
}
