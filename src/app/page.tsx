import ParticleGlobe from '@/components/ParticleGlobe'
import HeroText from '@/components/HeroText'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.canvas}>
        <ParticleGlobe />
      </div>
      <div className={styles.overlay}>
        <HeroText />
      </div>
    </main>
  )
}
