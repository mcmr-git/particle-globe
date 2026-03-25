import ParticleMorph from '@/components/ParticleMorph'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Experience — Particle Globe',
  description: 'A morphing particle experience.',
}

export default function ExperiencePage() {
  return <ParticleMorph />
}
