import type { Album } from "@/lib/data"
import BackgroundVideo from "@/components/media/background-video"

interface BackgroundVideosProps {
  albums: Album[]
  activeAlbum: number
}

export default function BackgroundVideos({ albums, activeAlbum }: BackgroundVideosProps) {
  return (
    <div className="absolute inset-0 z-0">
      {albums.map(
        (album, index) =>
          album.isUnlocked && (
            <div
              key={`video-${album.id}`}
              className={`absolute inset-0 transition-opacity duration-500 ${
                activeAlbum === index ? "opacity-100" : "opacity-0"
              }`}
              style={{ pointerEvents: "none" }}
            >
              <BackgroundVideo videoId={album.videoId} isActive={activeAlbum === index} />
            </div>
          ),
      )}
    </div>
  )
}
