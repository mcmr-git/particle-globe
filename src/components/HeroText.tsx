'use client'

import { useEffect, useRef } from 'react'
import styles from './HeroText.module.css'

export default function HeroText() {
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lineRef.current
    if (!el) return
    const spans = el.querySelectorAll<HTMLSpanElement>('[data-line]')
    spans.forEach((span, i) => {
      span.style.opacity = '0'
      span.style.transform = 'translateY(18px)'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          span.style.transition = `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s`
          span.style.opacity = '1'
          span.style.transform = 'translateY(0)'
        })
      })
    })
  }, [])

  return (
    <div ref={lineRef} className={styles.hero}>
      <p className={styles.eyebrow} data-line="0">Michele Mauri</p>
      <h1 className={styles.headline}>
        <span className={styles.line} data-line="1">Find the recipe</span>
      </h1>
    </div>
  )
}
