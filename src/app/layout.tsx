import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Hanoi Artisan Bridge — AI Tour Matching',
  description: 'Connect Tour Agencies with verified Hanoi craft village artisans and unique cultural experiences.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  )
}
