interface StreamingLinksProps {
  links: {
    youtube: string
    spotify: string
    apple: string
  }
}

export default function StreamingLinks({ links }: StreamingLinksProps) {
  return (
    <div className="mt-4 flex flex-col items-center">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Listen on</p>
      <div className="flex justify-center space-x-6 sm:space-x-8">
        <a
          href={links.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all hover:opacity-100 hover:scale-110 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-[40px] flex items-center">
            <img
              src="/images/youtube.png"
              alt="YouTube"
              className="opacity-70 group-hover:opacity-100 transition-opacity h-full w-auto object-contain"
            />
          </div>
        </a>
        <a
          href={links.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all hover:opacity-100 hover:scale-110 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-[40px] flex items-center">
            <img
              src="/images/spotify.png"
              alt="Spotify"
              className="opacity-70 group-hover:opacity-100 transition-opacity h-full w-auto object-contain"
            />
          </div>
        </a>
        <a
          href={links.apple}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-all hover:opacity-100 hover:scale-110 group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-[40px] flex items-center">
            <img
              src="/images/apple.png"
              alt="Apple Music"
              className="opacity-70 group-hover:opacity-100 transition-opacity h-full w-auto object-contain"
            />
          </div>
        </a>
      </div>
    </div>
  )
}
