'use client'

import { useEffect, useRef, useCallback } from 'react'
import styles from './RoadmapSection.module.css'
import AustraliaOutline from './AustraliaOutline'

// ─── Types ───────────────────────────────────────────────────────
interface Step {
  id: number
  label: string
  side: 'left' | 'right' | 'center'
  isAustralia?: boolean
  isFinal?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  r: number
  life: number
}

// ─── SVG path definition ─────────────────────────────────────────
// ViewBox: 0 0 400 2800.  Nodes sit on a slow S-curve.
// cx,cy = node centre in SVG coords.
const NODES = [
  { id: 1, cx: 180, cy: 220  },
  { id: 2, cx: 258, cy: 600  },
  { id: 3, cx: 142, cy: 980  },
  { id: 4, cx: 268, cy: 1360 },
  { id: 5, cx: 132, cy: 1740 },
  { id: 6, cx: 268, cy: 2120 },
  { id: 7, cx: 200, cy: 2520 },
]

const STEPS: Step[] = [
  { id: 1, label: 'hey poke',                       side: 'left'   },
  { id: 2, label: 'Australia',                       side: 'right',  isAustralia: true },
  { id: 3, label: 'Airbnb booked',                   side: 'left'   },
  { id: 4, label: 'Comfortable flight booked',       side: 'right'  },
  { id: 5, label: 'Cool spots planned',              side: 'left'   },
  { id: 6, label: 'Restaurant booked',               side: 'right'  },
  { id: 7, label: 'Your Creativity in full control', side: 'center', isFinal: true },
]

// Build a smooth cubic-bezier path through all NODES
function buildPath(): string {
  if (NODES.length === 0) return ''
  let d = `M ${NODES[0].cx} ${NODES[0].cy}`
  for (let i = 0; i < NODES.length - 1; i++) {
    const a = NODES[i]
    const b = NODES[i + 1]
    const dy = (b.cy - a.cy) * 0.45
    // control points: keep x near the node, push y outward
    d += ` C ${a.cx} ${a.cy + dy}, ${b.cx} ${b.cy - dy}, ${b.cx} ${b.cy}`
  }
  return d
}

const PATH_D = buildPath()
const SVG_W = 400
const SVG_H = 2800

// ─── Particle burst helpers ───────────────────────────────────────
function spawnBurst(canvas: HTMLCanvasElement, x: number, y: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const count = 18
  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.2 + Math.random() * 2.8
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      r: 0.8 + Math.random() * 1.4,
      life: 1,
    }
  })

  let raf = 0
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.92
      p.vy *= 0.92
      p.life -= 0.022
      p.alpha = Math.max(0, p.life)
      if (p.life > 0) alive = true
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = '#f0ece4'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (alive) raf = requestAnimationFrame(tick)
    else ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

// ─── Component ────────────────────────────────────────────────────
export default function RoadmapSection() {
  const sectionRef  = useRef<HTMLDivElement>(null)
  const svgRef      = useRef<SVGSVGElement>(null)
  const pathRef     = useRef<SVGPathElement>(null)
  const nodeRefs    = useRef<(HTMLDivElement | null)[]>([])
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const floatRaf    = useRef<number>(0)
  const scrollRaf   = useRef<number>(0)
  const revealedRef = useRef<boolean[]>(new Array(NODES.length).fill(false))

  // ── Float animation ────────────────────────────────────────────
  useEffect(() => {
    // Unique float params per node
    const params = NODES.map((_, i) => ({
      amp:   5 + Math.random() * 3,
      freq:  0.38 + Math.random() * 0.28,
      phase: Math.random() * Math.PI * 2,
      // slight horizontal drift too
      xAmp:  1.5 + Math.random() * 1.5,
      xFreq: 0.22 + Math.random() * 0.18,
      xPhase: Math.random() * Math.PI * 2,
    }))

    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      for (let i = 0; i < nodeRefs.current.length; i++) {
        const el = nodeRefs.current[i]
        if (!el) continue
        const p = params[i]
        const dy = Math.sin(t * p.freq * Math.PI * 2 + p.phase) * p.amp
        const dx = Math.sin(t * p.xFreq * Math.PI * 2 + p.xPhase) * p.xAmp
        el.style.transform = `translate(${dx}px, ${dy}px)`
      }
      floatRaf.current = requestAnimationFrame(tick)
    }
    floatRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(floatRaf.current)
  }, [])

  // ── Scroll-driven path draw & node reveals ─────────────────────
  useEffect(() => {
    const section = sectionRef.current
    const pathEl  = pathRef.current
    if (!section || !pathEl) return

    // wait for path to mount so getTotalLength works
    const totalLength = pathEl.getTotalLength()
    pathEl.style.strokeDasharray  = `${totalLength}`
    pathEl.style.strokeDashoffset = `${totalLength}`

    // For each node, compute the arc-length fraction at which it sits
    // by sampling the path parametrically. We know NODES[i].cy / SVG_H ≈ progress.
    // Use a simple scroll fraction approach.
    const nodeProgressFractions = NODES.map(n => n.cy / SVG_H)

    const onScroll = () => {
      const rect   = section.getBoundingClientRect()
      const sH     = section.offsetHeight
      const viewH  = window.innerHeight
      // progress 0 = top of section at bottom of viewport
      // progress 1 = bottom of section at top of viewport
      const rawProg = (-rect.top) / (sH - viewH)
      const prog = Math.max(0, Math.min(1, rawProg))

      // Path draw: offset decreases as we scroll
      pathEl.style.strokeDashoffset = `${totalLength * (1 - prog)}`

      // Reveal nodes
      for (let i = 0; i < NODES.length; i++) {
        if (revealedRef.current[i]) continue
        if (prog >= nodeProgressFractions[i] * 0.96) {
          revealedRef.current[i] = true
          const el = nodeRefs.current[i]
          if (el) {
            el.classList.add(styles.revealed)
          }
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // run on mount in case already scrolled
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Node click → particle burst ────────────────────────────────
  const handleNodeClick = useCallback((e: React.MouseEvent | React.TouchEvent, nodeEl: HTMLDivElement | null) => {
    const canvas = canvasRef.current
    if (!canvas || !nodeEl) return

    const rect  = nodeEl.getBoundingClientRect()
    const cRect = canvas.getBoundingClientRect()
    const x = rect.left + rect.width / 2  - cRect.left
    const y = rect.top  + rect.height / 2 - cRect.top

    // Scale pulse on the node dot
    const dot = nodeEl.querySelector('[data-dot]') as HTMLElement | null
    if (dot) {
      dot.style.transition = 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)'
      dot.style.transform = 'scale(2.2)'
      setTimeout(() => {
        dot.style.transform = 'scale(1)'
      }, 200)
    }

    spawnBurst(canvas, x, y)
  }, [])

  // ── Canvas resize ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = canvasRef.current?.parentElement?.offsetHeight || window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Compute node CSS position from SVG coords ──────────────────
  // The SVG stretches full-width of the section and full-height.
  // We render nodes as absolutely positioned overlays.
  // pct: fraction of SVG width/height → CSS percent.
  const nodePos = (i: number) => ({
    left: `${(NODES[i].cx / SVG_W) * 100}%`,
    top:  `${(NODES[i].cy / SVG_H) * 100}%`,
  })

  return (
    <section ref={sectionRef} className={styles.section}>
      {/* Full-section particle burst canvas */}
      <canvas ref={canvasRef} className={styles.burstCanvas} aria-hidden="true" />

      {/* SVG path — draws on scroll */}
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path
          ref={pathRef}
          d={PATH_D}
          className={styles.svgPath}
        />
      </svg>

      {/* Checkpoint nodes */}
      {STEPS.map((step, i) => {
        const pos = nodePos(i)
        return (
          <div
            key={step.id}
            ref={el => { nodeRefs.current[i] = el }}
            className={[
              styles.node,
              styles[`side_${step.side}`],
              step.isFinal ? styles.nodeFinal : '',
            ].join(' ')}
            style={{ left: pos.left, top: pos.top }}
            onClick={e => handleNodeClick(e, nodeRefs.current[i])}
            onTouchEnd={e => handleNodeClick(e, nodeRefs.current[i])}
            role="button"
            tabIndex={0}
            aria-label={step.label}
          >
            {/* The glowing dot */}
            <span className={styles.dot} data-dot />

            {/* Label area */}
            <div className={[
              styles.label,
              step.isFinal ? styles.labelFinal : '',
            ].join(' ')}>
              {step.isAustralia ? (
                <>
                  <span className={styles.labelText}>{step.label}</span>
                  <AustraliaOutline className={styles.australiaMap} />
                </>
              ) : (
                <span className={styles.labelText}>{step.label}</span>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
