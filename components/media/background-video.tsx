"use client"

import { useEffect, useRef, useState } from "react"

interface BackgroundVideoProps {
  videoPath: string | null // Renamed from videoId
}

export default function BackgroundVideo({ videoPath }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [opacity, setOpacity] = useState(0) // State for controlling fade
  const timeoutRef = useRef<NodeJS.Timeout | null>(null) // To manage delayed actions

  // Effect to handle changes in videoPath prop
  useEffect(() => {
    if (!videoRef.current) return

    // Clear any pending timeout from previous state changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const videoElement = videoRef.current
    const targetSrc = videoPath ? new URL(videoPath, window.location.origin).href : null

    if (videoPath && targetSrc) {
      // --- Fade in or play --- 
      console.log(`[Video] Ensuring video path: ${videoPath}`)
      setOpacity(1) // Fade in

      // Set source and load only if it's different or wasn't set
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

    } else {
      // --- Fade out and pause --- 
      console.log("[Video] Fading out and scheduling pause (no path)")
      setOpacity(0) // Fade out

      // Pause *after* the fade out completes
      timeoutRef.current = setTimeout(() => {
        console.log("[Video] Pausing video after fade out")
        videoElement.pause()
        // Don't remove src attribute here
      }, 500) // Match CSS transition duration
    }

    // Cleanup timeout on unmount or before next effect run
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [videoPath])

  return (
    // Outer container controls base visibility/opacity (opacity-30)
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
      {/* Scaled container for the video element - apply transition and stateful opacity here */}
      <div
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] transition-opacity duration-500 ease-in-out"
        style={{ opacity: opacity }} // Apply stateful opacity
      >
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
