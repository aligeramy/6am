"use client"

import { motion } from "framer-motion"
import { Lock, Calendar } from "lucide-react"
import type { Album } from "@/lib/data"
import StreamingLinks from "./streaming-links"
import { formatReleaseDate } from "@/lib/data"

interface AlbumCoverProps {
  album: Album
  isActive: boolean
  isAnimating: boolean
}

export default function AlbumCover({ album, isActive, isAnimating }: AlbumCoverProps) {
  return (
    <div className="relative flex flex-col items-center max-w-md px-4">
      <motion.div
        className="relative overflow-hidden shadow-xl"
        initial={{ scale: 1 }}
        animate={{
          scale: isAnimating ? [1, 1.02, 0.99, 1] : 1,
          rotate: isAnimating ? [0, -0.5, 0.5, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          {/* Album Cover */}
          <motion.div
            className="w-full h-full"
            initial={{ filter: "grayscale(100%) brightness(40%)" }}
            animate={{
              filter: album.isUnlocked ? "grayscale(0%) brightness(100%)" : "grayscale(100%) brightness(40%)",
            }}
            transition={{ duration: 0.5 }}
          >
            <img
              src={album.isUnlocked ? album.coverImage : "/placeholder.jpg"}
              alt={`Album cover for ${album.title}`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          </motion.div>

          {/* Lock Overlay (No Date) */}
          {!album.isUnlocked && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/70 backdrop-blur-sm"
              initial={{ opacity: 1 }}
              animate={{ opacity: isAnimating ? 0 : 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: isAnimating ? [1, 1.5, 0] : 1 }}
                transition={{ duration: 0.3 }}
              >
                <Lock size={48} className="text-zinc-400/80" />
              </motion.div>
            </motion.div>
          )}

          {/* Unlock Animation */}
          {isAnimating && (
            <motion.div
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.6 }}
                className="text-zinc-300/90 font-light text-sm tracking-[0.2em]"
              >
                UNLOCKED
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        className="mt-4 text-center w-full"
        animate={{
          opacity: album.isUnlocked ? 1 : 0.6,
        }}
      >
        <h2 className="text-sm font-light tracking-wide uppercase">{album.title}</h2>
        <p className="text-zinc-500 mt-1 text-xs">{formatReleaseDate(album.releaseTimestamp)}</p>
        
        {album.isUnlocked && (
          <StreamingLinks links={album.links} />
        )}
      </motion.div>
    </div>
  )
}
