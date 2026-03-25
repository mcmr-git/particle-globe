'use client'

import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import styles from './ParticleMorph.module.css'

// ─── Config ────────────────────────────────────────────────────────
const N     = 800    // total particles
const SPACE = 500   // coordinate space for shape definitions

const SHAPE_LABELS = ['home', 'in the air', 'at the table', 'in paradise'] as const

// ─── Geometry helpers ────────────────────────────────────────────
type Pt = readonly [number, number]

/** n points along a straight segment */
function seg(x1: number, y1: number, x2: number, y2: number, n: number): Pt[] {
  if (n <= 1) return [[x1, y1]]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t] as const
  })
}

/** n points along a quadratic Bézier */
function qbez(
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  n: number
): Pt[] {
  if (n <= 1) return [[x0, y0]]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), u = 1 - t
    return [u * u * x0 + 2 * u * t * cx + t * t * x1,
            u * u * y0 + 2 * u * t * cy + t * t * y1] as const
  })
}

/** n points along a cubic Bézier */
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

/** Resample pts to exactly n points via linear interpolation */
function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length === 0) return Array.from({ length: n }, () => [SPACE/2, SPACE/2] as Pt)
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0])
  return Array.from({ length: n }, (_, i) => {
    const t   = (i / (n - 1)) * (pts.length - 1)
    const lo  = Math.floor(t)
    const hi  = Math.min(lo + 1, pts.length - 1)
    const f   = t - lo
    return [
      pts[lo][0] * (1 - f) + pts[hi][0] * f,
      pts[lo][1] * (1 - f) + pts[hi][1] * f,
    ] as const
  })
}

// ─── Shape definitions (all in [0,500] × [0,500]) ─────────────────────

/** House: peaked roof + walls + door opening + chimney */
function makeHouse(): Pt[] {
  const raw: Pt[] = [
    // Left roof slope:  peak → left eave
    ...seg(250, 108, 118, 252, 55),
    // Left wall: eave → floor-left
    ...seg(118, 252, 118, 392, 42),
    // Floor left segment (up to door)
    ...seg(118, 392, 218, 392, 30),
    // Door left side (going up)
    ...seg(218, 392, 218, 316, 22),
    // Door lintel
    ...seg(218, 316, 282, 316, 18),
    // Door right side (going down)
    ...seg(282, 316, 282, 392, 22),
    // Floor right segment
    ...seg(282, 392, 382, 392, 30),
    // Right wall: floor-right → eave
    ...seg(382, 392, 382, 252, 42),
    // Right roof slope: eave → peak
    ...seg(382, 252, 250, 108, 55),
    // Chimney — left side (up), top, right side
    ...seg(294, 195, 294, 148, 14),
    ...seg(294, 148, 320, 148,  9),
    ...seg(320, 148, 320, 192, 14),
  ]
  return resample(raw, N)
}

/** Plane: side view, flying right — fuselage + swept wing + tail fins */
function makePlane(): Pt[] {
  const raw: Pt[] = [
    // Fuselage top (tail → nose)
    ...qbez(108, 244, 258, 224, 390, 252, 80),
    // Nose cap (tiny arc at front, simulated with 2 segs)
    ...seg(390, 252, 395, 256,  5),
    ...seg(395, 256, 390, 260,  5),
    // Fuselage bottom (nose → tail)
    ...qbez(390, 260, 258, 276, 108, 260, 80),
    // Tail back edge
    ...seg(108, 260, 108, 244,  8),
    // Main swept wing — leading edge: root → tip
    ...seg(298, 254, 170, 338, 65),
    // Main wing trailing edge: tip → trailing root
    ...seg(170, 338, 338, 264, 68),
    // Trailing edge back to fuselage (small connector)
    ...seg(338, 264, 298, 254,  4),
    // Vertical tail fin
    ...seg(120, 244, 106, 190, 26),
    ...seg(106, 190, 142, 250, 26),
    // Horizontal stabiliser
    ...seg(104, 260, 100, 274, 10),
    ...seg(100, 274, 144, 268, 20),
    ...seg(144, 268, 144, 262,  5),
  ]
  return resample(raw, N)
}

/** Fork & knife: two utensils upright, side by side */
function makeForkKnife(): Pt[] {
  // ─ FORK centered ~x=185 ─
  const fork: Pt[] = [
    // Tine 1 (leftmost)
    ...seg(177, 175, 177, 288, 36),
    // Tine 2 (middle)
    ...seg(187, 175, 187, 288, 36),
    // Tine 3 (rightmost)
    ...seg(197, 175, 197, 288, 36),
    // Arch connecting tine bottoms
    ...qbez(177, 288, 187, 302, 197, 288, 16),
    // Left handle edge
    ...seg(182, 300, 182, 390, 27),
    // Handle bottom
    ...seg(182, 390, 192, 390,  5),
    // Right handle edge (going up)
    ...seg(192, 390, 192, 300, 27),
    // Tine tops — subtle arc connecting them
    ...qbez(177, 175, 187, 168, 197, 175, 10),
  ]

  // ─ KNIFE centered ~x=315 ─
  const knife: Pt[] = [
    // Left (sharp) blade edge: tip → guard
    ...seg(311, 175, 310, 290, 36),
    // Guard
    ...seg(310, 290, 322, 290, 10),
    // Right blade/handle edge: guard → handle bottom
    ...qbez(322, 290, 323, 232, 318, 175, 36),
    // Blade tip
    ...seg(318, 175, 311, 175,  4),
    // Handle left edge
    ...seg(310, 290, 310, 390, 27),
    // Handle bottom
    ...seg(310, 390, 322, 390,  5),
    // Handle right edge (going up)
    ...seg(322, 390, 322, 290, 27),
  ]

  return resample([...fork, ...knife], N)
}

/** Palm tree: curved trunk + 7 arching fronds */
function makePalmTree(): Pt[] {
  // Trunk: cubic Bézier with slight rightward lean
  const trunk = cbez(250, 388, 253, 315, 260, 235, 266, 162, 70)

  // Fronds radiate from tree top (266, 162)
  const top: Pt = [266, 162]
  const fronds: Pt[] = [
    // Far-left drooping
    ...qbez(top[0], top[1], 196, 128, 138, 148, 30),
    // Left
    ...qbez(top[0], top[1], 216, 142, 172, 198, 30),
    // Upper-left
    ...qbez(top[0], top[1], 238, 116, 212, 108, 25),
    // Straight up
    ...qbez(top[0], top[1], 255, 112, 250, 96,  20),
    // Upper-right
    ...qbez(top[0], top[1], 296, 114, 318, 108, 25),
    // Right
    ...qbez(top[0], top[1], 320, 142, 352, 192, 30),
    // Far-right drooping
    ...qbez(top[0], top[1], 332, 126, 380, 146, 30),
  ]

  // Small coconut clusters near the frond bases (small arcs)
  const coconuts: Pt[] = [
    ...seg(266, 162, 272, 158, 4),
    ...seg(272, 158, 275, 164, 4),
    ...seg(260, 162, 256, 158, 4),
    ...seg(256, 158, 254, 165, 4),
    ...seg(266, 168, 270, 172, 4),
  ]

  return resample([...trunk, ...fronds, ...coconuts], N)
}

// Precompute all shapes once (module-level, shared)
const SHAPES: readonly Pt[][] = [makeHouse(), makePlane(), makeForkKnife(), makePalmTree()]

// ─── Particle interface ─────────────────────────────────────────────────
interface Particle {
  baseX:   number  // GSAP-animated target position
  baseY:   number
  ampX:    number  // float amplitude x
  ampY:    number  // float amplitude y
  freqX:   number  // float frequency x (hz)
  freqY:   number  // float frequency y (hz)
  phaseX:  number  // float phase x (radians)
  phaseY:  number  // float phase y (radians)
  stagger: number  // morph stagger offset [0, 0.35]
  r:       number  // particle radius
}

// ─── Easing helper ───────────────────────────────────────────────────
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

  // Particles allocated once
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

  // ── Morph to a given shape index ──────────────────────────────────
  const morphTo = useCallback((idx: number, duration = 1.4) => {
    if (morphingRef.current) return
    morphingRef.current = true
    shapeIdxRef.current = idx

    const ps      = particles.current
    const targets = SHAPES[idx]
    const startX  = ps.map(p => p.baseX)
    const startY  = ps.map(p => p.baseY)

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
          // Per-particle effective progress with stagger offset
          const eff = Math.max(0, Math.min(1, (raw - stag) / (1 - stag)))
          const et  = easeInOut(eff)
          ps[i].baseX = startX[i] + (targets[i][0] - startX[i]) * et
          ps[i].baseY = startY[i] + (targets[i][1] - startY[i]) * et
        }
      },
      onComplete() {
        // Snap to exact target positions
        for (let i = 0; i < N; i++) {
          ps[i].baseX = targets[i][0]
          ps[i].baseY = targets[i][1]
        }
        morphingRef.current = false
      },
    })
  }, [])

  // ── Canvas rAF render loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const d = dpr()
      canvas.width  = window.innerWidth  * d
      canvas.height = window.innerHeight * d
      canvas.style.width  = window.innerWidth  + 'px'
      canvas.style.height = window.innerHeight + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const t0 = performance.now()
    const tick = (now: number) => {
      const t   = (now - t0) * 0.001
      const d   = dpr()
      const ctx = canvas.getContext('2d')!
      const W   = canvas.width  / d
      const H   = canvas.height / d

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Scale: fit the SPACE coordinate system into the viewport
      // Use 72% of the smaller dimension, leave room for button below
      const scale = Math.min(W * 0.78, H * 0.68) / SPACE
      const offX  = (W - SPACE * scale) / 2
      // Shift shape slightly upward to leave room for the button
      const offY  = (H - SPACE * scale) / 2 - H * 0.04

      ctx.fillStyle = '#f0ece4'
      const ps = particles.current

      for (const p of ps) {
        const fx = Math.sin(t * p.freqX * Math.PI * 2 + p.phaseX) * p.ampX
        const fy = Math.sin(t * p.freqY * Math.PI * 2 + p.phaseY) * p.ampY

        // Canvas physical coords
        const cx = ((p.baseX + fx) * scale + offX) * d
        const cy = ((p.baseY + fy) * scale + offY) * d

        ctx.globalAlpha = 0.86 + Math.random() * 0.10   // subtle shimmer
        ctx.beginPath()
        ctx.arc(cx, cy, p.r * d, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    // Initial: scatter → house
    const initTimer = setTimeout(() => morphTo(0, 1.6), 200)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      clearTimeout(initTimer)
      tweenRef.current?.kill()
    }
  }, [morphTo])

  // ── Button handler ───────────────────────────────────────────────────
  const handleMorph = useCallback(() => {
    if (morphingRef.current) return
    const next = (shapeIdxRef.current + 1) % SHAPES.length
    morphTo(next)
  }, [morphTo])

  const currentLabel = SHAPE_LABELS[shapeIdxRef.current]

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      {/* Morph button */}
      <button
        className={styles.morphBtn}
        onClick={handleMorph}
        aria-label="Morph to next shape"
      >
        {/* Circular arrows SVG */}
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
        <span className={styles.morphLabel}>{currentLabel}</span>
      </button>
    </div>
  )
}
