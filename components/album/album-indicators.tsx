"use client"

interface AlbumIndicatorsProps {
  count: number
  activeIndex: number
  onClick: (index: number) => void
  isDisabled: boolean
}

export default function AlbumIndicators({ count, activeIndex, onClick, isDisabled }: AlbumIndicatorsProps) {
  return (
    <div className="flex justify-center p-4 gap-2 z-10">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onClick(index)}
          disabled={isDisabled}
          className={`w-2 h-2 rounded-full transition-all ${
            activeIndex === index ? "bg-zinc-300 scale-125" : "bg-zinc-600"
          }`}
          aria-label={`Go to album ${index + 1}`}
        />
      ))}
    </div>
  )
}
