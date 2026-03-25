'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import styles from './MagicButton.module.css'

// ─── Particle type ──────────────────────────────────────────────────
interface XParticle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number      // 0–1
  decay: number     // life units lost per frame
  damping: number   // velocity multiplier per frame
}

// ─── Spawn one explosion wave from viewport-centre coords ──────────
function spawnWave(
  cx: number,
  cy: number,
  count: number,
  speedMin: number,
  speedMax: number,
  rMin: number,
  rMax: number,
  decay: number,
  damping: number,
): XParticle[] {
  return Array.from({ length: count }, (_, i) => {
    // Evenly distribute base angles, then jitter
    const baseAngle  = (i / count) * Math.PI * 2
    const jitter     = (Math.random() - 0.5) * 0.55   // ±~16°
    const angle      = baseAngle + jitter
    const speed      = speedMin + Math.random() * (speedMax - speedMin)
    return {
      x: cx, y: cy,
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
  const btnRef    = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const [fired, setFired] = useState(false)

  // ── Size canvas to full viewport ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = window.innerWidth  * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Float animation (same feel as roadmap nodes) ─────────────────
  const floatParams = useRef({
    amp:    4.5 + Math.random() * 2,
    freq:   0.38 + Math.random() * 0.24,
    phase:  Math.random() * Math.PI * 2,
    xAmp:   1.2 + Math.random() * 1.2,
    xFreq:  0.22 + Math.random() * 0.18,
    xPhase: Math.random() * Math.PI * 2,
  })
  const floatRaf = useRef<number>(0)

  useEffect(() => {
    if (fired) return  // stop floating once detonated
    const p  = floatParams.current
    const t0 = performance.now()

    const tick = (now: number) => {
      const t  = (now - t0) * 0.001
      const btn = btnRef.current
      if (btn) {
        const dy = Math.sin(t * p.freq  * Math.PI * 2 + p.phase)  * p.amp
        const dx = Math.sin(t * p.xFreq * Math.PI * 2 + p.xPhase) * p.xAmp
        btn.style.transform = `translateX(-50%) translate(${dx}px, ${dy}px)`
      }
      floatRaf.current = requestAnimationFrame(tick)
    }
    floatRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(floatRaf.current)
  }, [fired])

  // ── Main detonation logic ─────────────────────────────────────────
  const detonate = useCallback(() => {
    const btn    = btnRef.current
    const canvas = canvasRef.current
    if (!btn || !canvas || fired) return

    setFired(true)
    cancelAnimationFrame(floatRaf.current)

    // Capture button centre in viewport coords
    const rect = btn.getBoundingClientRect()
    const cx   = rect.left + rect.width  / 2
    const cy   = rect.top  + rect.height / 2

    // ── Phase 0: dissolve button ──────────────────────────────────
    btn.style.transition = 'opacity 0.14s ease, transform 0.14s ease'
    btn.style.opacity    = '0'
    btn.style.transform  = 'translateX(-50%) scale(0.82)'

    // ── Nuclear flash ─────────────────────────────────────────────
    const flash = document.createElement('div')
    flash.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9998',
      'background:rgba(240,236,228,0.09)',
      'pointer-events:none',
      'transition:opacity 80ms ease',
    ].join(';')
    document.body.appendChild(flash)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flash.style.opacity = '0'
        setTimeout(() => flash.remove(), 120)
      })
    })

    // ── Particle waves ────────────────────────────────────────────
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Canvas coords = viewport coords × dpr
    const ox = cx * dpr
    const oy = cy * dpr

    // Wave 1 — fast corona, micro particles
    const wave1 = spawnWave(ox, oy, 320, 3.5 * dpr, 13.5 * dpr, 0.7, 2.2, 0.0075, 0.962)

    // Wave 2 — slower shockwave ring (spawned 28ms later)
    let wave2: XParticle[] = []
    setTimeout(() => {
      wave2 = spawnWave(ox, oy, 140, 1.4 * dpr, 5.8 * dpr, 1.5, 3.5, 0.0060, 0.955)
    }, 28)

    // Wave 3 — ultra-slow trailing dust (80ms later)
    let wave3: XParticle[] = []
    setTimeout(() => {
      wave3 = spawnWave(ox, oy, 90, 0.5 * dpr, 2.6 * dpr, 0.5, 1.4, 0.0048, 0.970)
    }, 80)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.style.display = 'block'

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const all = [...wave1, ...wave2, ...wave3]
      let anyAlive = false

      for (const p of all) {
        if (p.life <= 0) continue

        p.x    += p.vx
        p.y    += p.vy
        p.vx   *= p.damping
        p.vy   *= p.damping
        p.life -= p.decay
        if (p.r > 1.6) p.r *= 0.998   // very slow shrink on bigger particles

        if (p.life <= 0) continue
        anyAlive = true

        // Alpha: steep fall-off — feels like it hangs then vanishes
        const alpha = Math.pow(Math.max(0, p.life), 1.55)

        // Subtle warm tint near centre (pure distance calc in canvas space)
        const dist = Math.hypot(p.x - ox, p.y - oy)
        const warm = Math.max(0, 1 - dist / (280 * dpr))   // warm within 280px
        // Base: #f0ece4 = rgb(240,236,228)
        const r = Math.round(240 + warm * 12)
        const g = Math.round(236 + warm * 6)
        const b = Math.round(228)

        ctx.globalAlpha = alpha
        ctx.fillStyle   = `rgb(${r},${g},${b})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1

      if (anyAlive) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        canvas.style.display = 'none'
      }
    }

    // Start rAF after one frame so button has started dissolving
    requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(tick)
    })
  }, [fired])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(floatRaf.current)
    }
  }, [])

  if (fired) return null

  return (
    <>
      {/* Full-viewport explosion canvas */}
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
        aria-label="Begin"
      >
        <span className={styles.label}>begin</span>
      </button>
    </>
  )
}
