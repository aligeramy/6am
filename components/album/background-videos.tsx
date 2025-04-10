import type { Album } from "@/lib/data"
import BackgroundVideo from "@/components/media/background-video"

interface BackgroundVideosProps {
  albums: Album[]
  activeAlbum: number // Index of the active album
}

export default function BackgroundVideos({ albums, activeAlbum }: BackgroundVideosProps) {
  // Determine the video path for the currently active *and* unlocked album
  const currentAlbum = albums[activeAlbum]
  const activeVideoPath = currentAlbum && currentAlbum.isUnlocked ? currentAlbum.backgroundVideoPath : null

  return (
    // Render a single BackgroundVideo component
    <div className="absolute inset-0 z-0 pointer-events-none">
      <BackgroundVideo videoPath={activeVideoPath} />
    </div>
  )
}
