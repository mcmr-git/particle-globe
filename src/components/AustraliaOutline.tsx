import type { SVGProps } from 'react'

/**
 * Minimalist white SVG silhouette of Australia.
 * Stroke-only, no fill. Geographically simplified but recognisable.
 * ViewBox: 0 0 461 500 (approximate relative coordinates)
 */
export default function AustraliaOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 461 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Map outline of Australia"
      role="img"
      {...props}
    >
      {/* Mainland — simplified clockwise coastal path */}
      <path
        stroke="rgba(240,236,228,0.88)"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
        d="
          M 200 18
          C 220 14, 242 12, 262 18
          L 295 28
          C 318 38, 340 50, 358 66
          C 376 82, 388 102, 395 122
          L 406 148
          C 416 170, 420 194, 418 216
          C 416 238, 408 258, 400 276
          L 386 298
          C 374 318, 360 336, 344 352
          C 336 360, 328 368, 318 376
          L 302 390
          C 286 402, 270 412, 252 420
          C 234 428, 214 432, 196 434
          C 178 436, 160 434, 144 428
          C 128 422, 114 412, 102 400
          L 88 386
          C 76 372, 66 356, 58 340
          C 50 324, 46 306, 44 288
          L 40 268
          C 36 248, 34 228, 36 208
          C 38 188, 44 168, 54 150
          L 66 130
          C 76 112, 90 96, 106 82
          C 122 68, 140 58, 158 48
          L 180 36
          Z

          M 338 100
          C 352 94, 368 92, 382 98
          C 396 104, 406 116, 410 130
          C 414 144, 410 160, 402 172
          C 394 184, 380 192, 366 194
          C 352 196, 338 190, 330 180
          C 322 170, 320 156, 322 144
          C 324 132, 330 108, 338 100
          Z
        "
      />
      {/* Tasmania */}
      <path
        stroke="rgba(240,236,228,0.88)"
        strokeWidth="3.5"
        strokeLinejoin="round"
        fill="none"
        d="
          M 218 456
          C 228 450, 242 448, 252 454
          C 262 460, 268 472, 264 482
          C 260 492, 248 498, 236 496
          C 224 494, 214 486, 212 476
          C 210 466, 212 460, 218 456
          Z
        "
      />
    </svg>
  )
}
