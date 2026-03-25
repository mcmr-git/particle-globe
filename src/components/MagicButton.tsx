'use client'

import { useEffect, useRef, useCallback } from 'react'
import styles from './MagicButton.module.css'

// ─── Particle type ──────────────────────────────────────────────────
interface XParticle {
  x: number; y: number
  vx: number; vy: number
  r: number
  life: number      // 0–1, current life
  decay: number     // life lost per frame
  damping: number   // velocity multiplier per frame
}

// ─── Spawn one wave of particles from an origin in canvas-px coords ───
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

// ─── Component ──────────────────────────────────────────────────────
export default function MagicButton() {
  const btnRef     = useRef<HTMLButtonElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const floatRaf   = useRef<number>(0)
  const explosionRaf = useRef<number>(0)
  // Track whether detonation has been triggered (avoids double-fire)
  const firedRef   = useRef(false)

  // ── Size canvas to full viewport (DPR-aware) ─────────────────────
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

  // ── Self-managed reveal via IntersectionObserver ──────────────────
  // Adds .visible class (CSS Module-scoped) directly via the imported styles object
  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          btn.classList.add(styles.visible)
          obs.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(btn)
    return () => obs.disconnect()
  }, [])

  // ── Float animation: same sine-wave feel as roadmap nodes ───────────
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
      if (firedRef.current) return   // stop float once detonated
      const t   = (now - t0) * 0.001
      const btn = btnRef.current
      if (btn) {
        const dy = Math.sin(t * p.freq  * Math.PI * 2 + p.phase)  * p.amp
        const dx = Math.sin(t * p.xFreq * Math.PI * 2 + p.xPhase) * p.xAmp
        // translateX(-50%) centres the pill; translate(dx,dy) is the float
        btn.style.transform = `translateX(-50%) translate(${dx}px,${dy}px)`
      }
      floatRaf.current = requestAnimationFrame(tick)
    }
    floatRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(floatRaf.current)
  }, [])

  // ── Detonation ───────────────────────────────────────────────────
  const detonate = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true

    const btn    = btnRef.current
    const canvas = canvasRef.current
    if (!btn || !canvas) return

    cancelAnimationFrame(floatRaf.current)

    // Capture button centre in viewport coords BEFORE dissolving
    const rect = btn.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2   // viewport px
    const cy   = rect.top  + rect.height / 2

    // ── Phase 0: dissolve the button (CSS inline) ──────────────────────
    btn.style.transition = 'opacity 0.14s ease-out, transform 0.14s ease-out'
    btn.style.opacity    = '0'
    btn.style.transform  = 'translateX(-50%) scale(0.78)'

    // ── Nuclear flash ─────────────────────────────────────────────
    const flash = document.createElement('div')
    flash.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9998',
      'background:rgba(240,236,228,0.09)',
      'pointer-events:none',
      'opacity:1',
      'transition:opacity 90ms ease',
    ].join(';')
    document.body.appendChild(flash)
    // Two rAF frames to ensure paint, then fade out
    requestAnimationFrame(() => requestAnimationFrame(() => {
      flash.style.opacity = '0'
      setTimeout(() => flash.remove(), 130)
    }))

    // ── Spawn particles (canvas-px coords = viewport-px × dpr) ─────────
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ox  = cx * dpr
    const oy  = cy * dpr

    // Wave 1 — fast corona: small, very high energy
    const wave1 = spawnWave(ox, oy, 920, 3.5*dpr, 14*dpr,  0.7, 2.2, 0.0082, 0.963)
    // Wave 2 — shockwave ring: medium, slower
    let wave2: XParticle[] = []
    setTimeout(() => {
      wave2 = spawnWave(ox, oy, 500, 1.4*dpr, 6*dpr, 1.5, 3.5, 0.0062, 0.956)
    }, 28)
    // Wave 3 — trailing dust: large, near-still
    let wave3: XParticle[] = []
    setTimeout(() => {
      wave3 = spawnWave(ox, oy, 300, 0.4*dpr, 2.6*dpr, 0.5, 1.4, 0.0048, 0.971)
    }, 82)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Show canvas (was hidden)
    canvas.style.display = 'block'

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const all   = [...wave1, ...wave2, ...wave3]
      let   alive = false

      for (const p of all) {
        if (p.life <= 0) continue

        p.x    += p.vx
        p.y    += p.vy
        p.vx   *= p.damping
        p.vy   *= p.damping
        p.life -= p.decay
        // Very-large particles shrink slowly
        if (p.r > 1.6) p.r *= 0.9985

        if (p.life <= 0) continue
        alive = true

        // Steep power-law fade: hangs full then drops fast at end
        const alpha = Math.pow(Math.max(0, p.life), 1.6)

        // Warm centre tint— particles near origin are slightly warmer
        const dist   = Math.hypot(p.x - ox, p.y - oy)
        const warmth = Math.max(0, 1 - dist / (260 * dpr))
        const r = Math.round(240 + warmth * 14)
        const g = Math.round(236 + warmth * 7)
        const b = 228

        ctx.globalAlpha = alpha
        ctx.fillStyle   = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1

      if (alive) {
        explosionRaf.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        canvas.style.display = 'none'
      }
    }

    // Start one frame after dissolve starts so first rAF is clean
    requestAnimationFrame(() => {
      explosionRaf.current = requestAnimationFrame(tick)
    })
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────────
  useEffect(() => () => {
    cancelAnimationFrame(floatRaf.current)
    cancelAnimationFrame(explosionRaf.current)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────
  // NOTE: we never unmount this component after firing. The button dissolves
  // via inline-style opacity:0, the canvas shows the explosion then hides itself.
  // This avoids the canvas being torn down mid-animation.
  return (
    <>
      {/* Full-viewport explosion canvas: fixed, above everything, hidden until detonation */}
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
