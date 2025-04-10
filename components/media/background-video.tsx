"use client"

import { useEffect, useRef, useState } from "react"

interface BackgroundVideoProps {
  videoId: string | null // Allow null when no video should play
}

let isYouTubeApiReady = false
let youtubeApiPromise: Promise<void> | null = null

function loadYouTubeApi(): Promise<void> {
  if (youtubeApiPromise) {
    return youtubeApiPromise
  }
  if ((window as any).YT && (window as any).YT.Player) {
    isYouTubeApiReady = true
    return Promise.resolve()
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log("[YouTube API] Ready")
      isYouTubeApiReady = true
      resolve()
    }

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    tag.onerror = (err) => {
      console.error("[YouTube API] Failed to load script", err)
      reject(err)
    }
    document.body.appendChild(tag)
  })
  return youtubeApiPromise
}

export default function BackgroundVideo({ videoId }: BackgroundVideoProps) {
  const playerRef = useRef<any | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const currentVideoId = useRef<string | null>(null)

  useEffect(() => {
    let player: any = null

    const initializePlayer = () => {
      if (!containerRef.current || playerRef.current) return

      console.log(`[Player] Initializing for video: ${videoId || "(none)"}`)
      try {
        player = new (window as any).YT.Player(containerRef.current, {
          height: "100%",
          width: "100%",
          videoId: videoId || undefined,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            loop: 1,
            playlist: videoId || undefined,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            mute: 1,
          },
          events: {
            onReady: (event: any) => {
              console.log(`[Player] Ready (Video ID: ${videoId || "(none)"})`)
              playerRef.current = event.target
              setIsPlayerReady(true)
              event.target.setPlaybackQuality("hd720")
              if (videoId) {
                event.target.playVideo()
              } else {
                event.target.stopVideo()
              }
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                console.log("[Player] Video ended (should loop)")
              }
            },
            onError: (event: any) => {
              console.error(`[Player] Error: ${event.data}`)
            },
          },
        })
      } catch (error) {
        console.error("[Player] Error creating player:", error)
      }
    }

    loadYouTubeApi()
      .then(() => {
        if (isYouTubeApiReady) {
          initializePlayer()
        }
      })
      .catch((err) => {
        console.error("[Player] Failed to load YouTube API for initialization", err)
      })

    return () => {
      console.log("[Player] Cleaning up instance")
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      } else if (player) {
        player.destroy()
      }
      setIsPlayerReady(false)
    }
  }, [])

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) {
      return
    }

    if (videoId !== currentVideoId.current) {
      currentVideoId.current = videoId
      if (videoId) {
        console.log(`[Player] Loading video ID: ${videoId}`)
        playerRef.current.loadVideoById({ videoId: videoId, suggestedQuality: "hd720" })
        playerRef.current.mute()
      } else {
        console.log("[Player] Stopping video (null videoId)")
        playerRef.current.stopVideo()
      }
    }
  }, [videoId, isPlayerReady])

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/30 via-zinc-900/60 to-zinc-900/30"></div>
    </div>
  )
}
