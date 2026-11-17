// Procedural realistic fish rendering shared by the game engine and shop previews

import { SPECIES, type Species } from './species'

export interface RenderFish {
  speciesId: string
  x: number
  y: number
  heading: number
  size: number
  phase: number
  sick: boolean
  growth: number
  speedFactor: number
  alpha?: number
}

/** deterministic pseudo-random from a seed */
function seeded(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const SHAPE = {
  round: { cx1: 0.34, cy1: 0.62, cx2: 0.04, cy2: 0.56, tailY: 0.14 },
  slim: { cx1: 0.32, cy1: 0.4, cx2: 0.02, cy2: 0.34, tailY: 0.12 },
  tall: { cx1: 0.26, cy1: 0.88, cx2: -0.02, cy2: 0.78, tailY: 0.1 },
  long: { cx1: 0.36, cy1: 0.46, cx2: 0.08, cy2: 0.4, tailY: 0.15 },
} as const

const TAIL = {
  forked: { len: 0.3, spread: 0.6 },
  fan: { len: 0.26, spread: 0.95 },
  round: { len: 0.2, spread: 0.8 },
  long: { len: 0.48, spread: 0.55 },
  double: { len: 0.3, spread: 0.75 },
} as const

function bodyPath(ctx: CanvasRenderingContext2D, L: number, H: number, shape: Species['shape']) {
  const m = SHAPE[shape]
  ctx.beginPath()
  ctx.moveTo(L * 0.5, 0)
  ctx.bezierCurveTo(L * m.cx1, -H * m.cy1, L * m.cx2, -H * m.cy2, -L * 0.42, -H * m.tailY)
  ctx.lineTo(-L * 0.42, H * m.tailY)
  ctx.bezierCurveTo(L * m.cx2, H * m.cy2, L * m.cx1, H * m.cy1, L * 0.5, 0)
  ctx.closePath()
}

function drawTail(ctx: CanvasRenderingContext2D, sp: Species, L: number, H: number, swing: number) {
  const t = TAIL[sp.tail]
  const len = L * t.len
  const spread = H * t.spread
  ctx.save()
  ctx.translate(-L * 0.4, 0)
  ctx.rotate(swing * 0.9)
  const grad = ctx.createLinearGradient(0, 0, -len, 0)
  grad.addColorStop(0, hexA(sp.cTail, 0.92))
  grad.addColorStop(1, hexA(sp.cTail, sp.tail === 'long' || sp.tail === 'double' ? 0.3 : 0.5))
  ctx.fillStyle = grad
  ctx.beginPath()
  if (sp.tail === 'forked') {
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-len * 0.5, -spread * 0.6, -len, -spread)
    ctx.quadraticCurveTo(-len * 0.45, 0, -len, spread)
    ctx.quadraticCurveTo(-len * 0.5, spread * 0.6, 0, 0)
  } else if (sp.tail === 'fan' || sp.tail === 'round') {
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-len * 0.55, -spread * 0.85, -len, -spread * 0.7)
    ctx.quadraticCurveTo(-len * 0.78, 0, -len, spread * 0.7)
    ctx.quadraticCurveTo(-len * 0.55, spread * 0.85, 0, 0)
  } else if (sp.tail === 'double') {
    // two overlapping fans
    ctx.save()
    ctx.rotate(-0.28)
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-len * 0.6, -spread * 0.75, -len, -spread * 0.55)
    ctx.quadraticCurveTo(-len * 0.7, -spread * 0.1, -len * 0.9, spread * 0.5)
    ctx.quadraticCurveTo(-len * 0.5, spread * 0.5, 0, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-len * 0.6, -spread * 0.5, -len * 0.9, -spread * 0.4)
    ctx.quadraticCurveTo(-len * 0.7, spread * 0.15, -len, spread * 0.75)
    ctx.quadraticCurveTo(-len * 0.55, spread * 0.75, 0, 0)
  } else {
    // long veil
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(-len * 0.4, -spread, -len * 0.8, -spread * 0.9, -len, -spread * 0.35)
    ctx.quadraticCurveTo(-len * 0.75, 0, -len, spread * 0.35)
    ctx.bezierCurveTo(-len * 0.8, spread * 0.9, -len * 0.4, spread, 0, 0)
  }
  ctx.closePath()
  ctx.fill()
  // fin rays
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'
  ctx.lineWidth = Math.max(0.6, L * 0.008)
  for (let i = 1; i <= 3; i++) {
    const k = i / 4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-len * 0.92, spread * (k - 0.5) * 1.4)
    ctx.stroke()
  }
  ctx.restore()
}

function drawDorsal(ctx: CanvasRenderingContext2D, sp: Species, L: number, H: number, swing: number) {
  const veil = sp.finStyle === 'veil' || sp.finStyle === 'betta'
  const tallK = sp.shape === 'tall' ? 1.35 : veil ? 1.5 : 1
  const topY = -H * 0.42
  const tipY = -H * (0.85 * tallK)
  ctx.fillStyle = hexA(sp.cFin, sp.finStyle === 'betta' ? 0.9 : 0.82)
  // dorsal
  ctx.beginPath()
  ctx.moveTo(L * 0.16, topY)
  ctx.quadraticCurveTo(L * 0.0, tipY, -L * 0.24, -H * 0.3)
  ctx.quadraticCurveTo(-L * 0.02, -H * 0.26, L * 0.16, topY)
  ctx.closePath()
  ctx.fill()
  // anal fin (below body)
  ctx.beginPath()
  ctx.moveTo(L * 0.12, H * 0.34)
  const analTip = sp.finStyle === 'betta' ? H * 1.25 : sp.shape === 'tall' ? H * 0.95 : H * 0.62
  ctx.quadraticCurveTo(-L * 0.02, analTip, -L * 0.26, H * 0.26)
  ctx.quadraticCurveTo(-L * 0.04, H * 0.24, L * 0.12, H * 0.34)
  ctx.closePath()
  ctx.fill()
  if (sp.finStyle === 'veil' || sp.finStyle === 'betta') {
    // fin ray hints
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = Math.max(0.5, L * 0.006)
    ctx.beginPath()
    ctx.moveTo(L * 0.1, topY + swing * 2)
    ctx.quadraticCurveTo(L * 0.0, tipY * 0.8, -L * 0.2, -H * 0.3)
    ctx.stroke()
  }
}

function drawPectoral(ctx: CanvasRenderingContext2D, sp: Species, L: number, H: number, t: number, phase: number) {
  ctx.save()
  ctx.translate(L * 0.1, H * 0.08)
  ctx.rotate(0.5 + Math.sin(t * 4.2 + phase) * 0.4)
  ctx.fillStyle = hexA(sp.cFin, 0.66)
  ctx.beginPath()
  ctx.ellipse(0, 0, L * 0.1, H * 0.16, 0.5, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawFace(ctx: CanvasRenderingContext2D, sp: Species, L: number, H: number) {
  const ex = L * 0.34
  const ey = -H * 0.16
  const er = H * 0.11 * (sp.eyeScale ?? 1)
  // gill cover
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'
  ctx.lineWidth = Math.max(0.8, L * 0.012)
  ctx.beginPath()
  ctx.moveTo(L * 0.24, -H * 0.24)
  ctx.quadraticCurveTo(L * 0.17, 0, L * 0.23, H * 0.2)
  ctx.stroke()
  // eye
  ctx.fillStyle = 'rgba(235,238,235,0.92)'
  ctx.beginPath()
  ctx.arc(ex, ey, er, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1c1712'
  ctx.beginPath()
  ctx.arc(ex + er * 0.12, ey, er * 0.62, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.arc(ex + er * 0.32, ey - er * 0.3, er * 0.2, 0, Math.PI * 2)
  ctx.fill()
  // mouth
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = Math.max(0.7, L * 0.01)
  ctx.beginPath()
  ctx.moveTo(L * 0.5, H * 0.02)
  ctx.lineTo(L * 0.46, H * 0.07)
  ctx.stroke()
}

function decorate(ctx: CanvasRenderingContext2D, sp: Species, L: number, H: number, sick: boolean) {
  const clipBody = () => {
    bodyPath(ctx, L, H, sp.shape)
    ctx.clip()
  }
  ctx.save()
  clipBody()

  switch (sp.id) {
    case 'goldfish': {
      // scale shimmer
      const g = ctx.createLinearGradient(L * 0.5, 0, -L * 0.4, 0)
      g.addColorStop(0, hexA('#ffffff', 0.16))
      g.addColorStop(0.5, hexA('#ffffff', 0.02))
      ctx.fillStyle = g
      ctx.fillRect(-L * 0.5, -H, L, H * 2)
      // faint scale arcs
      ctx.strokeStyle = 'rgba(120,50,0,0.10)'
      ctx.lineWidth = Math.max(0.5, L * 0.006)
      for (let gx = -L * 0.3; gx < L * 0.4; gx += L * 0.09) {
        ctx.beginPath()
        ctx.arc(gx, 0, L * 0.06, -0.9, 0.9)
        ctx.stroke()
      }
      break
    }
    case 'guppy': {
      // dark back-to-belly fade
      ctx.fillStyle = hexA('#3d4a44', 0.18)
      ctx.fillRect(-L * 0.5, -H * 0.5, L, H * 0.35)
      // subtle body speckles
      ctx.fillStyle = hexA('#2e3532', 0.22)
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(-L * 0.2 + i * L * 0.11, H * 0.02 + (i % 2) * H * 0.08, L * 0.02, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'neonTetra': {
      // electric blue stripe
      ctx.save()
      ctx.shadowColor = 'rgba(64,224,215,0.9)'
      ctx.shadowBlur = L * 0.12
      ctx.strokeStyle = '#40e0d7'
      ctx.lineWidth = Math.max(1.4, L * 0.055)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(L * 0.42, -H * 0.18)
      ctx.lineTo(-L * 0.18, -H * 0.1)
      ctx.stroke()
      ctx.restore()
      // red rear stripe
      ctx.strokeStyle = '#e8443a'
      ctx.lineWidth = Math.max(1.4, L * 0.06)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-L * 0.02, -H * 0.02)
      ctx.quadraticCurveTo(-L * 0.2, H * 0.02, -L * 0.4, -H * 0.02)
      ctx.stroke()
      break
    }
    case 'clownfish': {
      const bars = [L * 0.22, -L * 0.02, -L * 0.3]
      for (const bx of bars) {
        ctx.fillStyle = 'rgba(248,250,246,0.94)'
        ctx.beginPath()
        ctx.ellipse(bx, 0, L * 0.045, H * 0.62, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(15,15,15,0.55)'
        ctx.lineWidth = Math.max(0.7, L * 0.008)
        ctx.stroke()
      }
      break
    }
    case 'angelfish': {
      const bars = [L * 0.3, L * 0.06, -L * 0.18, -L * 0.36]
      for (const bx of bars) {
        ctx.fillStyle = 'rgba(35,32,30,0.78)'
        ctx.beginPath()
        ctx.ellipse(bx, 0, L * 0.035, H * 0.85, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // blue-ish sheen near back
      ctx.fillStyle = hexA('#7fb2a5', 0.14)
      ctx.fillRect(-L * 0.5, -H * 0.5, L, H * 0.3)
      break
    }
    case 'betta': {
      const g = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.5)
      g.addColorStop(0, hexA('#3fae9c', 0.28))
      g.addColorStop(0.4, hexA('#5a2038', 0.05))
      g.addColorStop(1, hexA('#2c4a63', 0.24))
      ctx.fillStyle = g
      ctx.fillRect(-L * 0.5, -H, L, H * 2)
      // scale rows
      ctx.strokeStyle = 'rgba(30,10,10,0.18)'
      ctx.lineWidth = Math.max(0.5, L * 0.006)
      for (let gx = -L * 0.28; gx < L * 0.4; gx += L * 0.1) {
        ctx.beginPath()
        ctx.arc(gx, 0, L * 0.07, -0.8, 0.8)
        ctx.stroke()
      }
      break
    }
    case 'koi': {
      const rnd = seeded(77)
      const cols = ['#e2571e', '#c3271c', '#2a2a2a', '#e2571e']
      for (let i = 0; i < 4; i++) {
        const px = -L * 0.3 + rnd() * L * 0.72
        const py = -H * 0.3 + rnd() * H * 0.6
        ctx.fillStyle = hexA(cols[i], 0.88)
        ctx.beginPath()
        ctx.ellipse(px, py, L * (0.1 + rnd() * 0.1), H * (0.2 + rnd() * 0.22), rnd() * 1.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = hexA('#000000', 0.08)
        ctx.beginPath()
        ctx.ellipse(px, py + H * 0.05, L * (0.1 + rnd() * 0.1), H * (0.2 + rnd() * 0.22), rnd() * 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'discus': {
      ctx.strokeStyle = hexA('#5f7f63', 0.5)
      for (let i = 0; i < 8; i++) {
        const bx = -L * 0.36 + i * L * 0.105
        ctx.lineWidth = Math.max(1, L * 0.02)
        ctx.beginPath()
        ctx.moveTo(bx, -H * 0.55)
        ctx.quadraticCurveTo(bx + L * 0.04, 0, bx, H * 0.55)
        ctx.stroke()
      }
      // turquoise speckles
      const rnd = seeded(31)
      ctx.fillStyle = hexA('#49b8a8', 0.5)
      for (let i = 0; i < 26; i++) {
        ctx.beginPath()
        ctx.arc(-L * 0.4 + rnd() * L * 0.85, -H * 0.45 + rnd() * H * 0.9, L * 0.008, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
  }

  if (sick) {
    ctx.fillStyle = 'rgba(105,110,112,0.55)'
    ctx.fillRect(-L * 0.5, -H, L, H * 2)
  }
  ctx.restore()
}

/** Draw a fish into a 2D context. Fish faces +x when heading is 0. */
export function drawFish(ctx: CanvasRenderingContext2D, f: RenderFish, t: number) {
  const sp = SPECIES[f.speciesId]
  if (!sp) return
  const L = f.size
  const H = L * sp.bodyRatio
  const swim = Math.min(1, f.speedFactor + 0.12)
  const swing = Math.sin(t * (5 + swim * 4.5) + f.phase) * (0.14 + swim * 0.12)

  ctx.save()
  ctx.globalAlpha = f.alpha ?? 1
  ctx.translate(f.x, f.y)
  ctx.rotate(f.heading)
  if (Math.cos(f.heading) < 0) ctx.scale(1, -1)

  drawTail(ctx, sp, L, H, swing)
  drawDorsal(ctx, sp, L, H, swing)

  // body
  bodyPath(ctx, L, H, sp.shape)
  const g = ctx.createLinearGradient(0, -H * 0.62, 0, H * 0.62)
  g.addColorStop(0, sp.cBack)
  g.addColorStop(0.55, sp.cMid)
  g.addColorStop(1, sp.cBelly)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(10,14,16,0.16)'
  ctx.lineWidth = Math.max(0.6, L * 0.008)
  ctx.stroke()

  // top light + belly glow
  bodyPath(ctx, L, H, sp.shape)
  ctx.save()
  ctx.clip()
  const hl = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6)
  hl.addColorStop(0, 'rgba(255,255,255,0.22)')
  hl.addColorStop(0.45, 'rgba(255,255,255,0.03)')
  hl.addColorStop(1, 'rgba(255,240,200,0.10)')
  ctx.fillStyle = hl
  ctx.fillRect(-L * 0.5, -H, L, H * 2)
  ctx.restore()

  decorate(ctx, sp, L, H, f.sick)
  drawFace(ctx, sp, L, H)
  drawPectoral(ctx, sp, L, H, t, f.phase)
  ctx.restore()
}

/** Draw a centered, right-facing fish preview into a small canvas. */
export function drawSpeciesPreview(
  ctx: CanvasRenderingContext2D,
  speciesId: string,
  w: number,
  h: number,
  t: number,
) {
  ctx.clearRect(0, 0, w, h)
  const sp = SPECIES[speciesId]
  if (!sp) return
  const size = Math.min(w * 0.62, h * (0.9 / Math.max(0.42, sp.bodyRatio)))
  drawFish(
    ctx,
    {
      speciesId,
      x: w * 0.54,
      y: h * 0.52,
      heading: 0,
      size,
      phase: speciesId.length * 1.7,
      sick: false,
      growth: 0.5,
      speedFactor: 0.35,
    },
    t,
  )
}
