import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Particle Globe',
  description: 'An interactive hyper-refined particle globe with cursor and touch reactivity.',
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
