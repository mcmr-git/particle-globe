# Particle Globe

An interactive, hyper-refined particle globe built with Next.js and vanilla Canvas 2D. 2,200 fibonacci-distributed particles form a perfect sphere that reacts to cursor and touch with a physics-based repulsion field.

## Features

- 2,200 fibonacci-sphere particles rendered in Canvas 2D
- Physics repulsion — particles scatter on cursor / touch approach and spring back
- Depth-sorted rendering with perspective projection for volumetric feel
- Warm ivory glow near cursor, cool blue-white base tone
- Exposure variable font for premium typography
- Staggered hero text reveal on load
- Fully responsive (mobile touch supported)

## Stack

- Next.js 14 (App Router)
- TypeScript
- CSS Modules
- Zero runtime dependencies beyond Next.js

## Getting Started

```bash
npm install
npm run dev
```

## Font

The Exposure variable font (`Exposure-205TF-VAR.woff2`) must be placed in `public/fonts/`. If you don't have the file, the design falls back to Georgia gracefully.

## Deployment

Deploy to Vercel in one click or via CLI:

```bash
npx vercel --prod
```
