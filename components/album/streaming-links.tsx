interface StreamingLinksProps {
  links: {
    youtube: string
    spotify: string
    apple: string
  }
}

export default function StreamingLinks({ links }: StreamingLinksProps) {
  return (
    <div className="mt-6 flex justify-center space-x-10 sm:space-x-8 scale-90">
      <a
        href={links.youtube}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-all hover:opacity-80 hover:scale-110"
      >
        <div className="h-[60px] flex items-center">
          <img
            src="/images/youtube.png"
            alt="YouTube"
            className="opacity-80 hover:opacity-100 transition-opacity h-full w-auto object-contain"
          />
        </div>
      </a>
      <a
        href={links.spotify}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-all hover:opacity-80 hover:scale-110"
      >
        <div className="h-[60px] flex items-center">
          <img
            src="/images/spotify.png"
            alt="Spotify"
            className="opacity-80 hover:opacity-100 transition-opacity h-full w-auto object-contain"
          />
        </div>
      </a>
      <a
        href={links.apple}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-all hover:opacity-80 hover:scale-110"
      >
        <div className="h-[60px] flex items-center">
          <img
            src="/images/apple.png"
            alt="Apple Music"
            className="opacity-80 hover:opacity-100 transition-opacity h-full w-auto object-contain"
          />
        </div>
      </a>
    </div>
  )
}
