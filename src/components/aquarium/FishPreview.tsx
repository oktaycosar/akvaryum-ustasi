'use client'

// Animated fish preview canvas shared by shop cards and the rename dialog

import { useEffect, useRef } from 'react'
import { drawSpeciesPreview } from '@/lib/game/render'

export default function FishPreview({
  speciesId,
  active,
  width = 132,
  height = 74,
}: {
  speciesId: string
  active: boolean
  width?: number
  height?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let t = Math.random() * 10
    const iv = setInterval(() => {
      t += 0.16
      drawSpeciesPreview(ctx, speciesId, width, height, t)
    }, 140)
    drawSpeciesPreview(ctx, speciesId, width, height, t)
    return () => clearInterval(iv)
  }, [speciesId, active, width, height])

  return <canvas ref={ref} style={{ width, height }} aria-hidden="true" />
}
