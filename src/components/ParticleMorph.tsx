'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
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
  if (pts.length === 0) return Array.from({ length: n }, () => [SPACE/2, SPACE/2] as unknown as Pt)
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0])
  return Array.from({ length: n }, (_, i) => {
    const t  = (i / (n - 1)) * (pts.length - 1)
    const lo = Math.floor(t)
    const hi = Math.min(lo + 1, pts.length - 1)
    const f  = t - lo
    return [pts[lo][0]*(1-f) + pts[hi][0]*f,
            pts[lo][1]*(1-f) + pts[hi][1]*f] as const
  })
}

// ─── Shape definitions ──────────────────────────────────────────────────

/** House: peaked roof + walls + door + chimney (unchanged) */
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
 * Plane: side view, flying right.
 * Redesigned for visual weight:
 * - Fuselage drawn as a CLOSED tube (top curve + nose arc + bottom curve + tail edge)
 * - Wing drawn as a CLOSED triangle outline (all three sides visible)
 * - Tail fins as closed shapes
 * - Cockpit window oval near nose for focal detail
 */
function makePlane(): Pt[] {
  const raw: Pt[] = [
    // ─ Fuselage top edge: tail → nose ─
    ...qbez(108, 240, 258, 218, 392, 249, 92),
    // Nose cap — small arc connecting top to bottom
    ...seg(392, 249, 397, 254,  6),
    ...seg(397, 254, 392, 259,  6),
    // ─ Fuselage bottom edge: nose → tail ─
    ...qbez(392, 259, 258, 280, 108, 264, 92),
    // Tail back edge closes the tube
    ...seg(108, 264, 108, 240, 12),

    // ─ Main wing — closed triangle outline ─
    // Leading edge (root → tip)
    ...seg(300, 252, 165, 338, 72),
    // Wingtip: small connector
    ...seg(165, 338, 175, 342,  5),
    // Trailing edge (tip → root)
    ...seg(175, 342, 338, 262, 72),
    // Wing root connector (closes triangle on fuselage)
    ...seg(338, 262, 300, 252,  6),

    // ─ Vertical tail fin — closed triangle ─
    ...seg(118, 240, 104, 186, 28),
    ...seg(104, 186, 144, 242, 28),

    // ─ Horizontal stabiliser — closed rectangle ─
    ...seg(102, 264, 148, 260, 22),
    ...seg(148, 260, 148, 270,  6),
    ...seg(148, 270, 102, 274, 22),
    ...seg(102, 274, 102, 264,  6),

    // ─ Cockpit window — small oval near nose ─
    ...qbez(370, 242, 380, 238, 390, 244, 10),
    ...qbez(390, 244, 382, 250, 370, 246, 10),
  ]
  return resample(raw, N)
}

/**
 * Fork & Knife: two upright utensils.
 * Redesigned for visual weight:
 * - Each tine drawn as a 4px-wide rectangle (both edges + top cap)
 * - Handle drawn as a proper rectangle perimeter (wider, both edges + bottom)
 * - Knife blade as a full trapezoid outline (both edges converge to tip)
 * - Guard crosspiece on knife
 */
function makeForkKnife(): Pt[] {
  // ─ FORK (centered ~x=186) ─────────────────────────────────
  // Tines: each 4px wide, 7px spacing between tines
  // Tine 1 at x=[173,177], tine 2 at x=[184,188], tine 3 at x=[195,199]
  const fork: Pt[] = [
    // Tine 1 — left edge, top cap, right edge
    ...seg(173, 178, 173, 290, 33),
    ...seg(173, 178, 177, 178,  4),
    ...seg(177, 178, 177, 290, 33),
    // Tine 2 — left edge, top cap, right edge
    ...seg(184, 178, 184, 290, 33),
    ...seg(184, 178, 188, 178,  4),
    ...seg(188, 178, 188, 290, 33),
    // Tine 3 — left edge, top cap, right edge
    ...seg(195, 178, 195, 290, 33),
    ...seg(195, 178, 199, 178,  4),
    ...seg(199, 178, 199, 290, 33),
    // Arch joining all tine bottoms → handle neck
    ...qbez(173, 290, 186, 310, 199, 290, 18),
    // Handle — left edge
    ...seg(180, 308, 180, 394, 26),
    // Handle bottom
    ...seg(180, 394, 194, 394,  8),
    // Handle — right edge
    ...seg(194, 394, 194, 308, 26),
  ]

  // ─ KNIFE (centered ~x=316) ────────────────────────────────
  // Blade: converges from guard (14px wide) to tip point
  // Guard at y=292, tip at (316, 170)
  const knife: Pt[] = [
    // Blade left edge (straight, sharp side)
    ...seg(310, 292, 316, 170, 38),
    // Blade tip top connector (tiny horizontal)
    ...seg(316, 170, 321, 172,  3),
    // Blade right edge (slight belly curve on spine side)
    ...qbez(321, 172, 326, 228, 324, 292, 38),
    // Guard (crosspiece)
    ...seg(306, 292, 328, 292, 14),
    // Handle — left edge
    ...seg(309, 294, 309, 394, 28),
    // Handle bottom
    ...seg(309, 394, 323, 394,  8),
    // Handle — right edge
    ...seg(323, 394, 323, 294, 28),
    // Handle top connector (between guard and handle)
    ...seg(309, 294, 323, 294,  8),
  ]

  return resample([...fork, ...knife], N)
}

/** Palm tree: curved trunk + 7 arching fronds (unchanged) */
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
    ...seg(266, 162, 272, 158, 4),
    ...seg(272, 158, 275, 164, 4),
    ...seg(260, 162, 256, 158, 4),
    ...seg(256, 158, 254, 165, 4),
    ...seg(266, 168, 270, 172, 4),
  ]
  return resample([...trunk, ...fronds, ...coconuts], N)
}

// Precompute all shapes once at module level
const SHAPES: readonly Pt[][] = [makeHouse(), makePlane(), makeForkKnife(), makePalmTree()]

// ─── Particle interface ─────────────────────────────────────────────────
interface Particle {
  baseX:   number
  baseY:   number
  ampX:    number
  ampY:    number
  freqX:   number
  freqY:   number
  phaseX:  number
  phaseY:  number
  stagger: number
  r:       number
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── Component ──────────────────────────────────────────────────────
export default function ParticleMorph() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef<number>(0)
  const morphingRef = useRef(false)
  const shapeIdxRef = useRef(0)
  const tweenRef    = useRef<gsap.core.Tween | null>(null)
  const [label, setLabel] = useState<typeof SHAPE_LABELS[number]>(SHAPE_LABELS[0])

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

  const morphTo = useCallback((idx: number, duration = 1.4) => {
    if (morphingRef.current) return
    morphingRef.current = true
    shapeIdxRef.current = idx
    setLabel(SHAPE_LABELS[idx])

    const ps      = particles.current
    const targets = SHAPES[idx]
    const startX  = ps.map(p => p.baseX)
    const startY  = ps.map(p => p.baseY)
    const prog    = { value: 0 }

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
          ps[i].baseX = startX[i] + (targets[i][0] - startX[i]) * et
          ps[i].baseY = startY[i] + (targets[i][1] - startY[i]) * et
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
  }, [])

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

      const scale = Math.min(W * 0.78, H * 0.68) / SPACE
      const offX  = (W - SPACE * scale) / 2
      const offY  = (H - SPACE * scale) / 2 - H * 0.04

      ctx.fillStyle = '#f0ece4'
      const ps = particles.current

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
      clearTimeout(initTimer)
      tweenRef.current?.kill()
    }
  }, [morphTo])

  const handleMorph = useCallback(() => {
    if (morphingRef.current) return
    const next = (shapeIdxRef.current + 1) % SHAPES.length
    morphTo(next)
  }, [morphTo])

  return (
    <div className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
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
    </div>
  )
}
