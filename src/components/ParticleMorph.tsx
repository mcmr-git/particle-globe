'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import gsap from 'gsap'
import styles from './ParticleMorph.module.css'

// ─── Config ────────────────────────────────────────────────────────
const N     = 800
const SPACE = 500
const SHAPE_LABELS = ['home', 'in the air', 'at the table', 'in paradise'] as const

// ─── Geometry helpers ────────────────────────────────────────────
type Pt = readonly [number, number]

function seg(x1: number, y1: number, x2: number, y2: number, n: number): Pt[] {
  if (n <= 1) return [[x1, y1]]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] as const
  })
}

function qbez(
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  n: number
): Pt[] {
  if (n <= 1) return [[x0, y0]]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), u = 1 - t
    return [u*u*x0 + 2*u*t*cx + t*t*x1,
            u*u*y0 + 2*u*t*cy + t*t*y1] as const
  })
}

function cbez(
  x0: number, y0: number,
  c1x: number, c1y: number,
  c2x: number, c2y: number,
  x1: number, y1: number,
  n: number
): Pt[] {
  if (n <= 1) return [[x0, y0]]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), u = 1 - t
    return [
      u*u*u*x0 + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*x1,
      u*u*u*y0 + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*y1,
    ] as const
  })
}

function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length === 0) return Array.from({ length: n }, () => [SPACE / 2, SPACE / 2] as unknown as Pt)
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0])
  return Array.from({ length: n }, (_, i) => {
    const t  = (i / (n - 1)) * (pts.length - 1)
    const lo = Math.floor(t)
    const hi = Math.min(lo + 1, pts.length - 1)
    const f  = t - lo
    return [
      pts[lo][0] * (1 - f) + pts[hi][0] * f,
      pts[lo][1] * (1 - f) + pts[hi][1] * f,
    ] as const
  })
}

// ─── Shape definitions ──────────────────────────────────────────────────

/** House: peaked roof, walls, door opening, chimney */
function makeHouse(): Pt[] {
  const raw: Pt[] = [
    ...seg(250, 108, 118, 252, 55),
    ...seg(118, 252, 118, 392, 42),
    ...seg(118, 392, 218, 392, 30),
    ...seg(218, 392, 218, 316, 22),
    ...seg(218, 316, 282, 316, 18),
    ...seg(282, 316, 282, 392, 22),
    ...seg(282, 392, 382, 392, 30),
    ...seg(382, 392, 382, 252, 42),
    ...seg(382, 252, 250, 108, 55),
    ...seg(294, 195, 294, 148, 14),
    ...seg(294, 148, 320, 148,  9),
    ...seg(320, 148, 320, 192, 14),
  ]
  return resample(raw, N)
}

/**
 * Plane: top-down / plan view (like ✈️ emoji).
 * Fuselage = closed vertical cigar. Two symmetric swept wings + two tail fins.
 */
function makePlane(): Pt[] {
  const raw: Pt[] = [
    // Fuselage (closed shape)
    ...qbez(228, 132, 250, 112, 272, 132, 14),
    ...seg(272, 132, 272, 355, 70),
    ...qbez(272, 355, 250, 378, 228, 355, 14),
    ...seg(228, 355, 228, 132, 70),
    // Left wing
    ...seg(228, 228, 105, 295, 60),
    ...seg(105, 295, 112, 312,  8),
    ...seg(112, 312, 228, 268, 60),
    // Right wing (mirror)
    ...seg(272, 228, 395, 295, 60),
    ...seg(395, 295, 388, 312,  8),
    ...seg(388, 312, 272, 268, 60),
    // Left tail fin
    ...seg(228, 342, 188, 380, 25),
    ...seg(188, 380, 228, 362, 25),
    // Right tail fin
    ...seg(272, 342, 312, 380, 25),
    ...seg(312, 380, 272, 362, 25),
  ]
  return resample(raw, N)
}

/**
 * Fork & Knife: wider spacing, heavier strokes.
 * Fork: 3 tines each 10px wide, 10px gaps, wide handle.
 * Knife: 50px tapered blade, matching handle weight.
 */
function makeForkKnife(): Pt[] {
  const fork: Pt[] = [
    // Tine 1 [140,150]
    ...seg(140, 175, 140, 305, 38), ...seg(140, 175, 150, 175, 6), ...seg(150, 175, 150, 305, 38),
    // Tine 2 [160,170]
    ...seg(160, 175, 160, 305, 38), ...seg(160, 175, 170, 175, 6), ...seg(170, 175, 170, 305, 38),
    // Tine 3 [180,190]
    ...seg(180, 175, 180, 305, 38), ...seg(180, 175, 190, 175, 6), ...seg(190, 175, 190, 305, 38),
    // Arch joining tines to handle neck
    ...qbez(140, 305, 165, 330, 190, 305, 22),
    // Handle perimeter (36px wide)
    ...seg(147, 328, 147, 395, 28), ...seg(147, 395, 183, 395, 11),
    ...seg(183, 395, 183, 328, 28), ...seg(183, 328, 147, 328, 11),
  ]

  const knife: Pt[] = [
    // Blade left (sharp) edge: tip → guard
    ...seg(337, 170, 313, 305, 42),
    // Guard crosspiece
    ...seg(309, 305, 365, 305, 17),
    // Blade right (spine) edge: guard → tip, slight belly
    ...qbez(365, 305, 370, 232, 337, 170, 42),
    // Handle perimeter (38px wide)
    ...seg(312, 308, 312, 395, 28), ...seg(312, 395, 362, 395, 14),
    ...seg(362, 395, 362, 308, 28), ...seg(362, 308, 312, 308, 14),
  ]

  return resample([...fork, ...knife], N)
}

/** Palm tree: curved trunk + 7 arching fronds + coconut hints */
function makePalmTree(): Pt[] {
  const trunk = cbez(250, 388, 253, 315, 260, 235, 266, 162, 70)
  const top: Pt = [266, 162]
  const fronds: Pt[] = [
    ...qbez(top[0], top[1], 196, 128, 138, 148, 30),
    ...qbez(top[0], top[1], 216, 142, 172, 198, 30),
    ...qbez(top[0], top[1], 238, 116, 212, 108, 25),
    ...qbez(top[0], top[1], 255, 112, 250,  96, 20),
    ...qbez(top[0], top[1], 296, 114, 318, 108, 25),
    ...qbez(top[0], top[1], 320, 142, 352, 192, 30),
    ...qbez(top[0], top[1], 332, 126, 380, 146, 30),
  ]
  const coconuts: Pt[] = [
    ...seg(266, 162, 272, 158, 4), ...seg(272, 158, 275, 164, 4),
    ...seg(260, 162, 256, 158, 4), ...seg(256, 158, 254, 165, 4),
    ...seg(266, 168, 270, 172, 4),
  ]
  return resample([...trunk, ...fronds, ...coconuts], N)
}

/** Bold downward arrow — used exclusively for the palm-tree easter egg */
function makeArrow(): Pt[] {
  const raw: Pt[] = [
    ...seg(225, 112, 275, 112, 14),  // shaft top
    ...seg(275, 112, 275, 308, 60),  // shaft right
    ...seg(275, 308, 318, 308, 13),  // right shoulder
    ...seg(318, 308, 250, 392, 46),  // right to tip
    ...seg(250, 392, 182, 308, 46),  // left from tip
    ...seg(182, 308, 225, 308, 13),  // left shoulder
    ...seg(225, 308, 225, 112, 60),  // shaft left
  ]
  return resample(raw, N)
}

// Precompute morph-cycle shapes at module level
const SHAPES: readonly Pt[][] = [makeHouse(), makePlane(), makeForkKnife(), makePalmTree()]

// ─── Particle type ─────────────────────────────────────────────────────
interface Particle {
  baseX: number; baseY: number
  ampX: number;  ampY: number
  freqX: number; freqY: number
  phaseX: number; phaseY: number
  stagger: number; r: number
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── Component ──────────────────────────────────────────────────────
export default function ParticleMorph() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const rafRef       = useRef<number>(0)
  const morphingRef  = useRef(false)
  const shapeIdxRef  = useRef(0)
  const tweenRef     = useRef<gsap.core.Tween | null>(null)
  // morphTo is defined inside useEffect; exposed via ref for button handler
  const morphToRef   = useRef<((idx: number, dur?: number) => void) | null>(null)

  const [label,        setLabel]        = useState<typeof SHAPE_LABELS[number]>(SHAPE_LABELS[0])
  const [arrowLinkPos, setArrowLinkPos] = useState<{ x: number; y: number } | null>(null)

  const router = useRouter()

  // Particles: initialised once, mutated in place every frame
  const particles = useRef<Particle[]>(
    Array.from({ length: N }, () => ({
      baseX:   SPACE / 2 + (Math.random() - 0.5) * 60,
      baseY:   SPACE / 2 + (Math.random() - 0.5) * 60,
      ampX:    1.2 + Math.random() * 2.4,
      ampY:    2.8 + Math.random() * 4.0,
      freqX:   0.18 + Math.random() * 0.22,
      freqY:   0.30 + Math.random() * 0.28,
      phaseX:  Math.random() * Math.PI * 2,
      phaseY:  Math.random() * Math.PI * 2,
      stagger: Math.random() * 0.35,
      r:       0.7 + Math.random() * 1.1,
    }))
  )

  useEffect(() => {
    const canvas = canvasRef.current!
    const ps     = particles.current
    // Guard: experience page must be reached via MagicButton, not direct URL.
    // If the unlock flag is absent, redirect back to home.
    if (typeof sessionStorage !== 'undefined') {
      const unlocked = sessionStorage.getItem('poke_exp_unlocked')
      if (!unlocked) {
        router.push('/')
        return
      }
      sessionStorage.removeItem('poke_exp_unlocked')
    }

    const dprFn  = () => Math.min(window.devicePixelRatio || 1, 2)

    // Transform values — updated each tick, read by pointer handler
    let scale = 1, offX = 0, offY = 0

    // ── Resize ───────────────────────────────────────────────────
    const resize = () => {
      const d = dprFn()
      canvas.width        = window.innerWidth  * d
      canvas.height       = window.innerHeight * d
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    // ── morphTo ──────────────────────────────────────────────────
    const morphTo = (idx: number, duration = 1.4) => {
      if (morphingRef.current) return
      morphingRef.current = true
      shapeIdxRef.current = idx
      setLabel(SHAPE_LABELS[idx])

      const targets = SHAPES[idx]
      const sx = ps.map(p => p.baseX)
      const sy = ps.map(p => p.baseY)
      const prog = { value: 0 }

      tweenRef.current?.kill()
      tweenRef.current = gsap.to(prog, {
        value: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate() {
          const raw = prog.value
          for (let i = 0; i < N; i++) {
            const stag = ps[i].stagger
            const eff  = Math.max(0, Math.min(1, (raw - stag) / (1 - stag)))
            const et   = easeInOut(eff)
            ps[i].baseX = sx[i] + (targets[i][0] - sx[i]) * et
            ps[i].baseY = sy[i] + (targets[i][1] - sy[i]) * et
          }
        },
        onComplete() {
          for (let i = 0; i < N; i++) {
            ps[i].baseX = targets[i][0]
            ps[i].baseY = targets[i][1]
          }
          morphingRef.current = false
        },
      })
    }
    morphToRef.current = morphTo

    // ── Palm tree easter egg: scatter → arrow ───────────────────────────
    let easterEggFired = false
    const triggerPalmEasterEgg = () => {
      if (easterEggFired) return
      easterEggFired = true

      tweenRef.current?.kill()
      morphingRef.current = false

      // Phase 1: wild scatter (0.55s)
      const sx0      = ps.map(p => p.baseX)
      const sy0      = ps.map(p => p.baseY)
      const scatter  = ps.map((): [number, number] => [40 + Math.random() * 420, 40 + Math.random() * 420])
      const prog1    = { value: 0 }
      morphingRef.current = true

      tweenRef.current = gsap.to(prog1, {
        value: 1,
        duration: 0.55,
        ease: 'power3.out',
        onUpdate() {
          const t = prog1.value
          for (let i = 0; i < N; i++) {
            ps[i].baseX = sx0[i] + (scatter[i][0] - sx0[i]) * t
            ps[i].baseY = sy0[i] + (scatter[i][1] - sy0[i]) * t
          }
        },
        onComplete() {
          for (let i = 0; i < N; i++) {
            ps[i].baseX = scatter[i][0]
            ps[i].baseY = scatter[i][1]
          }
          morphingRef.current = false

          // Phase 2: converge to arrow (100ms pause, then 1.5s)
          setTimeout(() => {
            const arrowPts = makeArrow()
            const sx1  = ps.map(p => p.baseX)
            const sy1  = ps.map(p => p.baseY)
            const prog2 = { value: 0 }
            morphingRef.current = true

            tweenRef.current = gsap.to(prog2, {
              value: 1,
              duration: 1.5,
              ease: 'power2.inOut',
              onUpdate() {
                const raw = prog2.value
                for (let i = 0; i < N; i++) {
                  const stag = ps[i].stagger
                  const eff  = Math.max(0, Math.min(1, (raw - stag) / (1 - stag)))
                  const et   = easeInOut(eff)
                  ps[i].baseX = sx1[i] + (arrowPts[i][0] - sx1[i]) * et
                  ps[i].baseY = sy1[i] + (arrowPts[i][1] - sy1[i]) * et
                }
              },
              onComplete() {
                for (let i = 0; i < N; i++) {
                  ps[i].baseX = arrowPts[i][0]
                  ps[i].baseY = arrowPts[i][1]
                }
                morphingRef.current = false
                // Arrow tip at shape coord (250, 392) — show link below it
                setArrowLinkPos({ x: 250 * scale + offX, y: 392 * scale + offY + 22 })
              },
            })
          }, 100)
        },
      })
    }

    // ── Canvas pointer handler: chimney → /, palm top → easter egg ───
    const handlePointer = (lx: number, ly: number) => {
      const sx = (lx - offX) / scale
      const sy = (ly - offY) / scale

      // HOUSE: chimney hit area (shape coords, generously padded)
      if (shapeIdxRef.current === 0 && !morphingRef.current) {
        if (sx >= 265 && sx <= 345 && sy >= 100 && sy <= 225) {
          router.push('/')
          return
        }
      }

      // PALM TREE: frond-origin hit area (radius 90 in shape coords)
      if (shapeIdxRef.current === 3 && !morphingRef.current && !easterEggFired) {
        if (Math.hypot(sx - 266, sy - 162) < 90) {
          triggerPalmEasterEgg()
        }
      }
    }

    const onCanvasClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      handlePointer(e.clientX - r.left, e.clientY - r.top)
    }
    const onCanvasTouch = (e: TouchEvent) => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const t = e.changedTouches[0]
      handlePointer(t.clientX - r.left, t.clientY - r.top)
    }
    canvas.addEventListener('click', onCanvasClick)
    canvas.addEventListener('touchend', onCanvasTouch, { passive: false })

    // ── Render loop ─────────────────────────────────────────────────
    const t0  = performance.now()
    const tick = (now: number) => {
      const t   = (now - t0) * 0.001
      const d   = dprFn()
      const ctx = canvas.getContext('2d')!
      const W   = canvas.width  / d
      const H   = canvas.height / d

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update transform (closure-captured by pointer handler)
      scale = Math.min(W * 0.78, H * 0.68) / SPACE
      offX  = (W - SPACE * scale) / 2
      offY  = (H - SPACE * scale) / 2 - H * 0.04

      ctx.fillStyle = '#f0ece4'
      for (const p of ps) {
        const fx = Math.sin(t * p.freqX * Math.PI * 2 + p.phaseX) * p.ampX
        const fy = Math.sin(t * p.freqY * Math.PI * 2 + p.phaseY) * p.ampY
        const cx = ((p.baseX + fx) * scale + offX) * d
        const cy = ((p.baseY + fy) * scale + offY) * d
        ctx.globalAlpha = p.r * 0.52 + 0.45
        ctx.beginPath()
        ctx.arc(cx, cy, p.r * d, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    const initTimer = setTimeout(() => morphTo(0, 1.6), 200)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('click', onCanvasClick)
      canvas.removeEventListener('touchend', onCanvasTouch)
      clearTimeout(initTimer)
      tweenRef.current?.kill()
    }
  }, [router])

  const handleMorph = () => {
    if (arrowLinkPos || morphingRef.current) return
    morphToRef.current?.((shapeIdxRef.current + 1) % SHAPES.length)
  }

  return (
    <div className={styles.root}>
      {/* Canvas: pointer-events auto so hidden hit areas register */}
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      {/* Arrow link — fades in at arrow tip after palm easter egg */}
      {arrowLinkPos && (
        <a
          href="https://poke.com/r/placeholder"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.arrowLink}
          style={{ left: `${arrowLinkPos.x}px`, top: `${arrowLinkPos.y}px` }}
        >
          <span>view recipe</span>
        </a>
      )}

      {/* Morph button — hidden while arrow link is active */}
      {!arrowLinkPos && (
        <button
          className={styles.morphBtn}
          onClick={handleMorph}
          aria-label={`Morph to next shape, currently: ${label}`}
        >
          <svg
            className={styles.morphIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span className={styles.morphLabel}>{label}</span>
        </button>
      )}
    </div>
  )
}
