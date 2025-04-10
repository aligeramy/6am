"use client"

import { useState, useRef, useEffect } from "react"
import AlbumCover from "./album-cover"
import type { Album } from "@/lib/data"
import AlbumIndicators from "./album-indicators"
import NavigationButtons from "./navigation-buttons"

interface AlbumCarouselProps {
  albums: Album[]
  activeAlbum: number
  onActiveAlbumChange: (index: number) => void
}

export default function AlbumCarousel({ albums, activeAlbum, onActiveAlbumChange }: AlbumCarouselProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToAlbum = (index: number) => {
    if (containerRef.current && !isTransitioning) {
      setIsTransitioning(true)
      const albumWidth = containerRef.current.scrollWidth / albums.length
      containerRef.current.scrollTo({
        left: albumWidth * index,
        behavior: "smooth",
      })

      onActiveAlbumChange(index)

      setTimeout(() => {
        setIsTransitioning(false)
      }, 500)
    }
  }

  const handleNext = () => {
    if (activeAlbum < albums.length - 1 && !isTransitioning) {
      onActiveAlbumChange(activeAlbum + 1)
      scrollToAlbum(activeAlbum + 1)
    }
  }

  const handlePrev = () => {
    if (activeAlbum > 0 && !isTransitioning) {
      onActiveAlbumChange(activeAlbum - 1)
      scrollToAlbum(activeAlbum - 1)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current && !isTransitioning) {
        const scrollLeft = containerRef.current.scrollLeft
        const albumWidth = containerRef.current.scrollWidth / albums.length
        const newActiveAlbum = Math.round(scrollLeft / albumWidth)
        if (newActiveAlbum !== activeAlbum) {
          onActiveAlbumChange(newActiveAlbum)
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [activeAlbum, albums.length, isTransitioning, onActiveAlbumChange])

  return (
    <div className="relative flex-1 overflow-hidden z-10">
      <div
        ref={containerRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {albums.map((album, index) => (
          <div key={album.id} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center">
            <AlbumCover
              album={album}
              isActive={activeAlbum === index}
              isAnimating={isAnimating && index === activeAlbum}
            />
          </div>
        ))}
      </div>

      <NavigationButtons
        onPrev={handlePrev}
        onNext={handleNext}
        isPrevDisabled={activeAlbum === 0 || isTransitioning}
        isNextDisabled={activeAlbum === albums.length - 1 || isTransitioning}
      />

      <AlbumIndicators
        count={albums.length}
        activeIndex={activeAlbum}
        onClick={scrollToAlbum}
        isDisabled={isTransitioning}
      />
    </div>
  )
}
