import type React from "react"
import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "6AM - Album Experience",
  description: "Interactive album experience with unlockable content biweekly",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
    other: [
      { rel: 'manifest', url: '/site.webmanifest' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // YouTube API type definition
              if (!window.YT) {
                window.YT = {Player: function(){}}
              }
              if (!window.onYouTubeIframeAPIReady) {
                window.onYouTubeIframeAPIReady = function() {}
              }
            `,
          }}
        />
      </head>
      <body id="root">{children}</body>
    </html>
  )
}


import './globals.css'