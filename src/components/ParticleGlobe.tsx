'use client'

import { useEffect, useRef } from 'react'
import styles from './ParticleGlobe.module.css'

interface Particle {
  x: number
  y: number
  z: number
  ox: number
  oy: number
  oz: number
  vx: number
  vy: number
  vz: number
  size: number
  baseAlpha: number
}

const TWO_PI = Math.PI * 2
const PARTICLE_COUNT = 2200
const GLOBE_RADIUS = 0.36 // fraction of min(w,h)
const REPULSE_RADIUS = 0.14 // fraction of globe radius * viewport min
const REPULSE_STRENGTH = 0.018
const RETURN_STRENGTH = 0.04
const DAMPING = 0.82
const ROTATION_SPEED = 0.0012
const TILT = 0.28 // radians — slight axial tilt

function fibonacci_sphere(n: number): [number, number, number][] {
  const pts: [number, number, number][] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r])
  }
  return pts
}

export default function ParticleGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    angle: 0,
    mouse: { x: -9999, y: -9999 },
    touching: false,
    particles: [] as Particle[],
    raf: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const state = stateRef.current

    // ── resize ──────────────────────────────────────────
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
      buildParticles()
    }

    // ── build particles ─────────────────────────────────
    const buildParticles = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const R = Math.min(W, H) * GLOBE_RADIUS
      const pts = fibonacci_sphere(PARTICLE_COUNT)
      state.particles = pts.map(([px, py, pz]) => ({
        ox: px * R, oy: py * R, oz: pz * R,
        x: px * R, y: py * R, z: pz * R,
        vx: 0, vy: 0, vz: 0,
        // vary size slightly with latitude for texture
        size: 1.15 + Math.abs(py) * 0.6,
        baseAlpha: 0.55 + Math.random() * 0.45,
      }))
    }

    // ── project ─────────────────────────────────────────
    const project = (x: number, y: number, z: number, cx: number, cy: number) => {
      const fov = 900
      const scale = fov / (fov + z)
      return { sx: cx + x * scale, sy: cy + y * scale, scale }
    }

    // ── rotate on Y axis ────────────────────────────────
    const rotY = (x: number, z: number, a: number) => ({
      rx: x * Math.cos(a) - z * Math.sin(a),
      rz: x * Math.sin(a) + z * Math.cos(a),
    })

    // ── rotate on X axis (tilt) ─────────────────────────
    const rotX = (y: number, z: number, a: number) => ({
      ry: y * Math.cos(a) - z * Math.sin(a),
      rz: y * Math.sin(a) + z * Math.cos(a),
    })

    // ── draw ────────────────────────────────────────────
    const draw = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const cx = W / 2
      const cy = H / 2
      const mx = state.mouse.x
      const my = state.mouse.y
      const R = Math.min(W, H) * GLOBE_RADIUS
      const repR = R * REPULSE_RADIUS * 2.2

      ctx.clearRect(0, 0, W, H)
      state.angle += ROTATION_SPEED

      // sort back-to-front for depth
      const sorted = state.particles.slice().sort((a, b) => {
        const az = rotY(a.x, a.z, state.angle).rz
        const bz = rotY(b.x, b.z, state.angle).rz
        return az - bz
      })

      for (const p of sorted) {
        // apply auto-rotation to origin position
        const { rx: ox2, rz: oz2 } = rotY(p.ox, p.oz, state.angle)
        const { ry: oy2, rz: oz3 } = rotX(p.oy, oz2, TILT)

        // repulsion from cursor
        const proj = project(ox2, oy2, oz3, cx, cy)
        const dx = proj.sx - mx
        const dy = proj.sy - my
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < repR) {
          const force = (1 - dist / repR) * REPULSE_STRENGTH
          // push in screen-space, mapped back through projection
          p.vx += (dx / dist) * force * R * 0.5
          p.vy += (dy / dist) * force * R * 0.5
        }

        // spring return to orbit
        p.vx += (0 - p.x) * RETURN_STRENGTH
        p.vy += (0 - p.y) * RETURN_STRENGTH
        p.vz += (0 - p.z) * RETURN_STRENGTH

        // integrate
        p.vx *= DAMPING
        p.vy *= DAMPING
        p.vz *= DAMPING
        p.x += p.vx * 0.016 * 60
        p.y += p.vy * 0.016 * 60
        p.z += p.vz * 0.016 * 60

        // rotated current position
        const { rx, rz: rz1 } = rotY(p.x + ox2 - p.ox, p.z + oz3 - p.oz, 0)
        const finalX = rx + ox2
        const finalY = p.y + oy2 - p.oy + oy2
        const finalZ = rz1 + oz3

        const { sx, sy, scale } = project(ox2 + (p.x - p.ox) * 0.3, oy2 + (p.y - p.oy) * 0.3, oz3, cx, cy)

        // depth-based alpha and size
        const depthT = (oz3 / R + 1) * 0.5 // 0 = back, 1 = front
        const alpha = p.baseAlpha * (0.18 + depthT * 0.82)
        const sz = p.size * scale * (0.55 + depthT * 0.65)

        // proximity glow
        const proximity = Math.max(0, 1 - dist / (repR * 1.8))
        const glowAlpha = alpha + proximity * 0.55

        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(0.3, sz), 0, TWO_PI)

        // pure white — proximity boosts alpha only, no colour shift
        ctx.fillStyle = proximity > 0.05
          ? `rgba(255, 255, 255, ${glowAlpha})`
          : `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      state.raf = requestAnimationFrame(draw)
    }

    // ── pointer events ───────────────────────────────────
    const onMove = (e: MouseEvent) => {
      state.mouse.x = e.clientX
      state.mouse.y = e.clientY
    }
    const onLeave = () => {
      state.mouse.x = -9999
      state.mouse.y = -9999
    }
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        state.mouse.x = e.touches[0].clientX
        state.mouse.y = e.touches[0].clientY
      }
    }
    const onTouchEnd = () => {
      state.mouse.x = -9999
      state.mouse.y = -9999
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    state.raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(state.raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-label="Interactive particle globe"
    />
  )
}
