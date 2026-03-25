'use client'

import { useEffect, useRef, useCallback } from 'react'
import styles from './RoadmapSection.module.css'
import AustraliaOutline from './AustraliaOutline'
import MagicButton from './MagicButton'

// ─── Data ──────────────────────────────────────────────────────────
interface Step {
  id: number
  label: string
  side: 'left' | 'right' | 'center'
  isAustralia?: boolean
  isFinal?: boolean
}

interface BurstParticle {
  x: number; y: number
  vx: number; vy: number
  r: number; life: number
}

// SVG coordinate space: 400 wide × 2800 tall
const SVG_W = 400
const SVG_H = 2800

const NODES = [
  { cx: 180, cy: 220  },
  { cx: 258, cy: 600  },
  { cx: 142, cy: 980  },
  { cx: 268, cy: 1360 },
  { cx: 132, cy: 1740 },
  { cx: 268, cy: 2120 },
  { cx: 200, cy: 2520 },
] as const

const STEPS: Step[] = [
  { id: 1, label: 'hey poke',                       side: 'left'   },
  { id: 2, label: 'Australia',                       side: 'right',  isAustralia: true },
  { id: 3, label: 'Airbnb booked',                   side: 'left'   },
  { id: 4, label: 'Comfortable flight booked',       side: 'right'  },
  { id: 5, label: 'Cool spots planned',              side: 'left'   },
  { id: 6, label: 'Restaurant booked',               side: 'right'  },
  { id: 7, label: 'Your Creativity in full control', side: 'center', isFinal: true },
]

// ─── Build cubic-bezier path through all nodes ───────────────────
function buildPath(): string {
  let d = `M ${NODES[0].cx} ${NODES[0].cy}`
  for (let i = 0; i < NODES.length - 1; i++) {
    const a = NODES[i]
    const b = NODES[i + 1]
    const dy = (b.cy - a.cy) * 0.44
    d += ` C ${a.cx} ${a.cy + dy}, ${b.cx} ${b.cy - dy}, ${b.cx} ${b.cy}`
  }
  return d
}

const PATH_D = buildPath()

// ─── Canvas particle burst ────────────────────────────────────────
function runBurst(canvas: HTMLCanvasElement, x: number, y: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const particles: BurstParticle[] = Array.from({ length: 20 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.0 + Math.random() * 3.2
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 0.7 + Math.random() * 1.5,
      life: 1,
    }
  })

  let rafId = 0
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let any = false
    for (const p of particles) {
      p.x  += p.vx; p.y  += p.vy
      p.vx *= 0.91; p.vy *= 0.91
      p.life -= 0.02
      if (p.life <= 0) continue
      any = true
      ctx.globalAlpha = p.life * p.life
      ctx.fillStyle   = '#f0ece4'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (any) rafId = requestAnimationFrame(tick)
    else ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  rafId = requestAnimationFrame(tick)
}

// ─── Component ──────────────────────────────────────────────────────
export default function RoadmapSection() {
  const sectionRef   = useRef<HTMLDivElement>(null)
  const pathRef      = useRef<SVGPathElement>(null)
  const nodeRefs     = useRef<(HTMLDivElement | null)[]>([])
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const btnWrapRef   = useRef<HTMLDivElement>(null)
  const floatRafRef  = useRef<number>(0)
  const revealed     = useRef<boolean[]>(new Array(NODES.length).fill(false))
  const btnRevealed  = useRef(false)

  // Precomputed per-node float params
  const floatParams = useRef(
    NODES.map(() => ({
      amp:    5  + Math.random() * 3,
      freq:   0.36 + Math.random() * 0.30,
      phase:  Math.random() * Math.PI * 2,
      xAmp:   1.4 + Math.random() * 1.6,
      xFreq:  0.20 + Math.random() * 0.20,
      xPhase: Math.random() * Math.PI * 2,
    }))
  )

  // ── Float animation (vanilla rAF) ──────────────────────────────
  useEffect(() => {
    const params = floatParams.current
    const t0 = performance.now()

    const tick = (now: number) => {
      const t = (now - t0) * 0.001
      for (let i = 0; i < nodeRefs.current.length; i++) {
        const el = nodeRefs.current[i]
        if (!el) continue
        const p = params[i]
        const dy = Math.sin(t * p.freq  * Math.PI * 2 + p.phase)  * p.amp
        const dx = Math.sin(t * p.xFreq * Math.PI * 2 + p.xPhase) * p.xAmp
        el.style.transform = `translate(${dx}px, ${dy}px)`
      }
      floatRafRef.current = requestAnimationFrame(tick)
    }
    floatRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(floatRafRef.current)
  }, [])

  // ── Scroll → path draw + node reveals + button reveal ──────────
  useEffect(() => {
    const section = sectionRef.current
    const pathEl  = pathRef.current
    if (!section || !pathEl) return

    const totalLength = pathEl.getTotalLength()
    pathEl.style.strokeDasharray  = String(totalLength)
    pathEl.style.strokeDashoffset = String(totalLength)

    const nodeFractions = NODES.map(n => n.cy / SVG_H)
    // Button reveals when scroll reaches ~96% of section
    const BTN_FRACTION  = 0.96

    const onScroll = () => {
      const rect  = section.getBoundingClientRect()
      const sH    = section.offsetHeight
      const viewH = window.innerHeight
      const prog  = Math.max(0, Math.min(1, -rect.top / Math.max(1, sH - viewH)))

      pathEl.style.strokeDashoffset = String(totalLength * (1 - prog))

      // Node reveals
      for (let i = 0; i < NODES.length; i++) {
        if (revealed.current[i]) continue
        if (prog >= nodeFractions[i] * 0.94) {
          revealed.current[i] = true
          nodeRefs.current[i]?.classList.add(styles.revealed)
        }
      }

      // Button reveal
      if (!btnRevealed.current && prog >= BTN_FRACTION) {
        btnRevealed.current = true
        // Find the MagicButton element inside its wrapper and mark it visible
        const btn = btnWrapRef.current?.querySelector('button')
        if (btn) btn.classList.add('visible')
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Resize canvas to match section ───────────────────────────────
  useEffect(() => {
    const canvas  = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w   = section.offsetWidth
      const h   = section.offsetHeight
      canvas.width  = w * dpr
      canvas.height = h * dpr
      canvas.style.width  = w + 'px'
      canvas.style.height = h + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Click / tap → checkpoint burst ─────────────────────────────
  const handleActivate = useCallback(
    (nodeEl: HTMLDivElement | null) => {
      const canvas  = canvasRef.current
      const section = sectionRef.current
      if (!canvas || !nodeEl || !section) return

      const nRect = nodeEl.getBoundingClientRect()
      const sRect = section.getBoundingClientRect()
      const x = nRect.left + nRect.width  / 2 - sRect.left
      const y = nRect.top  + nRect.height / 2 - sRect.top

      const dot = nodeEl.querySelector<HTMLElement>('[data-dot]')
      if (dot) {
        dot.style.transition = 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)'
        dot.style.transform  = 'scale(2.4)'
        setTimeout(() => { dot.style.transform = 'scale(1)' }, 220)
      }

      runBurst(canvas, x, y)
    },
    []
  )

  return (
    <section ref={sectionRef} className={styles.section}>
      {/* Checkpoint burst canvas */}
      <canvas ref={canvasRef} className={styles.burstCanvas} aria-hidden />

      {/* Scroll-drawn path */}
      <svg
        className={styles.svg}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path ref={pathRef} d={PATH_D} className={styles.svgPath} />
      </svg>

      {/* Checkpoint nodes */}
      {STEPS.map((step, i) => (
        <div
          key={step.id}
          ref={el => { nodeRefs.current[i] = el }}
          className={[
            styles.node,
            styles[`side_${step.side}`],
            step.isFinal ? styles.nodeFinal : '',
          ].filter(Boolean).join(' ')}
          style={{
            left: `${(NODES[i].cx / SVG_W) * 100}%`,
            top:  `${(NODES[i].cy / SVG_H) * 100}%`,
          }}
          onClick={() => handleActivate(nodeRefs.current[i])}
          onTouchEnd={e => { e.preventDefault(); handleActivate(nodeRefs.current[i]) }}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleActivate(nodeRefs.current[i]) }}
          aria-label={step.label}
        >
          <span className={styles.dot} data-dot />

          <div className={[
            styles.label,
            step.isFinal ? styles.labelFinal : '',
          ].filter(Boolean).join(' ')}>
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
      ))}

      {/* ── Magic button at the foot of the section ── */}
      <div
        ref={btnWrapRef}
        className={styles.btnAnchor}
        aria-label="begin"
      >
        <MagicButton />
      </div>
    </section>
  )
}
