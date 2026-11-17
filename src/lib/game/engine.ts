// Aquarium simulation engine: fish AI, feeding, economy, levels and scene rendering

import { AudioEngine } from './audio'
import {
  SPECIES,
  getLevelDef,
  speciesUnlockedAt,
  TANK_CAP,
  START_COINS,
  type LevelDef,
  type Species,
} from './species'
import { drawFish, hexA } from './render'
import { drawDecor } from './decor'
import { DECOR_MAP } from './species'
import { FISH_NAMES } from './names'
import type { DayPhase, SaveData, UiSync } from './types'

interface FishEnt {
  id: number
  sp: Species
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  size: number
  growth: number
  hunger: number
  sick: boolean
  phase: number
  wanderT: number
  tx: number
  ty: number
  targetPellet: Pellet | null
  speedFactor: number
  name?: string
}

interface Pellet {
  x: number
  y: number
  vy: number
  phase: number
  resting: number | null
  alpha: number
  claims: number
  eaten: boolean
}

interface BubbleEnt {
  x: number
  y: number
  r: number
  vy: number
  phase: number
}

interface GoldBubble {
  x: number
  y: number
  r: number
  vy: number
  phase: number
}

interface Pearl {
  x: number
  y: number
  vy: number
  phase: number
}

interface ParticleEnt {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

interface Ripple {
  x: number
  y: number
  r: number
  maxR: number
  alpha: number
}

interface Blade {
  bx: number
  by: number
  height: number
  lean: number
  phase: number
  width: number
  c1: string
  c2: string
}

interface BgFish {
  x: number
  y: number
  vx: number
  size: number
}

export interface EngineCallbacks {
  onSync: (s: UiSync) => void
  onToast: (title: string, desc?: string, kind?: 'info' | 'success' | 'warn' | 'reward') => void
  onFishSelect: (f: { id: number; speciesId: string; name?: string; growth: number }) => void
}

const MAX_PELLETS = 16
const FEED_COOLDOWN = 0.55

/** fixed horizontal positions (fractions of tank width) for decor items */
const DECOR_POS: Record<string, number> = {
  airpump: 0.09,
  anchor: 0.19,
  moss: 0.3,
  chest: 0.52,
  driftwood: 0.7,
  coral: 0.86,
  lantern: 0.95,
}

const DAY_STOPS = ['#2a7d7f', '#1c5c62', '#123e46', '#0b2a33']
const NIGHT_STOPS = ['#153f4a', '#0e2f3a', '#0a212b', '#05141c']
const STOP_POS = [0, 0.35, 0.7, 1]

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round((((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t))
  const g = Math.round((((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t))
  const bl = Math.round(((pa & 255) * (1 - t) + (pb & 255) * t))
  return `rgb(${r},${g},${bl})`
}

export class AquariumEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private audio: AudioEngine
  private cb: EngineCallbacks
  private ro: ResizeObserver
  private raf = 0
  private running = false
  /** simulation clock (seconds); public for debugging */
  time = 0
  private last = 0

  private w = 0
  private h = 0
  private waterTop = 0
  private gravelTop = 0
  private unit = 420
  private scaleK = 1

  private fish: FishEnt[] = []
  private pellets: Pellet[] = []
  private bubbles: BubbleEnt[] = []
  private gold: GoldBubble[] = []
  private pearls: Pearl[] = []
  private particles: ParticleEnt[] = []
  private ripples: Ripple[] = []
  private blades: Blade[] = []
  private bgFish: BgFish[] = []
  private gravelCanvas: HTMLCanvasElement | null = null

  coins = START_COINS
  level = 1
  fedTotal = 0
  coinsTotal = 0
  purchases = 0
  private levelStart = { fed: 0, coins: 0, purchases: 0 }
  private feedCd = 0
  private goldTimer = 10
  private bubbleTimer = 0.5
  private syncTimer = 0
  private lastSickToast = -999
  private lastHealToast = -999
  private fishSeq = 1
  private ownedDecor = new Set<string>()
  private pearlTimer = 20
  private pumpTimer = 0
  private usedNames = new Set<string>()

  constructor(canvas: HTMLCanvasElement, audio: AudioEngine, cb: EngineCallbacks) {
    this.canvas = canvas
    const c = canvas.getContext('2d')
    if (!c) throw new Error('Canvas 2D context unavailable')
    this.ctx = c
    this.audio = audio
    this.cb = cb
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
  }

  // ---------------------------------------------------------------- lifecycle

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
    this.ro.disconnect()
  }

  private loop = (now: number) => {
    if (!this.running) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.time += dt
    this.audio.tick()
    this.update(dt)
    this.draw()
    this.syncTimer += dt
    if (this.syncTimer >= 0.25) {
      this.syncTimer = 0
      this.emitSync()
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  // ------------------------------------------------------------------ layout

  private resize() {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width < 10 || rect.height < 10) return
    this.w = rect.width
    this.h = rect.height
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.w * dpr)
    this.canvas.height = Math.round(this.h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.waterTop = this.h * 0.055
    this.gravelTop = this.h * 0.88
    this.unit = Math.max(320, Math.min(this.w, this.h * 1.45))
    this.scaleK = this.unit / 420
    this.buildPlants()
    this.buildGravel()
    this.buildBgFish()
    for (const f of this.fish) {
      f.x = Math.min(Math.max(f.x, f.size * 0.6), this.w - f.size * 0.6)
      f.y = Math.min(Math.max(f.y, this.waterTop + 40), this.gravelTop - 30)
      f.size = this.fishSize(f)
    }
  }

  private fishSize(f: FishEnt): number {
    return f.sp.baseSize * this.unit * (0.78 + 0.5 * f.growth)
  }

  private buildPlants() {
    this.blades = []
    const clusterXs = [this.w * 0.07, this.w * 0.15, this.w * 0.85, this.w * 0.94, this.w * 0.45]
    const palettes: Array<[string, string]> = [
      ['#143327', '#2e6a50'],
      ['#0f2a1f', '#245744'],
      ['#173c2c', '#2e6a50'],
    ]
    clusterXs.forEach((cx, ci) => {
      const n = 5 + Math.floor(Math.random() * 3)
      for (let i = 0; i < n; i++) {
        const height = (50 + Math.random() * 110) * this.scaleK * (ci === 4 ? 0.7 : 1)
        this.blades.push({
          bx: cx + (Math.random() - 0.5) * this.w * 0.06,
          by: this.gravelTop + 4,
          height,
          lean: (Math.random() - 0.5) * height * 0.5,
          phase: Math.random() * Math.PI * 2,
          width: (3 + Math.random() * 4) * this.scaleK,
          c1: palettes[ci % 3][0],
          c2: palettes[ci % 3][1],
        })
      }
    })
  }

  private buildGravel() {
    const gw = Math.max(1, Math.round(this.w))
    const gh = Math.max(1, Math.round(this.h - this.gravelTop + 26))
    const gc = document.createElement('canvas')
    gc.width = gw
    gc.height = gh
    const g = gc.getContext('2d')
    if (!g) return
    const grad = g.createLinearGradient(0, 0, 0, gh)
    grad.addColorStop(0, '#4d4336')
    grad.addColorStop(0.3, '#3c352b')
    grad.addColorStop(1, '#26211a')
    g.fillStyle = grad
    g.fillRect(0, 0, gw, gh)
    // wavy surface
    g.beginPath()
    g.moveTo(0, 0)
    for (let x = 0; x <= gw; x += 12) {
      g.lineTo(x, 6 + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.07) * 2)
    }
    g.lineTo(gw, 0)
    g.closePath()
    g.fillStyle = '#584c3d'
    g.fill()
    // pebbles
    const palette = ['#5c5142', '#6e604d', '#544a3c', '#786a55', '#403930', '#847458', '#37312a']
    const count = Math.round((gw * gh) / 900)
    for (let i = 0; i < count; i++) {
      const x = Math.random() * gw
      const y = 8 + Math.random() * (gh - 10)
      const r = (1.6 + Math.random() * 5) * this.scaleK
      g.fillStyle = palette[Math.floor(Math.random() * palette.length)]
      g.beginPath()
      g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.3), Math.random() * 3, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.08)'
      g.beginPath()
      g.ellipse(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.22, 0, 0, Math.PI * 2)
      g.fill()
    }
    // a few dark rocks
    for (let i = 0; i < 3; i++) {
      const x = gw * (0.12 + Math.random() * 0.76)
      const rw = (30 + Math.random() * 40) * this.scaleK
      const rh = (12 + Math.random() * 14) * this.scaleK
      g.fillStyle = '#2c2620'
      g.beginPath()
      g.ellipse(x, 6, rw, rh, 0, Math.PI, 0)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.07)'
      g.beginPath()
      g.ellipse(x - rw * 0.2, 2, rw * 0.5, rh * 0.35, -0.2, Math.PI, 0)
      g.fill()
    }
    this.gravelCanvas = gc
  }

  private buildBgFish() {
    this.bgFish = []
    for (let i = 0; i < 3; i++) {
      this.bgFish.push({
        x: Math.random() * this.w,
        y: this.waterTop + 60 + Math.random() * (this.gravelTop - this.waterTop - 140),
        vx: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5) * this.scaleK,
        size: (40 + Math.random() * 45) * this.scaleK,
      })
    }
  }

  // ------------------------------------------------------------------- input

  pointerDown(x: number, y: number) {
    // pearls first
    for (let i = this.pearls.length - 1; i >= 0; i--) {
      const p = this.pearls[i]
      if (Math.hypot(p.x - x, p.y - y) <= 16 * this.scaleK + 10) {
        this.pearls.splice(i, 1)
        this.coins += 25
        this.coinsTotal += 25
        this.audio.coin()
        this.sparkle(p.x, p.y, '#f6e8f2')
        this.cb.onToast('İnci buldun!', '+25 altın kazandın.', 'reward')
        this.emitSync()
        this.checkLevel()
        return
      }
    }
    // golden bubble next
    for (let i = this.gold.length - 1; i >= 0; i--) {
      const gb = this.gold[i]
      if (Math.hypot(gb.x - x, gb.y - y) <= gb.r + 12) {
        this.gold.splice(i, 1)
        this.coins += 15
        this.coinsTotal += 15
        this.audio.coin()
        this.sparkle(gb.x, gb.y, '#ffd257')
        this.emitSync()
        this.checkLevel()
        return
      }
    }
    // select a fish to rename
    const hit = this.fishAt(x, y)
    if (hit) {
      this.audio.click()
      this.cb.onFishSelect({ id: hit.id, speciesId: hit.sp.id, name: hit.name, growth: hit.growth })
      return
    }
    if (this.feedCd > 0) return
    if (this.pellets.length >= MAX_PELLETS) return
    const dropY = Math.max(this.waterTop + 6, y)
    this.pellets.push({
      x: Math.min(Math.max(x, 8), this.w - 8),
      y: dropY,
      vy: 6,
      phase: Math.random() * Math.PI * 2,
      resting: null,
      alpha: 1,
      claims: 0,
      eaten: false,
    })
    this.feedCd = FEED_COOLDOWN
    this.ripples.push({ x: x, y: this.waterTop + 4, r: 2, maxR: 26 * this.scaleK, alpha: 0.5 })
    this.audio.plop()
  }

  // -------------------------------------------------------------------- fish

  private fishAt(x: number, y: number): FishEnt | null {
    const sorted = [...this.fish].sort((a, b) => b.size - a.size)
    for (const f of sorted) {
      if (Math.hypot(f.x - x, f.y - y) < Math.max(22 * this.scaleK, f.size * 0.55)) return f
    }
    return null
  }

  private pickName(): string {
    for (let i = 0; i < 20; i++) {
      const n = FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)]
      if (!this.usedNames.has(n)) {
        this.usedNames.add(n)
        return n
      }
    }
    return FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)]
  }

  private addFish(speciesId: string, growth: number, name?: string): FishEnt | null {
    const sp = SPECIES[speciesId]
    if (!sp) return null
    const f: FishEnt = {
      id: this.fishSeq++,
      sp,
      x: this.w * (0.2 + Math.random() * 0.6),
      y: this.waterTop + 50 + Math.random() * (this.gravelTop - this.waterTop - 110),
      vx: 0,
      vy: 0,
      heading: Math.random() < 0.5 ? 0 : Math.PI,
      size: 1,
      growth,
      hunger: 55 + Math.random() * 30,
      sick: false,
      phase: Math.random() * Math.PI * 2,
      wanderT: 0,
      tx: 0,
      ty: 0,
      targetPellet: null,
      speedFactor: 0.3,
      name: name ?? this.pickName(),
    }
    f.size = this.fishSize(f)
    f.tx = f.x
    f.ty = f.y
    this.fish.push(f)
    return f
  }

  private steer(f: FishEnt, tx: number, ty: number, speed: number, dt: number, agility = 1.6) {
    const dx = tx - f.x
    const dy = ty - f.y
    const d = Math.hypot(dx, dy) || 1
    const k = 1 - Math.exp(-dt * agility)
    f.vx += ((dx / d) * speed - f.vx) * k
    f.vy += ((dy / d) * speed - f.vy) * k
  }

  private updateFish(f: FishEnt, dt: number) {
    const sp = f.sp
    const baseSpeed =
      sp.speed *
      this.scaleK *
      (f.sick ? 0.45 : 1) *
      (1 + f.growth * 0.12) *
      this.nightSpeedMul()

    // hunger & sickness
    f.hunger = Math.max(0, f.hunger - sp.hungerRate * this.hungerMul() * dt)
    if (!f.sick && f.hunger <= 4) {
      f.sick = true
      if (this.time - this.lastSickToast > 30) {
        this.lastSickToast = this.time
        this.cb.onToast('Bir balık aç kaldı!', 'Suya yem bırakıp iyileştir.', 'warn')
        this.audio.warn()
      }
    } else if (f.sick && f.hunger > 45) {
      f.sick = false
      if (this.time - this.lastHealToast > 30) {
        this.lastHealToast = this.time
        this.cb.onToast('Balığın iyileşti', 'Düzenli beslemeye devam et.', 'info')
      }
    }

    // find food
    if (f.hunger < 86 && (!f.targetPellet || f.targetPellet.eaten)) {
      let best: Pellet | null = null
      let bestD = Infinity
      for (const p of this.pellets) {
        if (p.eaten || p.claims >= 2) continue
        const d = Math.hypot(p.x - f.x, p.y - f.y)
        if (d < bestD) {
          bestD = d
          best = p
        }
      }
      if (best) {
        best.claims++
        f.targetPellet = best
      }
    }

    if (f.targetPellet && !f.targetPellet.eaten) {
      const p = f.targetPellet
      this.steer(f, p.x, p.y, baseSpeed * 1.9, dt, 2.2)
      if (Math.hypot(p.x - f.x, p.y - f.y) < f.size * 0.45) {
        // eat
        p.eaten = true
        p.claims = Math.max(0, p.claims - 1)
        f.targetPellet = null
        f.hunger = Math.min(100, f.hunger + 26)
        f.growth = Math.min(1, f.growth + 0.008)
        f.size = this.fishSize(f)
        this.fedTotal++
        if (!f.sick) {
          this.coins += sp.coinPerEat
          this.coinsTotal += sp.coinPerEat
        }
        this.audio.eat()
        this.crumbs(f.x + Math.cos(f.heading) * f.size * 0.4, f.y, sp.cMid)
        this.ripples.push({
          x: f.x,
          y: f.y,
          r: 3,
          maxR: f.size * 0.9,
          alpha: 0.28,
        })
        this.checkLevel()
      }
    } else {
      // wander
      f.wanderT -= dt
      const nearTarget = Math.hypot(f.tx - f.x, f.ty - f.y) < 26
      if (f.wanderT <= 0 || nearTarget) {
        f.wanderT = 2.5 + Math.random() * 3.5
        if (Math.random() < 0.22) {
          // idle drift
          f.tx = f.x
          f.ty = f.y
        } else if (this.nightK() > 0.6) {
          // at night fish prefer the lower half of the tank
          f.tx = this.w * (0.08 + Math.random() * 0.84)
          f.ty =
            this.waterTop +
            (this.gravelTop - this.waterTop) * 0.55 +
            Math.random() * (this.gravelTop - this.waterTop) * 0.3
        } else {
          f.tx = this.w * (0.08 + Math.random() * 0.84)
          f.ty = this.waterTop + 40 + Math.random() * (this.gravelTop - this.waterTop - 90)
        }
      }
      this.steer(f, f.tx, f.ty, baseSpeed, dt, 1.1)
      f.vy += Math.sin(this.time * 1.4 + f.phase) * 3 * dt
    }

    // bounds (soft)
    const m = f.size * 0.5 + 8
    if (f.x < m) f.vx += (m - f.x) * 4 * dt
    if (f.x > this.w - m) f.vx -= (f.x - (this.w - m)) * 4 * dt
    const top = this.waterTop + 26
    const bot = this.gravelTop - f.size * 0.3 - 6
    if (f.y < top) f.vy += (top - f.y) * 4 * dt
    if (f.y > bot) f.vy -= (f.y - bot) * 4 * dt

    f.x += f.vx * dt
    f.y += f.vy * dt

    // heading
    const spd = Math.hypot(f.vx, f.vy)
    if (spd > 3) {
      const desired = Math.atan2(f.vy, f.vx)
      let diff = desired - f.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      f.heading += diff * (1 - Math.exp(-dt * 3.5))
    }
    const targetSf = Math.min(1, spd / (sp.speed * 1.7 * this.scaleK))
    f.speedFactor += (targetSf - f.speedFactor) * Math.min(1, dt * 3)

    // mouth bubble
    if (Math.random() < dt * 0.1 && f.hunger < 95) {
      this.bubbles.push({
        x: f.x + Math.cos(f.heading) * f.size * 0.42,
        y: f.y + Math.sin(f.heading) * f.size * 0.15,
        r: (1 + Math.random() * 1.6) * this.scaleK,
        vy: -(14 + Math.random() * 10) * this.scaleK,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  // ------------------------------------------------------------------ updates

  private update(dt: number) {
    this.feedCd = Math.max(0, this.feedCd - dt)

    for (const f of this.fish) this.updateFish(f, dt)

    // pellets
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const p = this.pellets[i]
      if (p.resting === null) {
        p.vy = Math.min(24 * this.scaleK, p.vy + 26 * dt)
        p.y += p.vy * dt
        p.x += Math.sin(this.time * 2.4 + p.phase) * 7 * dt
        if (p.y >= this.gravelTop - 3) {
          p.y = this.gravelTop - 3
          p.resting = 0
        }
      } else {
        p.resting += dt
        if (p.resting > 8) {
          p.alpha -= dt * 1.6
          if (p.alpha <= 0) {
            this.pellets.splice(i, 1)
            continue
          }
        }
      }
      if (p.eaten) this.pellets.splice(i, 1)
    }

    // ambient bubbles
    this.bubbleTimer -= dt
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.4 + Math.random() * 0.9
      const x = Math.random() * this.w
      this.bubbles.push({
        x,
        y: this.gravelTop - 4,
        r: (1.2 + Math.random() * 2.6) * this.scaleK,
        vy: -(12 + Math.random() * 20) * this.scaleK,
        phase: Math.random() * Math.PI * 2,
      })
    }
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      b.y += b.vy * dt
      b.x += Math.sin(this.time * 3 + b.phase) * 9 * dt
      if (b.y <= this.waterTop + 5) {
        if (Math.random() < 0.06) this.audio.bubble()
        this.bubbles.splice(i, 1)
      }
    }

    // golden bubbles
    this.goldTimer -= dt
    if (this.goldTimer <= 0) {
      this.goldTimer =
        (16 + Math.random() * 12) * (this.ownedDecor.has('airpump') ? 0.75 : 1)
      if (this.gold.length < 2) {
        this.gold.push({
          x: this.w * (0.15 + Math.random() * 0.7),
          y: this.gravelTop - 20,
          r: 15 * this.scaleK,
          vy: -20 * this.scaleK,
          phase: Math.random() * Math.PI * 2,
        })
        this.cb.onToast('Altın kabarcık!', 'Yakalamak için üzerine dokun.', 'reward')
      }
    }
    for (let i = this.gold.length - 1; i >= 0; i--) {
      const gb = this.gold[i]
      gb.y += gb.vy * dt
      gb.x += Math.sin(this.time * 2.2 + gb.phase) * 14 * dt
      if (gb.y <= this.waterTop + 14) this.gold.splice(i, 1)
    }

    // chest pearls
    if (this.ownedDecor.has('chest')) {
      this.pearlTimer -= dt
      if (this.pearlTimer <= 0) {
        this.pearlTimer = 25 + Math.random() * 15
        this.pearls.push({
          x: this.w * DECOR_POS.chest,
          y: this.gravelTop - 26,
          vy: -16 * this.scaleK,
          phase: Math.random() * Math.PI * 2,
        })
        this.audio.bubble()
      }
    }
    for (let i = this.pearls.length - 1; i >= 0; i--) {
      const p = this.pearls[i]
      p.y += p.vy * dt
      p.x += Math.sin(this.time * 2 + p.phase) * 10 * dt
      if (p.y <= this.waterTop + 12) this.pearls.splice(i, 1)
    }

    // air pump stream
    if (this.ownedDecor.has('airpump')) {
      this.pumpTimer -= dt
      if (this.pumpTimer <= 0) {
        this.pumpTimer = 0.14
        this.bubbles.push({
          x: this.w * DECOR_POS.airpump + 34 * this.scaleK,
          y: this.gravelTop - 8 * this.scaleK,
          r: (1 + Math.random() * 2.2) * this.scaleK,
          vy: -(18 + Math.random() * 14) * this.scaleK,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.vy += 20 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }

    // ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]
      r.r += (r.maxR - r.r) * Math.min(1, dt * 3)
      r.alpha -= dt * 0.9
      if (r.alpha <= 0) this.ripples.splice(i, 1)
    }

    // bg fish drift
    for (const bf of this.bgFish) {
      bf.x += bf.vx * dt
      if (bf.x < -bf.size) bf.x = this.w + bf.size
      if (bf.x > this.w + bf.size) bf.x = -bf.size
    }
  }

  private crumbs(x: number, y: number, color: string) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30 - 10,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: (1.4 + Math.random() * 1.8) * this.scaleK,
        color: Math.random() < 0.5 ? color : '#b98a4a',
      })
    }
  }

  private sparkle(x: number, y: number, color: string) {
    for (let i = 0; i < 9; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 70,
        vy: (Math.random() - 0.5) * 70,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: (1.6 + Math.random() * 2.2) * this.scaleK,
        color,
      })
    }
  }

  // ------------------------------------------------------------------ levels

  private distinctSpecies(): number {
    return new Set(this.fish.map((f) => f.sp.id)).size
  }

  private objectiveValue(def: LevelDef): number {
    switch (def.target.type) {
      case 'feed':
        return this.fedTotal - this.levelStart.fed
      case 'coins':
        return this.coinsTotal - this.levelStart.coins
      case 'buy':
        return this.purchases - this.levelStart.purchases
      case 'fishCount':
        return this.fish.length
      case 'species':
        return this.distinctSpecies()
    }
  }

  private checkLevel() {
    let guard = 0
    while (guard++ < 6) {
      const def = getLevelDef(this.level)
      if (this.objectiveValue(def) < def.target.count) break
      this.coins += def.reward
      this.audio.levelUp()
      const next = this.level + 1
      const unlocked = speciesUnlockedAt(next)
      this.cb.onToast(
        `Seviye ${this.level} tamamlandı: ${def.title}`,
        `+${def.reward} altın ödül kazandın`,
        'reward',
      )
      this.level = next
      this.levelStart = { fed: this.fedTotal, coins: this.coinsTotal, purchases: this.purchases }
      if (unlocked.length > 0) {
        this.cb.onToast('Yeni balık türü açıldı!', unlocked.map((u) => u.name).join(', '), 'success')
      }
      this.emitSync()
    }
  }

  // -------------------------------------------------------------------- shop

  private decorCount(): number {
    return this.ownedDecor.size
  }

  /** decorative items make fish get hungry slightly slower (max -8%) */
  private hungerMul(): number {
    return 1 - Math.min(0.08, this.decorCount() * 0.02)
  }

  /** fish swim slower at night */
  private nightSpeedMul(): number {
    return 1 - this.nightK() * 0.5
  }

  /** 0 = full day, 1 = deep night; full cycle lasts 240s */
  nightK(): number {
    const c = (this.time % 240) / 240
    if (c < 0.42) return 0
    if (c < 0.5) {
      const k = (c - 0.42) / 0.08
      return k * k * (3 - 2 * k)
    }
    if (c < 0.92) return 1
    const k = (c - 0.92) / 0.08
    return 1 - k * k * (3 - 2 * k)
  }

  dayPhase(): DayPhase {
    const c = (this.time % 240) / 240
    if (c < 0.42) return 'day'
    if (c < 0.5) return 'sunset'
    if (c < 0.92) return 'night'
    return 'dawn'
  }

  buyDecor(decorId: string): boolean {
    const item = DECOR_MAP[decorId]
    if (!item) return false
    if (this.ownedDecor.has(decorId)) return false
    if (this.level < item.unlockLevel) {
      this.cb.onToast('Henüz açılmadı', `${item.name} için Seviye ${item.unlockLevel} gerekiyor.`, 'warn')
      return false
    }
    if (this.coins < item.price) {
      this.cb.onToast('Altın yetersiz', `${item.name} için ${item.price} altın gerekiyor.`, 'warn')
      return false
    }
    this.coins -= item.price
    this.ownedDecor.add(decorId)
    this.audio.buy()
    this.cb.onToast(`${item.name} akvaryuma yerleştirildi`, item.effect, 'success')
    this.emitSync()
    this.checkLevel()
    return true
  }

  renameFish(fishId: number, name: string): boolean {
    const f = this.fish.find((x) => x.id === fishId)
    if (!f) return false
    const clean = name.trim().slice(0, 16)
    if (f.name) this.usedNames.delete(f.name)
    if (clean.length > 0) {
      f.name = clean
      this.usedNames.add(clean)
    } else {
      f.name = this.pickName()
    }
    return true
  }

  buyFish(speciesId: string): boolean {
    const sp = SPECIES[speciesId]
    if (!sp) return false
    if (this.level < sp.unlockLevel) {
      this.cb.onToast('Henüz açılmadı', `${sp.name} için Seviye ${sp.unlockLevel} gerekiyor.`, 'warn')
      return false
    }
    if (this.fish.length >= TANK_CAP) {
      this.cb.onToast('Akvaryum dolu', `Aynı anda en fazla ${TANK_CAP} balık besleyebilirsin.`, 'warn')
      return false
    }
    if (this.coins < sp.price) {
      this.cb.onToast('Altın yetersiz', `${sp.name} için ${sp.price} altın gerekiyor.`, 'warn')
      return false
    }
    this.coins -= sp.price
    this.purchases++
    this.addFish(speciesId, 0.15)
    this.audio.buy()
    this.cb.onToast(`${sp.name} akvaryuma eklendi`, 'Yeni dostuna hoş geldin demeyi unutma.', 'success')
    this.emitSync()
    this.checkLevel()
    return true
  }

  // -------------------------------------------------------------------- sync

  private emitSync() {
    const def = getLevelDef(this.level)
    const sickCount = this.fish.filter((f) => f.sick).length
    this.cb.onSync({
      coins: Math.floor(this.coins),
      level: this.level,
      levelTitle: def.title,
      levelDesc: def.desc,
      objType: def.target.type,
      objCurrent: Math.floor(this.objectiveValue(def)),
      objTarget: def.target.count,
      fishCount: this.fish.length,
      sickCount,
      tankCap: TANK_CAP,
      fedTotal: this.fedTotal,
      coinsTotal: Math.floor(this.coinsTotal),
      purchases: this.purchases,
      dayPhase: this.dayPhase(),
    })
  }

  getSaveData(): SaveData {
    return {
      coins: Math.floor(this.coins),
      level: this.level,
      fedTotal: this.fedTotal,
      coinsTotal: Math.floor(this.coinsTotal),
      purchases: this.purchases,
      fish: this.fish.map((f) => ({
        species: f.sp.id,
        growth: Math.round(f.growth * 1000) / 1000,
        name: f.name,
      })),
      decor: [...this.ownedDecor],
      soundOn: this.audio.enabled,
    }
  }

  loadSave(data: SaveData) {
    this.coins = data.coins
    this.level = data.level
    this.fedTotal = data.fedTotal
    this.coinsTotal = data.coinsTotal
    this.purchases = data.purchases
    this.levelStart = { fed: data.fedTotal, coins: data.coinsTotal, purchases: data.purchases }
    this.ownedDecor = new Set((data.decor ?? []).filter((d) => DECOR_MAP[d]))
    for (const sf of data.fish) {
      if (SPECIES[sf.species]) {
        const f = this.addFish(sf.species, Math.min(1, Math.max(0, sf.growth)), sf.name)
        if (f?.name) this.usedNames.add(f.name)
      }
    }
    if (this.fish.length === 0) {
      this.addFish('goldfish', 0.1)
      this.addFish('goldfish', 0.05)
    }
    this.emitSync()
  }

  // -------------------------------------------------------------------- draw

  private draw() {
    const ctx = this.ctx
    const { w, h, waterTop, gravelTop } = this

    // water body (mixes toward night palette)
    const nk = this.nightK()
    const wg = ctx.createLinearGradient(0, waterTop, 0, h)
    for (let i = 0; i < 4; i++) {
      wg.addColorStop(STOP_POS[i], mixHex(DAY_STOPS[i], NIGHT_STOPS[i], nk))
    }
    ctx.fillStyle = wg
    ctx.fillRect(0, 0, w, h)

    // air gap above waterline
    ctx.fillStyle = mixHex('#10222c', '#050d14', nk)
    ctx.fillRect(0, 0, w, waterTop)

    // background silhouettes
    for (const bf of this.bgFish) {
      const dir = bf.vx >= 0 ? 1 : -1
      ctx.save()
      ctx.translate(bf.x, bf.y)
      ctx.scale(dir, 1)
      ctx.fillStyle = 'rgba(5,18,24,0.14)'
      ctx.beginPath()
      ctx.ellipse(0, 0, bf.size * 0.5, bf.size * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-bf.size * 0.42, 0)
      ctx.lineTo(-bf.size * 0.62, -bf.size * 0.12)
      ctx.lineTo(-bf.size * 0.62, bf.size * 0.12)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // light rays (dim & cool at night)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const rayAlpha = 0.1 * (1 - nk * 0.75)
    for (let i = 0; i < 4; i++) {
      const sx = w * (0.1 + i * 0.24) + Math.sin(this.time * 0.13 + i * 2.1) * 42 * this.scaleK
      const sway = Math.sin(this.time * 0.09 + i) * 30 * this.scaleK
      const bottom = gravelTop * 0.85
      const grad = ctx.createLinearGradient(0, waterTop, 0, bottom)
      const cr = Math.round(210 - 60 * nk)
      const cg = Math.round(240 - 50 * nk)
      const cb = Math.round(230 + 10 * nk)
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${rayAlpha.toFixed(3)})`)
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(sx - 26 * this.scaleK, waterTop)
      ctx.lineTo(sx + 26 * this.scaleK, waterTop)
      ctx.lineTo(sx + 90 * this.scaleK + sway, bottom)
      ctx.lineTo(sx + 10 * this.scaleK + sway, bottom)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()

    // plants behind fish
    for (const b of this.blades) {
      const sway = Math.sin(this.time * 0.8 + b.phase) * b.height * 0.09
      const grad = ctx.createLinearGradient(0, b.by, 0, b.by - b.height)
      grad.addColorStop(0, b.c1)
      grad.addColorStop(1, b.c2)
      ctx.fillStyle = grad
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(b.bx - b.width, b.by)
      ctx.quadraticCurveTo(b.bx + b.lean * 0.4 + sway * 0.6, b.by - b.height * 0.55, b.bx + b.lean + sway, b.by - b.height)
      ctx.quadraticCurveTo(b.bx + b.lean * 0.4 + sway * 0.6 + b.width, b.by - b.height * 0.55, b.bx + b.width, b.by)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // gravel
    if (this.gravelCanvas) {
      ctx.drawImage(this.gravelCanvas, 0, gravelTop - 20)
    }

    // caustics on gravel
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const causticAlpha = 0.07 * (1 - nk * 0.75)
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.2 + 0.3 * i) + Math.sin(this.time * 0.5 + i * 1.7) * w * 0.1
      const cy = gravelTop + (h - gravelTop) * 0.4
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.16)
      rg.addColorStop(0, `rgba(180,230,215,${causticAlpha.toFixed(3)})`)
      rg.addColorStop(1, 'rgba(180,230,215,0)')
      ctx.fillStyle = rg
      ctx.fillRect(0, gravelTop - 10, w, h - gravelTop + 10)
    }
    ctx.restore()

    // grass tufts on gravel
    ctx.strokeStyle = 'rgba(24,64,46,0.8)'
    ctx.lineWidth = 2 * this.scaleK
    for (let i = 0; i < 9; i++) {
      const gx = (i / 9) * w + Math.sin(i * 7.3) * 20
      const gh = (10 + ((i * 13) % 12)) * this.scaleK
      ctx.beginPath()
      ctx.moveTo(gx, gravelTop + 6)
      ctx.quadraticCurveTo(gx + 3, gravelTop + 6 - gh * 0.6, gx + Math.sin(this.time * 0.9 + i) * 4 + 6, gravelTop + 6 - gh)
      ctx.stroke()
    }

    // decor items sitting on the gravel
    for (const id of this.ownedDecor) {
      const px = DECOR_POS[id]
      if (px === undefined) continue
      drawDecor(ctx, id, w * px, gravelTop + 8, this.scaleK, this.time, nk)
    }

    // ripples
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(220,245,240,${Math.max(0, r.alpha)})`
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.32, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // pellets
    for (const p of this.pellets) {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = '#8a5a2b'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3.2 * this.scaleK, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(220,170,90,0.7)'
      ctx.beginPath()
      ctx.arc(p.x - 1, p.y - 1, 1.1 * this.scaleK, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // fish (small first so big ones are in front)
    const sorted = [...this.fish].sort((a, b) => a.size - b.size)
    for (const f of sorted) {
      drawFish(
        ctx,
        {
          speciesId: f.sp.id,
          x: f.x,
          y: f.y,
          heading: f.heading,
          size: f.size,
          phase: f.phase,
          sick: f.sick,
          growth: f.growth,
          speedFactor: f.speedFactor,
        },
        this.time,
      )
    }

    // fish name labels
    ctx.textAlign = 'center'
    ctx.font = `600 ${Math.max(9, Math.round(11 * this.scaleK))}px ui-sans-serif, system-ui, sans-serif`
    for (const f of this.fish) {
      if (!f.name) continue
      const ly = f.y - f.size * 0.5 - 10 * this.scaleK
      ctx.lineWidth = 3 * this.scaleK
      ctx.strokeStyle = 'rgba(4,16,22,0.6)'
      ctx.strokeText(f.name, f.x, ly)
      ctx.fillStyle = 'rgba(236,250,246,0.92)'
      ctx.fillText(f.name, f.x, ly)
    }

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // bubbles
    for (const b of this.bubbles) {
      ctx.strokeStyle = 'rgba(215,245,240,0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(220,250,245,0.18)'
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }

    // golden bubbles
    for (const gb of this.gold) {
      const pulse = 1 + Math.sin(this.time * 4 + gb.phase) * 0.08
      const r = gb.r * pulse
      const rg = ctx.createRadialGradient(gb.x, gb.y, 0, gb.x, gb.y, r * 1.8)
      rg.addColorStop(0, 'rgba(255,215,90,0.85)')
      rg.addColorStop(0.55, 'rgba(255,190,60,0.45)')
      rg.addColorStop(1, 'rgba(255,190,60,0)')
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(gb.x, gb.y, r * 1.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,235,170,0.9)'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.arc(gb.x, gb.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(gb.x - r * 0.35, gb.y - r * 0.35, r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }

    // chest pearls
    for (const p of this.pearls) {
      const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26 * this.scaleK)
      rg.addColorStop(0, 'rgba(250,240,248,0.75)')
      rg.addColorStop(0.5, 'rgba(235,205,230,0.35)')
      rg.addColorStop(1, 'rgba(235,205,230,0)')
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(p.x, p.y, 26 * this.scaleK, 0, Math.PI * 2)
      ctx.fill()
      const pr = 7 * this.scaleK
      const pg = ctx.createRadialGradient(p.x - pr * 0.35, p.y - pr * 0.35, 0, p.x, p.y, pr)
      pg.addColorStop(0, '#ffffff')
      pg.addColorStop(0.55, '#f2dfe9')
      pg.addColorStop(1, '#c9a8bd')
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2)
      ctx.fill()
    }

    // waterline
    const band = ctx.createLinearGradient(0, waterTop - 2, 0, waterTop + 9 * this.scaleK)
    band.addColorStop(0, 'rgba(235,250,245,0.20)')
    band.addColorStop(1, 'rgba(235,250,245,0)')
    ctx.fillStyle = band
    ctx.fillRect(0, waterTop - 2, w, 11 * this.scaleK)
    ctx.strokeStyle = `rgba(215,245,240,${0.2 + Math.sin(this.time * 1.3) * 0.05})`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) {
      const y = waterTop + 3 + Math.sin(x * 0.02 + this.time * 2) * 1.4
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // glass streaks
    for (let i = 0; i < 3; i++) {
      const gx = w * (0.28 + i * 0.22) + Math.sin(this.time * 0.05 + i * 2) * 8
      const sg = ctx.createLinearGradient(0, waterTop, 0, h)
      sg.addColorStop(0, `rgba(225,248,242,${(0.05 * (1 - nk * 0.6)).toFixed(3)})`)
      sg.addColorStop(1, 'rgba(225,248,242,0)')
      ctx.fillStyle = sg
      ctx.fillRect(gx, waterTop, 16 * this.scaleK, h - waterTop)
    }

    // night dimming + lantern glow
    if (nk > 0.01) {
      const lantern = this.ownedDecor.has('lantern')
      ctx.fillStyle = `rgba(3,10,18,${(nk * 0.34 * (lantern ? 0.45 : 1)).toFixed(3)})`
      ctx.fillRect(0, 0, w, h)
      if (lantern && nk > 0.15) {
        const lx = w * DECOR_POS.lantern + 16 * this.scaleK
        const ly = gravelTop - 34 * this.scaleK
        const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, 160 * this.scaleK)
        halo.addColorStop(0, `rgba(255,200,120,${(nk * 0.20).toFixed(3)})`)
        halo.addColorStop(1, 'rgba(255,200,120,0)')
        ctx.fillStyle = halo
        ctx.fillRect(0, 0, w, h)
      }
    }

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.78)
    vg.addColorStop(0, 'rgba(2,10,14,0)')
    vg.addColorStop(1, 'rgba(2,10,14,0.4)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)

    // sick fish warning tint on hungry fish (small indicator dot)
    for (const f of this.fish) {
      if (f.sick) {
        const hx = f.x + Math.cos(f.heading) * f.size * 0.5
        const hy = f.y - f.size * 0.55 - 6
        ctx.fillStyle = hexA('#e05a4a', 0.85)
        ctx.beginPath()
        ctx.arc(hx, hy, 3.4 * this.scaleK, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}
