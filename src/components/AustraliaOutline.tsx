import type { SVGProps } from 'react'

/**
 * Minimalist white SVG outline of Australia.
 * Simplified single-path silhouette, no fill, stroke only.
 * Viewbox based on simplified geographic outline.
 */
export default function AustraliaOutline(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Australia outline"
      {...props}
    >
      {/* Mainland Australia — simplified silhouette path */}
      <path
        d="
          M 68 10
          C 75 8, 90 6, 105 10
          C 122 14, 138 18, 150 24
          C 162 30, 172 40, 178 50
          C 184 60, 186 72, 183 82
          C 180 92, 174 100, 168 108
          C 162 116, 155 122, 148 128
          C 140 135, 133 140, 124 145
          C 115 150, 104 155, 94 158
          C 84 161, 74 162, 65 160
          C 55 158, 47 153, 40 147
          C 33 141, 28 133, 24 124
          C 19 114, 16 103, 14 92
          C 12 80, 12 68, 15 57
          C 18 46, 25 36, 34 28
          C 44 20, 57 13, 68 10
          Z
          M 160 62
          C 166 58, 174 56, 180 60
          C 186 64, 188 72, 186 80
          C 184 88, 178 94, 172 96
          C 166 98, 160 94, 158 88
          C 155 82, 154 68, 160 62
          Z
        "
        stroke="rgba(240, 236, 228, 0.9)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tasmania — small island south */}
      <path
        d="M 118 168 C 122 164, 128 163, 132 166 C 136 169, 136 175, 132 178 C 128 181, 122 180, 118 177 C 114 174, 114 172, 118 168 Z"
        stroke="rgba(240, 236, 228, 0.9)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}
