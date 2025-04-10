"use client"

import { useState } from "react"
import Header from "@/components/layout/header"
import NoiseBackground from "@/components/effects/noise-background"
import AlbumCarousel from "@/components/album/album-carousel"
import BackgroundVideos from "@/components/album/background-videos"
import { albums } from "@/lib/data"

export default function AlbumLevels() {
  const [activeAlbum, setActiveAlbum] = useState(0)

  return (
    <div className="relative flex flex-col h-screen bg-gradient-to-b from-zinc-900 to-black text-zinc-300 overflow-hidden">
      <NoiseBackground />
      <BackgroundVideos albums={albums} activeAlbum={activeAlbum} />
      <Header />
      <AlbumCarousel 
        albums={albums} 
        activeAlbum={activeAlbum}
        onActiveAlbumChange={setActiveAlbum}
      />
    </div>
  )
}
