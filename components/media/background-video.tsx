"use client"

import { useEffect, useRef } from "react"

interface BackgroundVideoProps {
  videoPath: string | null // Renamed from videoId
}

export default function BackgroundVideo({ videoPath }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Effect to handle changes in videoPath prop
  useEffect(() => {
    if (!videoRef.current || !videoPath) return

    const videoElement = videoRef.current
    const targetSrc = videoPath ? new URL(videoPath, window.location.origin).href : null

    if (videoPath && targetSrc) {
      // Only set source and load if it's different
      if (videoElement.currentSrc !== targetSrc) {
        console.log(`[Video] Setting src and loading: ${videoPath}`)
        videoElement.src = videoPath
        videoElement.load()
      }
      
      // Always attempt to play when path is valid
      console.log(`[Video] Attempting to play: ${videoPath}`)
      videoElement.play().catch((error) => {
        // Muted autoplay is usually allowed, but log warnings
        console.warn(`[Video] Autoplay prevented or interrupted for ${videoPath}:`, error)
      })
    } else if (videoElement.src) {
      // Just pause the video if no path is provided
      videoElement.pause()
    }

  }, [videoPath])

  if (!videoPath) return null

  return (
    // Outer container controls base visibility/opacity (opacity-30)
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
      {/* Scaled container for the video element */}
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover" // Cover the container
          playsInline // Important for mobile
          muted // Required for autoplay in most browsers
          loop // Use the loop attribute for simplicity
          // src will be set by the effect
        />
      </div>
      {/* Gradient overlay - renders on top due to DOM order */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/30 via-zinc-900/60 to-zinc-900/30"></div>
    </div>
  )
}
