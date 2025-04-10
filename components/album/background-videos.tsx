import type { Album } from "@/lib/data"
import BackgroundVideo from "@/components/media/background-video"

interface BackgroundVideosProps {
  albums: Album[]
  activeAlbum: number // Index of the active album
}

export default function BackgroundVideos({ albums, activeAlbum }: BackgroundVideosProps) {
  // Determine the video ID for the currently active *and* unlocked album
  const currentAlbum = albums[activeAlbum]
  const activeVideoId = currentAlbum && currentAlbum.isUnlocked ? currentAlbum.videoId : null

  return (
    // Render a single BackgroundVideo component
    <div className="absolute inset-0 z-0 pointer-events-none">
      <BackgroundVideo videoId={activeVideoId} />
    </div>
  )
}
