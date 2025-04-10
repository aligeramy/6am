"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface NavigationButtonsProps {
  onPrev: () => void
  onNext: () => void
  isPrevDisabled: boolean
  isNextDisabled: boolean
}

export default function NavigationButtons({ onPrev, onNext, isPrevDisabled, isNextDisabled }: NavigationButtonsProps) {
  return (
    <>
      <button
        onClick={onPrev}
        disabled={isPrevDisabled}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-zinc-900/70 backdrop-blur-sm p-3 rounded-full text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity"
        aria-label="Previous album"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={onNext}
        disabled={isNextDisabled}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-zinc-900/70 backdrop-blur-sm p-3 rounded-full text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed z-10 transition-opacity"
        aria-label="Next album"
      >
        <ChevronRight size={24} />
      </button>
    </>
  )
}
