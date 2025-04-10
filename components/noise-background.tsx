"use client"

import { useEffect, useRef } from "react"

export default function NoiseBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match window
    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth || 1
        canvas.height = window.innerHeight || 1
      }
    }

    resize()
    window.addEventListener("resize", resize)

    // Create noise function with validation
    const createNoise = () => {
      // Validate dimensions before creating image data
      const width = canvas.width || 1
      const height = canvas.height || 1

      if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
        console.warn("Invalid canvas dimensions:", width, height)
        return null
      }

      try {
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          // Random grayscale value with low opacity
          const value = Math.floor(Math.random() * 55)
          data[i] = value // r
          data[i + 1] = value // g
          data[i + 2] = value // b
          data[i + 3] = Math.random() * 25 // slightly more visible alpha
        }

        return imageData
      } catch (error) {
        console.error("Error creating noise:", error)
        return null
      }
    }

    // Animation loop with error handling
    let animationId: number
    const animate = () => {
      try {
        const noiseData = createNoise()
        if (noiseData) {
          ctx.putImageData(noiseData, 0, 0)
        }
      } catch (error) {
        console.error("Error in noise animation:", error)
      }
      animationId = requestAnimationFrame(animate)
    }

    // Start animation with a slight delay to ensure canvas is ready
    const animationTimeout = setTimeout(() => {
      animate()
    }, 100)

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
      clearTimeout(animationTimeout)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 opacity-40 pointer-events-none"
      style={{ mixBlendMode: "soft-light" }}
      width="1"
      height="1"
    />
  )
}
