"use client"

import { useEffect, useRef } from "react"

interface BackgroundVideoProps {
  videoId: string
  isActive: boolean
}

export default function BackgroundVideo({ videoId, isActive }: BackgroundVideoProps) {
  const playerRef = useRef<any | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerReadyRef = useRef(false)

  useEffect(() => {
    console.log(`[BackgroundVideo ${videoId}] useEffect init`);
    // Load YouTube API
    if (!(window as any).YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // Initialize player when API is ready
    const onYouTubeIframeAPIReady = () => {
      console.log(`[BackgroundVideo ${videoId}] onYouTubeIframeAPIReady called`);
      if (!containerRef.current) {
        console.log(`[BackgroundVideo ${videoId}] containerRef not ready`);
        return;
      }

      console.log(`[BackgroundVideo ${videoId}] Creating YT.Player...`);
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
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
          onReady: (event: any) => {
            console.log(`[BackgroundVideo ${videoId}] Player Ready`, event);
            playerReadyRef.current = true
            event.target.setPlaybackQuality("hd720")
          },
          onStateChange: (event: any) => {
            console.log(`[BackgroundVideo ${videoId}] Player State Change:`, event.data);
            // Loop the video when it ends
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              event.target.playVideo()
            }
          },
        },
      })
    }

    // Handle API ready event
    if ((window as any).YT && (window as any).YT.Player) {
      onYouTubeIframeAPIReady()
    } else {
      (window as any).onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerReadyRef.current = false
      }
    }
  }, [videoId])

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
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
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/30 via-zinc-900/60 to-zinc-900/30"></div>
    </div>
  )
}
