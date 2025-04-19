"use client"

import { motion } from "framer-motion"
import { Lock, Calendar, ExternalLink } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { Album } from "@/lib/data"
import StreamingLinks from "./streaming-links"
import { formatReleaseDate } from "@/lib/data"

interface AlbumCoverProps {
  album: Album
  isActive: boolean
  isAnimating: boolean
}

export default function AlbumCover({ album, isActive, isAnimating }: AlbumCoverProps) {
  const [tapped, setTapped] = useState(false);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset tap state when album changes
  useEffect(() => {
    setTapped(false);
    // Cleanup any existing timeout
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, [album.id]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (!album.isUnlocked) return;
    
    // For desktop, immediately open link if unlocked
    if (window.matchMedia("(min-width: 768px)").matches) {
      if (album.links.youtube) {
        window.open(album.links.youtube, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    
    // For mobile, use a tap pattern
    if (!tapped) {
      // First tap - show indicator
      setTapped(true);
      
      // Auto-reset after 2 seconds if user doesn't tap again
      tapTimerRef.current = setTimeout(() => {
        setTapped(false);
      }, 2000);
    } else {
      // Second tap - open YouTube
      if (album.links.youtube) {
        window.open(album.links.youtube, '_blank', 'noopener,noreferrer');
      }
      setTapped(false);
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center rounded-md max-w-md px-4">
      <motion.div
        className={`relative overflow-hidden shadow-xl rounded-md group ${album.isUnlocked ? 'cursor-pointer' : 'cursor-default'}`}
        initial={{ scale: 1 }}
        animate={{
          scale: isAnimating ? [1, 1.02, 0.99, 1] : 1,
          rotate: isAnimating ? [0, -0.5, 0.5, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
        onClick={handleClick}
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
              className="w-full h-full object-cover rounded-md"
              crossOrigin="anonymous"
            />
          </motion.div>

          {/* Lock Overlay */}
          {!album.isUnlocked && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/70 backdrop-blur-sm rounded-md"
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
              {/* Add date display back to the lock overlay */}
              <div className="flex items-center mt-4 bg-zinc-800/70 px-3 py-1 rounded-full">
                <Calendar size={14} className="mr-2 text-zinc-400" />
                <p className="text-zinc-300/90 text-xs font-light">{formatReleaseDate(album.releaseTimestamp)}</p>
              </div>
            </motion.div>
          )}

          {/* Unlock Animation */}
          {isAnimating && (
            <motion.div
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] flex items-center justify-center rounded-md"
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
          
          {/* YouTube Link Indicator - Shown on hover (desktop) or after first tap (mobile) */}
          {album.isUnlocked && (
            <div 
              className={`
                absolute top-3 right-3 text-white bg-black/60 p-2 rounded-full
                transition-opacity duration-300
                md:opacity-0 md:group-hover:opacity-100
                ${tapped ? 'opacity-100' : 'opacity-0'}
              `}
            >
              <ExternalLink size={18} />
              <span className="sr-only">Open on YouTube</span>
            </div>
          )}
          
          {/* Mobile tap indicator text */}
          {album.isUnlocked && tapped && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 md:hidden rounded-md">
              <div className="bg-zinc-900/80 px-4 py-2 rounded-md backdrop-blur-sm">
                <p className="text-white text-sm">Tap again to open YouTube</p>
              </div>
            </div>
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
