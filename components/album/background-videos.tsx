import { useState, useEffect } from "react"
import type { Album } from "@/lib/data"
import BackgroundVideo from "@/components/media/background-video"

interface BackgroundVideosProps {
  albums: Album[]
  activeAlbum: number // Index of the active album
}

export default function BackgroundVideos({ albums, activeAlbum }: BackgroundVideosProps) {
  // Track the previous active album to manage transitions
  const [prevActiveAlbum, setPrevActiveAlbum] = useState(activeAlbum)
  
  // Current album data
  const currentAlbum = albums[activeAlbum]
  const activeVideoPath = currentAlbum && currentAlbum.isUnlocked ? currentAlbum.backgroundVideoPath : null
  
  // Previous album data (for transition)
  const prevAlbum = albums[prevActiveAlbum]
  const prevVideoPath = prevAlbum && prevAlbum.isUnlocked ? prevAlbum.backgroundVideoPath : null
  
  // Update the previous album state when active album changes
  useEffect(() => {
    // Use a timeout to allow for transition
    const timer = setTimeout(() => {
      setPrevActiveAlbum(activeAlbum)
    }, 1000) // Slightly longer than transition duration
    
    return () => clearTimeout(timer)
  }, [activeAlbum])

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {/* Current video (fading in) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${prevActiveAlbum === activeAlbum ? 'opacity-100' : 'opacity-0'}`}>
        <BackgroundVideo videoPath={prevVideoPath} />
      </div>
      
      {/* New video (fading in) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${prevActiveAlbum !== activeAlbum ? 'opacity-100' : 'opacity-0'}`}>
        <BackgroundVideo videoPath={activeVideoPath} />
      </div>
    </div>
  )
}
