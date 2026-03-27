'use client'

import { useEffect, useRef } from 'react'
import styles from './page.module.css'

type Point = { x: number; y: number }

type Shape = 'lightbulb' | 'laptop' | 'planet' | 'dollar'

const SHAPE_NAMES: Shape[] = ['lightbulb', 'laptop', 'planet', 'dollar']
const SWITCH_MS = 4000
const MAX_DPR = 2

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawBulb(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2 - h * 0.02
  ctx.beginPath()
  ctx.ellipse(cx, cy, w * 0.12, h * 0.17, 0, 0, Math.PI * 2)
  ctx.ellipse(cx, cy + h * 0.01, w * 0.165, h * 0.215, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(cx - w * 0.045, cy + h * 0.165, w * 0.09, h * 0.06)
  ctx.fillRect(cx - w * 0.03, cy + h * 0.225, w * 0.06, h * 0.04)
}

function drawLaptop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  roundRect(ctx, cx - w * 0.17, cy - h * 0.12, w * 0.34, h * 0.2, 18)
  ctx.fill()
  ctx.fillRect(cx - w * 0.22, cy + h * 0.12, w * 0.44, h * 0.035)
  ctx.fillRect(cx - w * 0.15, cy + h * 0.15, w * 0.3, h * 0.022)
}

function drawPlanet(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  ctx.beginPath()
  ctx.arc(cx, cy, Math.min(w, h) * 0.17, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.48)
  ctx.beginPath()
  ctx.ellipse(0, 0, w * 0.21, h * 0.075, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDollar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  ctx.font = `900 ${Math.floor(h * 0.48)}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('$', cx, cy)
}

function sampleShape(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Point[] {
  const w = 560
  const h = 340
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return Array.from({ length: 600 }, () => ({ x: 0.5, y: 0.5 }))
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#fff'
  draw(ctx, w, h)
  const data = ctx.getImageData(0, 0, w, h).data
  const points: Point[] = []
  const step = 6
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 18) {
        points.push({ x: x / w, y: y / h })
      }
    }
  }
  return points
}

function buildShapes() {
  return [
    sampleShape(drawBulb),
    sampleShape(drawLaptop),
    sampleShape(drawPlanet),
    sampleShape(drawDollar),
  ]
}

function labelForShape(shape: Shape) {
  switch (shape) {
    case 'lightbulb': return 'light bulb'
    case 'laptop': return 'laptop'
    case 'planet': return 'planet'
    case 'dollar': return 'dollar sign'
  }
}

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number>(0)
  const shapesRef = useRef<Point[][]>([])
  const particlesRef = useRef<Array<{
    x: number
    y: number
    vx: number
    vy: number
    size: number
    seed: number
  }>>([])
  const currentRef = useRef(0)
  const nextRef = useRef(1)
  const mouseRef = useRef({ x: 0.5, y: 0.5, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    const hero = heroRef.current
    if (!canvas || !hero) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = hero.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const shapes = buildShapes()
    shapesRef.current = shapes

    const count = clamp(Math.floor((window.innerWidth * window.innerHeight) / 3000), 480, 980)
    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const start = shapes[0][i % shapes[0].length] ?? { x: 0.5, y: 0.5 }
      return {
        x: start.x,
        y: start.y,
        vx: 0,
        vy: 0,
        size: 0.9 + (i % 7) * 0.16,
        seed: Math.random() * Math.PI * 2,
      }
    })

    let intervalStart = performance.now()
    resize()

    const onMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect()
      mouseRef.current = {
        x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
        active: true,
      }
    }

    const onLeave = () => {
      mouseRef.current.active = false
      mouseRef.current.x = 0.5
      mouseRef.current.y = 0.5
    }

    const onResize = () => resize()

    hero.addEventListener('pointermove', onMove)
    hero.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onResize)

    const tick = (now: number) => {
      if (now - intervalStart >= SWITCH_MS) {
        intervalStart = now
        currentRef.current = (currentRef.current + 1) % SHAPE_NAMES.length
        nextRef.current = (currentRef.current + 1) % SHAPE_NAMES.length
      }

      const progress = easeInOutCubic(clamp((now - intervalStart) / SWITCH_MS, 0, 1))
      const currentShape = shapes[currentRef.current]
      const nextShape = shapes[nextRef.current]
      const shapeLabel = labelForShape(SHAPE_NAMES[currentRef.current])
      void shapeLabel

      const rect = hero.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      ctx.clearRect(0, 0, w, h)

      const scale = Math.min(w * 0.78, h * 0.68) / 500
      const offsetX = (w - 500 * scale) / 2
      const offsetY = (h - 500 * scale) / 2 - h * 0.02
      const mouseX = mouseRef.current.active ? (mouseRef.current.x - 0.5) * 18 : 0
      const mouseY = mouseRef.current.active ? (mouseRef.current.y - 0.5) * 10 : 0

      ctx.fillStyle = '#f6f3ee'
      ctx.shadowColor = 'rgba(255,255,255,0.7)'
      ctx.shadowBlur = 16

      for (let i = 0; i < particlesRef.current.length; i++) {
        const particle = particlesRef.current[i]
        const pointA = currentShape[i % currentShape.length] ?? { x: 0.5, y: 0.5 }
        const pointB = nextShape[i % nextShape.length] ?? { x: 0.5, y: 0.5 }

        const shapeX = pointA.x + (pointB.x - pointA.x) * progress
        const shapeY = pointA.y + (pointB.y - pointA.y) * progress

        const targetX = shapeX * 500 * scale + offsetX + mouseX * (0.16 + pointA.y * 0.25)
        const targetY = shapeY * 500 * scale + offsetY + mouseY * (0.1 + pointA.y * 0.28)

        particle.vx += (targetX - particle.x) * 0.02
        particle.vy += (targetY - particle.y) * 0.02
        particle.vx *= 0.82
        particle.vy *= 0.82
        particle.x += particle.vx
        particle.y += particle.vy

        const pulse = 0.98 + Math.sin(now * 0.0012 + particle.seed) * 0.015
        const size = particle.size * pulse
        ctx.globalAlpha = 0.52 + (i % 11) * 0.01
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      hero.removeEventListener('pointermove', onMove)
      hero.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <main className={styles.page}>
      <section ref={heroRef} className={styles.hero} aria-label="morphic particle animation">
        <div className={styles.canvasWrap} aria-hidden="true">
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.sheen} aria-hidden="true" />
      </section>

      <section className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>portfolio</p>
          <h1 className={styles.name}>Michele Mauri</h1>
        </div>

        <p className={styles.subcopy}>
          Premium technical leadership for teams that need sharper product strategy, stronger architecture,
          and calmer execution.
        </p>

        <div className={styles.block}>
          <p className={styles.sectionLabel}>what i do:</p>
          <ul className={styles.list}>
            <li>Product strategy and roadmap development</li>
            <li>Technical architecture and stack decisions</li>
            <li>Engineering team building and leadership</li>
            <li>Product development lifecycle oversight</li>
            <li>Go-to-market technical planning</li>
            <li>Fractional CTO/COO advisory for early-stage startups</li>
          </ul>
        </div>

        <div className={styles.block}>
          <p className={styles.sectionLabel}>who i work with:</p>
          <ul className={styles.list}>
            <li>Venture-backed startups (Seed to Series B)</li>
            <li>Founding teams building their first technical org</li>
            <li>Companies navigating critical scaling decisions</li>
          </ul>
        </div>

        <div className={styles.footer}>
          <a className={styles.footerLink} href="#download-ios-beta-app">Download iOS beta app</a>
        </div>
      </section>
    </main>
  )
}
