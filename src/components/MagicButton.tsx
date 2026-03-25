'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import styles from './MagicButton.module.css'

interface XParticle {
  x: number; y: number
  vx: number; vy: number
  r: number
  life: number
  decay: number
  damping: number
}

function spawnWave(
  ox: number, oy: number,
  count: number,
  speedMin: number, speedMax: number,
  rMin: number, rMax: number,
  decay: number,
  damping: number,
): XParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const base  = (i / count) * Math.PI * 2
    const jit   = (Math.random() - 0.5) * 0.55
    const angle = base + jit
    const speed = speedMin + Math.random() * (speedMax - speedMin)
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r:  rMin + Math.random() * (rMax - rMin),
      life: 1,
      decay,
      damping,
    }
  })
}

export default function MagicButton() {
  const btnRef       = useRef<HTMLButtonElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const floatRaf     = useRef<number>(0)
  const explosionRaf = useRef<number>(0)
  const firedRef     = useRef(false)
  const router       = useRouter()

  // Size canvas to full viewport
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr     = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = window.innerWidth  * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Self-reveal via IntersectionObserver
  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { btn.classList.add(styles.visible); obs.disconnect() } },
      { threshold: 0.5 }
    )
    obs.observe(btn)
    return () => obs.disconnect()
  }, [])

  // Float animation
  const floatP = useRef({
    amp:    4 + Math.random() * 2.5,
    freq:   0.36 + Math.random() * 0.26,
    phase:  Math.random() * Math.PI * 2,
    xAmp:   1.0 + Math.random() * 1.4,
    xFreq:  0.20 + Math.random() * 0.18,
    xPhase: Math.random() * Math.PI * 2,
  })

  useEffect(() => {
    const p  = floatP.current
    const t0 = performance.now()
    const tick = (now: number) => {
      if (firedRef.current) return
      const t   = (now - t0) * 0.001
      const btn = btnRef.current
      if (btn) {
        const dy = Math.sin(t * p.freq  * Math.PI * 2 + p.phase)  * p.amp
        const dx = Math.sin(t * p.xFreq * Math.PI * 2 + p.xPhase) * p.xAmp
        btn.style.transform = `translateX(-50%) translate(${dx}px,${dy}px)`
      }
      floatRaf.current = requestAnimationFrame(tick)
    }
    floatRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(floatRaf.current)
  }, [])

  const detonate = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true

    const btn    = btnRef.current
    const canvas = canvasRef.current
    if (!btn || !canvas) return

    cancelAnimationFrame(floatRaf.current)

    const rect = btn.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2

    // Dissolve button
    btn.style.transition = 'opacity 0.14s ease-out, transform 0.14s ease-out'
    btn.style.opacity    = '0'
    btn.style.transform  = 'translateX(-50%) scale(0.78)'

    // Nuclear flash
    const flash = document.createElement('div')
    flash.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(240,236,228,0.09);pointer-events:none;opacity:1;transition:opacity 90ms ease'
    document.body.appendChild(flash)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      flash.style.opacity = '0'
      setTimeout(() => flash.remove(), 130)
    }))

    // Explosion particles
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ox  = cx * dpr
    const oy  = cy * dpr

    const wave1 = spawnWave(ox, oy, 920, 3.5*dpr, 14*dpr,  0.7, 2.2, 0.0082, 0.963)
    let wave2: XParticle[] = []
    let wave3: XParticle[] = []
    setTimeout(() => { wave2 = spawnWave(ox, oy, 500, 1.4*dpr, 6*dpr, 1.5, 3.5, 0.0062, 0.956) }, 28)
    setTimeout(() => { wave3 = spawnWave(ox, oy, 300, 0.4*dpr, 2.6*dpr, 0.5, 1.4, 0.0048, 0.971) }, 82)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.style.display = 'block'

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const all   = [...wave1, ...wave2, ...wave3]
      let   alive = false
      for (const p of all) {
        if (p.life <= 0) continue
        p.x += p.vx; p.y += p.vy; p.vx *= p.damping; p.vy *= p.damping; p.life -= p.decay
        if (p.r > 1.6) p.r *= 0.9985
        if (p.life <= 0) continue
        alive = true
        const alpha  = Math.pow(Math.max(0, p.life), 1.6)
        const dist   = Math.hypot(p.x - ox, p.y - oy)
        const warmth = Math.max(0, 1 - dist / (260 * dpr))
        ctx.globalAlpha = alpha
        ctx.fillStyle   = `rgb(${Math.round(240 + warmth*14)},${Math.round(236 + warmth*7)},228)`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill()
      }
      ctx.globalAlpha = 1
      if (alive) explosionRaf.current = requestAnimationFrame(tick)
      else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display = 'none' }
    }
    requestAnimationFrame(() => { explosionRaf.current = requestAnimationFrame(tick) })

    // ── Page transition: explosion → dark overlay → /experience ──────────
    //
    // T+1500ms: overlay fades IN over 550ms  (screen goes dark)
    // T+2100ms: router.push fires            (SPA navigation starts)
    // T+2220ms: overlay fades OUT over 650ms (new page’s own fade-in takes over)
    //           Both sides are #060608 so the crossfade is imperceptible.
    // T+2920ms: overlay removed from DOM
    //
    setTimeout(() => {
      const overlay = document.createElement('div')
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:10000',
        'background:#060608',
        'opacity:0', 'pointer-events:none',
        'transition:opacity 550ms ease',
      ].join(';')
      document.body.appendChild(overlay)

      // Fade overlay IN
      requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.style.opacity = '1'
      }))

      // Navigate once overlay is fully opaque
      setTimeout(() => {
        router.push('/experience')

        // Fade overlay back OUT so the new page’s entrance animation is visible.
        // Without this the overlay stays opaque on top of the mounted page.
        setTimeout(() => {
          overlay.style.transition = 'opacity 0.65s ease'
          overlay.style.opacity    = '0'
          setTimeout(() => overlay.remove(), 700)
        }, 120)
      }, 600)
    }, 1500)
  }, [router])

  useEffect(() => () => {
    cancelAnimationFrame(floatRaf.current)
    cancelAnimationFrame(explosionRaf.current)
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.explosionCanvas}
        aria-hidden
        style={{ display: 'none' }}
      />
      <button
        ref={btnRef}
        className={styles.btn}
        onClick={detonate}
        onTouchEnd={e => { e.preventDefault(); detonate() }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') detonate() }}
        aria-label="Begin"
      >
        <span className={styles.label}>begin</span>
      </button>
    </>
  )
}
