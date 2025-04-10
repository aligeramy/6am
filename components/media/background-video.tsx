"use client"

import { useEffect, useRef } from "react"

interface BackgroundVideoProps {
  videoPath: string | null // Renamed from videoId
}

export default function BackgroundVideo({ videoPath }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Effect to handle changes in videoPath prop
  useEffect(() => {
    if (!videoRef.current) return

    if (videoPath) {
      console.log(`[Video] Loading path: ${videoPath}`)
      videoRef.current.src = videoPath
      videoRef.current.load() // Load the new source
      // Attempt to play (browser might block without user interaction, but muted autoplay is usually allowed)
      videoRef.current.play().catch((error) => {
        console.warn("[Video] Autoplay possibly prevented:", error)
      })
    } else {
      // If path is null, pause and clear the source
      console.log("[Video] Stopping video (null path)")
      videoRef.current.pause()
      videoRef.current.removeAttribute("src") // Remove src to show nothing
      videoRef.current.load() // Need to load after removing src
    }

    // Optional: Add event listeners if needed (e.g., onEnded for looping)
    const handleEnded = () => {
      if (videoRef.current) {
        console.log("[Video] Ended, looping...")
        videoRef.current.play()
      }
    }

    const currentVideoElement = videoRef.current
    currentVideoElement.addEventListener("ended", handleEnded)

    return () => {
      currentVideoElement.removeEventListener("ended", handleEnded)
    }
  }, [videoPath]) // Re-run when videoPath changes

  return (
    // Outer container controls visibility/opacity
    <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
      {/* Scaled container for the video element */}
      <div
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%]"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover" // Cover the container
          playsInline // Important for mobile
          autoPlay // Attempt autoplay
          muted // Required for autoplay in most browsers
          loop // Use the loop attribute for simplicity
          // We'll set the src dynamically in the useEffect hook
        />
      </div>
      {/* Gradient overlay - renders on top due to DOM order */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/30 via-zinc-900/60 to-zinc-900/30"></div>
    </div>
  )
}
