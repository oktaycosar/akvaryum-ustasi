// Procedural drawing for aquarium decorations, shared by engine and shop previews

import { hexA } from './render'

/** roundRect with fallback for older browsers */
function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

/** Draw a decor item sitting on the ground at (x, baseY). k = pixel scale. */
export function drawDecor(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  baseY: number,
  k: number,
  t: number,
  nightK: number,
) {
  switch (id) {
    case 'moss':
      drawMoss(ctx, x, baseY, k)
      break
    case 'driftwood':
      drawDriftwood(ctx, x, baseY, k)
      break
    case 'anchor':
      drawAnchor(ctx, x, baseY, k)
      break
    case 'coral':
      drawCoral(ctx, x, baseY, k, t)
      break
    case 'airpump':
      drawAirpump(ctx, x, baseY, k)
      break
    case 'lantern':
      drawLantern(ctx, x, baseY, k, t, nightK)
      break
    case 'chest':
      drawChest(ctx, x, baseY, k, t)
      break
  }
}

function drawMoss(ctx: CanvasRenderingContext2D, x: number, baseY: number, k: number) {
  const r = 16 * k
  const cy = baseY - r * 0.75
  const g = ctx.createRadialGradient(x - r * 0.3, cy - r * 0.4, r * 0.2, x, cy, r)
  g.addColorStop(0, '#5da24e')
  g.addColorStop(0.6, '#3c7a38')
  g.addColorStop(1, '#28562a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, cy, r, 0, Math.PI * 2)
  ctx.fill()
  // fuzzy bumps
  ctx.fillStyle = 'rgba(120,190,100,0.5)'
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.72, r * 0.22, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.beginPath()
  ctx.arc(x - r * 0.32, cy - r * 0.4, r * 0.28, 0, Math.PI * 2)
  ctx.fill()
}

function drawDriftwood(ctx: CanvasRenderingContext2D, x: number, baseY: number, k: number) {
  const h = 54 * k
  ctx.save()
  ctx.translate(x, baseY)
  ctx.rotate(-0.08)
  const g = ctx.createLinearGradient(-18 * k, 0, 14 * k, 0)
  g.addColorStop(0, '#4a3624')
  g.addColorStop(0.55, '#6b4e33')
  g.addColorStop(1, '#3d2c1e')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-16 * k, 2)
  ctx.bezierCurveTo(-20 * k, -h * 0.4, 2 * k, -h * 0.55, 8 * k, -h)
  ctx.lineTo(13 * k, -h * 0.98)
  ctx.bezierCurveTo(6 * k, -h * 0.5, 14 * k, -h * 0.3, 18 * k, 2)
  ctx.closePath()
  ctx.fill()
  // branch
  ctx.beginPath()
  ctx.moveTo(2 * k, -h * 0.45)
  ctx.quadraticCurveTo(-16 * k, -h * 0.7, -24 * k, -h * 1.05)
  ctx.lineTo(-20 * k, -h * 1.1)
  ctx.quadraticCurveTo(-10 * k, -h * 0.75, 6 * k, -h * 0.38)
  ctx.closePath()
  ctx.fill()
  // texture lines
  ctx.strokeStyle = 'rgba(30,18,10,0.4)'
  ctx.lineWidth = Math.max(0.6, 1 * k)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(-10 * k + i * 6 * k, -h * 0.1 - i * 3 * k)
    ctx.quadraticCurveTo(-6 * k + i * 6 * k, -h * 0.5, 4 * k + i * 2 * k, -h * 0.85)
    ctx.stroke()
  }
  ctx.restore()
}

function drawAnchor(ctx: CanvasRenderingContext2D, x: number, baseY: number, k: number) {
  const h = 46 * k
  const w = 26 * k
  ctx.save()
  ctx.translate(x, baseY)
  // rope
  ctx.strokeStyle = '#b09a6a'
  ctx.lineWidth = Math.max(1.4, 2.4 * k)
  ctx.beginPath()
  ctx.moveTo(w * 0.55, -h - 14 * k)
  ctx.quadraticCurveTo(w * 0.4, -h * 0.85, 0, -h)
  ctx.stroke()
  // shank
  const g = ctx.createLinearGradient(-6 * k, 0, 6 * k, 0)
  g.addColorStop(0, '#5a6068')
  g.addColorStop(0.5, '#8b939c')
  g.addColorStop(1, '#454b52')
  ctx.fillStyle = g
  ctx.fillRect(-2.6 * k, -h, 5.2 * k, h)
  // ring
  ctx.strokeStyle = '#7d858e'
  ctx.lineWidth = Math.max(1.6, 3 * k)
  ctx.beginPath()
  ctx.arc(0, -h - 4 * k, 4.6 * k, 0, Math.PI * 2)
  ctx.stroke()
  // stock
  ctx.fillRect(-w * 0.5, -h + 4 * k, w, 3.6 * k)
  // crown / flukes
  ctx.beginPath()
  ctx.arc(0, -h * 0.18, w * 0.52, Math.PI * 1.05, Math.PI * 1.95)
  ctx.lineTo(w * 0.5, 0)
  ctx.lineTo(-w * 0.5, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillRect(-2.6 * k, -h, 2 * k, h)
  ctx.restore()
}

function drawCoral(ctx: CanvasRenderingContext2D, x: number, baseY: number, k: number, t: number) {
  ctx.save()
  ctx.translate(x, baseY)
  const branches = [
    { ang: -0.55, len: 34, w: 7 },
    { ang: -0.2, len: 44, w: 8 },
    { ang: 0.15, len: 38, w: 7 },
    { ang: 0.5, len: 26, w: 6 },
  ]
  for (const b of branches) {
    const sway = Math.sin(t * 1.2 + b.ang * 4) * 2 * k
    const ex = Math.sin(b.ang) * b.len * k + sway
    const ey = -Math.cos(b.ang) * b.len * k
    ctx.strokeStyle = '#e77c5f'
    ctx.lineCap = 'round'
    ctx.lineWidth = b.w * k
    ctx.beginPath()
    ctx.moveTo(0, -2 * k)
    ctx.quadraticCurveTo(ex * 0.4 - 4 * k, ey * 0.5, ex, ey)
    ctx.stroke()
    ctx.strokeStyle = '#f2a583'
    ctx.lineWidth = b.w * 0.45 * k
    ctx.beginPath()
    ctx.moveTo(0, -4 * k)
    ctx.quadraticCurveTo(ex * 0.4 - 4 * k, ey * 0.5 + 2 * k, ex, ey)
    ctx.stroke()
    // tip polyp
    ctx.fillStyle = hexA('#ffd9c2', 0.9)
    ctx.beginPath()
    ctx.arc(ex, ey, b.w * 0.4 * k, 0, Math.PI * 2)
    ctx.fill()
  }
  // base rock
  ctx.fillStyle = '#3a3f45'
  ctx.beginPath()
  ctx.ellipse(0, 0, 16 * k, 6 * k, 0, Math.PI, 0)
  ctx.fill()
  ctx.restore()
}

function drawAirpump(ctx: CanvasRenderingContext2D, x: number, baseY: number, k: number) {
  // pump body
  ctx.fillStyle = '#2e343b'
  ctx.beginPath()
  rr(ctx, x - 12 * k, baseY - 16 * k, 24 * k, 14 * k, 3 * k)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath()
  rr(ctx, x - 12 * k, baseY - 16 * k, 24 * k, 5 * k, 3 * k)
  ctx.fill()
  // hose
  ctx.strokeStyle = '#454d56'
  ctx.lineWidth = Math.max(1.6, 2.6 * k)
  ctx.beginPath()
  ctx.moveTo(x + 12 * k, baseY - 10 * k)
  ctx.quadraticCurveTo(x + 30 * k, baseY - 30 * k, x + 34 * k, baseY - 8 * k)
  ctx.stroke()
  // airstone
  ctx.fillStyle = '#7d8590'
  ctx.beginPath()
  rr(ctx, x + 28 * k, baseY - 10 * k, 12 * k, 9 * k, 2 * k)
  ctx.fill()
}

function drawLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  k: number,
  t: number,
  nightK: number,
) {
  const h = 52 * k
  ctx.save()
  ctx.translate(x, baseY)
  // post
  ctx.fillStyle = '#3c3129'
  ctx.fillRect(-2.2 * k, -h, 4.4 * k, h)
  ctx.beginPath()
  ctx.ellipse(0, 0, 8 * k, 3 * k, 0, Math.PI, 0)
  ctx.fill()
  // hanging arm
  ctx.strokeStyle = '#3c3129'
  ctx.lineWidth = 2.6 * k
  ctx.beginPath()
  ctx.moveTo(0, -h)
  ctx.quadraticCurveTo(12 * k, -h - 6 * k, 16 * k, -h + 2 * k)
  ctx.stroke()
  // lamp housing
  const lx = 16 * k
  const ly = -h + 10 * k
  ctx.fillStyle = '#2c2424'
  ctx.beginPath()
  rr(ctx, lx - 7 * k, ly - 9 * k, 14 * k, 18 * k, 3 * k)
  ctx.fill()
  // glass
  const flicker = 0.85 + Math.sin(t * 7) * 0.08 + Math.sin(t * 13.7) * 0.05
  const glow = Math.max(0.25, nightK) * flicker
  const gg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 10 * k)
  gg.addColorStop(0, hexA('#ffe9b0', 0.95 * glow))
  gg.addColorStop(0.6, hexA('#ffc966', 0.6 * glow))
  gg.addColorStop(1, hexA('#ffc966', 0))
  ctx.fillStyle = gg
  ctx.beginPath()
  rr(ctx, lx - 6 * k, ly - 8 * k, 12 * k, 16 * k, 2.5 * k)
  ctx.fill()
  // cap
  ctx.fillStyle = '#4a3c30'
  ctx.beginPath()
  rr(ctx, lx - 8 * k, ly - 12 * k, 16 * k, 4 * k, 2 * k)
  ctx.fill()
  ctx.restore()
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, baseY: number, k: number, t: number) {
  const w = 40 * k
  const h = 26 * k
  ctx.save()
  ctx.translate(x, baseY)
  // glow from inside
  const pulse = 0.6 + Math.sin(t * 2.2) * 0.25
  const gg = ctx.createRadialGradient(0, -h * 0.8, 0, 0, -h * 0.8, w * 0.6)
  gg.addColorStop(0, hexA('#ffd77a', 0.4 * pulse))
  gg.addColorStop(1, hexA('#ffd77a', 0))
  ctx.fillStyle = gg
  ctx.fillRect(-w, -h * 2, w * 2, h * 2)
  // body
  const bg = ctx.createLinearGradient(0, -h, 0, 0)
  bg.addColorStop(0, '#7a5227')
  bg.addColorStop(1, '#4e3318')
  ctx.fillStyle = bg
  ctx.beginPath()
  rr(ctx, -w / 2, -h * 0.62, w, h * 0.62, 3 * k)
  ctx.fill()
  // lid (open, tilted back)
  ctx.save()
  ctx.translate(-w / 2, -h * 0.62)
  ctx.rotate(-0.55)
  const lg = ctx.createLinearGradient(0, -h * 0.4, 0, 0)
  lg.addColorStop(0, '#8a5f2e')
  lg.addColorStop(1, '#5c3c1c')
  ctx.fillStyle = lg
  ctx.beginPath()
  rr(ctx, 0, -h * 0.42, w, h * 0.44, 4 * k)
  ctx.fill()
  ctx.fillStyle = '#d8b446'
  ctx.beginPath()
  rr(ctx, w * 0.1, -h * 0.34, w * 0.8, 3.4 * k, 1.6 * k)
  ctx.fill()
  ctx.restore()
  // metal bands
  ctx.fillStyle = '#d8b446'
  ctx.fillRect(-w / 2 + 4 * k, -h * 0.62, 5 * k, h * 0.62)
  ctx.fillRect(w / 2 - 9 * k, -h * 0.62, 5 * k, h * 0.62)
  ctx.fillRect(-w / 2, -h * 0.34, w, 3 * k)
  // lock
  ctx.fillStyle = '#f0d060'
  ctx.beginPath()
  ctx.arc(0, -h * 0.3, 3.4 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a6a20'
  ctx.beginPath()
  ctx.arc(0, -h * 0.3, 1.6 * k, 0, Math.PI * 2)
  ctx.fill()
  // pearls peeking
  ctx.fillStyle = '#f6eef2'
  ctx.beginPath()
  ctx.arc(-w * 0.12, -h * 0.6, 3.6 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(-w * 0.14, -h * 0.64, 1.2 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Draw a decor preview centered in a small canvas (used by the shop). */
export function drawDecorPreview(
  ctx: CanvasRenderingContext2D,
  id: string,
  w: number,
  h: number,
  t: number,
) {
  ctx.clearRect(0, 0, w, h)
  const k = Math.min(w / 90, h / 80)
  const night = id === 'lantern' ? 0.9 : 0
  drawDecor(ctx, id, w * 0.42, h * 0.86, k, t, night)
}
