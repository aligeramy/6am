export interface Album {
  id: number
  title: string
  coverImage: string
  releaseDate: string
  releaseTimestamp: Date
  isUnlocked: boolean
  links: {
    youtube: string
    spotify: string
    apple: string
  }
  videoId: string // YouTube video ID for background
}

// Helper function to format release date in a more natural way
export function formatReleaseDate(date: Date): string {
  const now = new Date()

  // Reset time portion for accurate day calculations
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const releaseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // Calculate difference in days
  const diffTime = releaseDate.getTime() - nowDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Format based on how far away the date is
  if (diffDays <= 0) {
    return "Available Now"
  } else if (diffDays === 1) {
    return "Coming tomorrow"
  } else if (diffDays < 7) {
    return `Coming in ${diffDays} days`
  } else if (diffDays < 14) {
    return "Coming next week"
  } else {
    // Format the date in a readable way
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
    }

    // Add year only if it's different from current year
    if (releaseDate.getFullYear() !== nowDate.getFullYear()) {
      options.year = "numeric"
    }

    return `Coming ${releaseDate.toLocaleDateString("en-US", options)}`
  }
}

// Create specific release dates
const today = new Date()

// April 17th
const april17 = new Date(today.getFullYear(), 3, 17) // Month is 0-indexed, so 3 = April
if (april17 < today) {
  april17.setFullYear(today.getFullYear() + 1) // Move to next year if date has passed
}

// May 1st
const may1 = new Date(today.getFullYear(), 4, 1)
if (may1 < today) {
  may1.setFullYear(today.getFullYear() + 1)
}

// May 15th
const may15 = new Date(today.getFullYear(), 4, 15)
if (may15 < today) {
  may15.setFullYear(today.getFullYear() + 1)
}

// June 1st
const june1 = new Date(today.getFullYear(), 5, 1)
if (june1 < today) {
  june1.setFullYear(today.getFullYear() + 1)
}

// June 15th
const june15 = new Date(today.getFullYear(), 5, 15)
if (june15 < today) {
  june15.setFullYear(today.getFullYear() + 1)
}

export const albums: Album[] = [
  {
    id: 1,
    title: "Blessings",
    coverImage: "/albums/blessings.jpg",
    releaseDate: "Available Now",
    releaseTimestamp: today,
    isUnlocked: true,
    links: {
      youtube: "https://www.youtube.com/watch?v=eVOLxV4rdz4",
      spotify: "https://open.spotify.com/track/3W14qXAuDe2pxtVTecvSZ5?si=d16518f5cbab462d&nd=1&dlsi=f609d359e423487b",
      apple: "https://music.apple.com/ca/album/blessings-single/1800816463",
    },
    videoId: "dQw4w9WgXcQ", // Example YouTube ID - replace with actual
  },
  {
    id: 2,
    title: "tonyinLA",
    coverImage: "/albums/tonyinla.jpg",
    releaseDate: formatReleaseDate(april17),
    releaseTimestamp: april17,
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example2",
      spotify: "https://open.spotify.com/track/example2",
      apple: "https://music.apple.com/album/example2",
    },
    videoId: "dQw4w9WgXcQ", // Example YouTube ID - replace with actual
  },
  {
    id: 3,
    title: "4thebetter",
    coverImage: "/albums/4thebetter.jpg",
    releaseDate: formatReleaseDate(may1),
    releaseTimestamp: may1,
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example3",
      spotify: "https://open.spotify.com/track/example3",
      apple: "https://music.apple.com/album/example3",
    },
    videoId: "dQw4w9WgXcQ", // Example YouTube ID - replace with actual
  },
  {
    id: 4,
    title: "SummerSong",
    coverImage: "/albums/summersong.jpg",
    releaseDate: formatReleaseDate(may15),
    releaseTimestamp: may15,
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example4",
      spotify: "https://open.spotify.com/track/example4",
      apple: "https://music.apple.com/album/example4",
    },
    videoId: "dQw4w9WgXcQ", // Example YouTube ID - replace with actual
  },
  {
    id: 5,
    title: "EverSince it WentDown youre NotSorry (3pack)",
    coverImage: "/albums/eversince.jpg",
    releaseDate: formatReleaseDate(june1),
    releaseTimestamp: june1,
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example5",
      spotify: "https://open.spotify.com/track/example5",
      apple: "https://music.apple.com/album/example5",
    },
    videoId: "dQw4w9WgXcQ", // Example YouTube ID - replace with actual
  },
  {
    id: 6,
    title: "Project 666",
    coverImage: "/albums/project666.jpg",
    releaseDate: formatReleaseDate(june15),
    releaseTimestamp: june15,
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example6",
      spotify: "https://open.spotify.com/track/example6",
      apple: "https://music.apple.com/album/example6",
    },
    videoId: "dQw4w9WgXcQ", // Example YouTube ID - replace with actual
  },
]
