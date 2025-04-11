export interface Album {
  id: number
  title: string
  coverImage: string
  releaseTimestamp: Date
  isUnlocked: boolean
  links: {
    youtube: string
    spotify: string
    apple: string
  }
  backgroundVideoPath: string | null // Renamed from videoId, allows null
}

// Helper function to format release date in a more natural way using UTC
export function formatReleaseDate(date: Date): string {
  const now = new Date()

  // Get current date components in UTC
  const nowYear = now.getUTCFullYear()
  const nowMonth = now.getUTCMonth()
  const nowDay = now.getUTCDate()
  const currentDayOfWeek = now.getUTCDay() // 0 = Sunday, 6 = Saturday

  // Get release date components in UTC
  const releaseYear = date.getUTCFullYear()
  const releaseMonth = date.getUTCMonth()
  const releaseDay = date.getUTCDate()

  // Create UTC midnight timestamps for accurate day difference calculation
  const utcNowTimestamp = Date.UTC(nowYear, nowMonth, nowDay)
  const utcReleaseTimestamp = Date.UTC(releaseYear, releaseMonth, releaseDay)

  // Calculate difference in days based on UTC timestamps
  const diffTime = utcReleaseTimestamp - utcNowTimestamp
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Format based on release status
  if (diffDays <= 0) {
    // Released
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
    return `Released ${date.toLocaleDateString("en-US", options)}`
  } else if (diffDays === 1) {
    // Tomorrow
    return "Available tomorrow"
  } else {
    // More than 1 day away
    if (diffDays <= 7) {
      // Within the next 7 days
      const daysUntilWeekend = 6 - currentDayOfWeek // Days left in the current week (until Saturday)
      if (diffDays <= daysUntilWeekend) {
        // Releasing *this* week
        const releaseDayName = date.toLocaleDateString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        })
        return `Dropping this ${releaseDayName}`
      } else {
        // Releasing *next* week
        return "Coming next week"
      }
    } else if (diffDays <= 14) {
      // Between 8 and 14 days away
      return "Coming in 2 weeks"
    } else {
      // More than 14 days away
      const weeks = Math.ceil(diffDays / 7)
      return `Coming in ${weeks} weeks`
    }
  }
}


export const albums: Album[] = [
  {
    id: 1,
    title: "Blessings",
    coverImage: "/albums/blessings.jpg",
    releaseTimestamp: new Date('2024-04-05'),
    isUnlocked: true,
    links: {
      youtube: "https://www.youtube.com/watch?v=eVOLxV4rdz4",
      spotify: "https://open.spotify.com/track/3W14qXAuDe2pxtVTecvSZ5?si=d16518f5cbab462d&nd=1&dlsi=f609d359e423487b",
      apple: "https://music.apple.com/ca/album/blessings-single/1800816463",
    },
    backgroundVideoPath: "/videos/blessings.mp4",
  },
  {
    id: 2,
    title: "TonyInLa",
    coverImage: "/placeholder.jpg",
    releaseTimestamp: new Date('2025-04-18'),
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example2",
      spotify: "https://open.spotify.com/track/example2",
      apple: "https://music.apple.com/album/example2",
    },
    backgroundVideoPath: null, 
  },
  {
    id: 3,
    title: "For the better",
    coverImage: "/placeholder.jpg",
    releaseTimestamp: new Date('2025-05-02'),
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example3",
      spotify: "https://open.spotify.com/track/example3",
      apple: "https://music.apple.com/album/example3",
    },
    backgroundVideoPath: null, 
  },
  {
    id: 4,
    title: "TBA",
    coverImage: "/placeholder.jpg",
    releaseTimestamp: new Date('2025-05-16'),
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example4",
      spotify: "https://open.spotify.com/track/example4",
      apple: "https://music.apple.com/album/example4",
    },
    backgroundVideoPath: null, 
  },
  {
    id: 5,
    title: "Ever Since it Went Down you're Not Sorry",
    coverImage: "/placeholder.jpg",
    releaseTimestamp: new Date('2025-05-30'),
    isUnlocked: false,
    links: {
      youtube: "https://www.youtube.com/watch?v=example5",
      spotify: "https://open.spotify.com/track/example5",
      apple: "https://music.apple.com/album/example5",
    },
    backgroundVideoPath: null, 
  },
]
