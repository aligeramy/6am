"use client"

import { useState, useEffect } from "react"
import Header from "@/components/layout/header"
import NoiseBackground from "@/components/effects/noise-background"
import AlbumCarousel from "@/components/album/album-carousel"
import BackgroundVideos from "@/components/album/background-videos"
import { albums } from "@/lib/data"

const STORAGE_KEY = "album-levels-active-album"

export default function AlbumLevels() {
  const [activeAlbum, setActiveAlbum] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load saved album index from localStorage on mount
  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem(STORAGE_KEY)
      if (savedIndex !== null) {
        const parsedIndex = parseInt(savedIndex, 10)
        // Validate the index is within bounds
        if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < albums.length) {
          setActiveAlbum(parsedIndex)
        }
      }
    } catch (error) {
      console.error("Failed to load saved album index", error)
    }
    setIsInitialized(true)
  }, [])

  // Save album index to localStorage when it changes
  useEffect(() => {
    if (!isInitialized) return
    
    try {
      localStorage.setItem(STORAGE_KEY, activeAlbum.toString())
    } catch (error) {
      console.error("Failed to save album index", error)
    }
  }, [activeAlbum, isInitialized])

  // Handler for album changes
  const handleActiveAlbumChange = (index: number) => {
    setActiveAlbum(index)
  }

  return (
    <div className="relative flex flex-col h-screen bg-gradient-to-b from-zinc-900 to-black text-zinc-300 overflow-hidden">
      <NoiseBackground />
      <BackgroundVideos albums={albums} activeAlbum={activeAlbum} />
      <Header />
      <AlbumCarousel 
        albums={albums} 
        activeAlbum={activeAlbum}
        onActiveAlbumChange={handleActiveAlbumChange}
      />
    </div>
  )
}
