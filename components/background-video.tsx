"use client"

import { useEffect, useRef } from "react"

interface BackgroundVideoProps {
  videoId: string
  isActive: boolean
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export default function BackgroundVideo({ videoId, isActive }: BackgroundVideoProps) {
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerReadyRef = useRef(false)

  useEffect(() => {
    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // Initialize player when API is ready
    const onYouTubeIframeAPIReady = () => {
      if (!containerRef.current) return

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          loop: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          mute: 1,
        },
        events: {
          onReady: (event) => {
            playerReadyRef.current = true
            event.target.setPlaybackQuality("hd720")
            if (isActive) {
              event.target.playVideo()
            }
          },
          onStateChange: (event) => {
            // Loop the video when it ends
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo()
            }
          },
        },
      })
    }

    // Handle API ready event
    if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady()
    } else {
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerReadyRef.current = false
      }
    }
  }, [videoId])

  // Control playback based on active state
  useEffect(() => {
    if (!playerRef.current || !playerReadyRef.current) return

    if (isActive) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [isActive])

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/30 via-zinc-900/60 to-zinc-900/30 z-10"></div>
      <div className="absolute inset-0 w-full h-full">
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
          }}
        ></div>
      </div>
    </div>
  )
}
