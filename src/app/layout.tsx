import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Michele Mauri — Portfolio',
  description: 'Premium portfolio landing page with morphic particle animation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
