import ParticleGlobe from '@/components/ParticleGlobe'
import HeroText from '@/components/HeroText'
import RoadmapSection from '@/components/RoadmapSection'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      {/* ── Globe hero ── */}
      <section className={styles.hero}>
        <div className={styles.canvas}>
          <ParticleGlobe />
        </div>
        <div className={styles.overlay}>
          <HeroText />
        </div>
        {/* subtle scroll nudge */}
        <div className={styles.scrollHint} aria-hidden="true">
          <span>scroll</span>
          <svg viewBox="0 0 16 16">
            <polyline points="2,5 8,11 14,5" />
          </svg>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <RoadmapSection />
    </div>
  )
}
