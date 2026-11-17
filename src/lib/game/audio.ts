// Procedural Web Audio engine: underwater ambience, gentle music and SFX.
// Robust against tab throttling and context suspension (auto-resume + drift clamp).

const PENTA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25]

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private sfxBus: GainNode | null = null
  private musicBus: GainNode | null = null
  private ambBus: GainNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private droneOsc: OscillatorNode | null = null
  private fallbackTimer: ReturnType<typeof setInterval> | null = null
  private nextNoteTime = 0
  private melodyIdx = 2
  private melodyCount = 0
  private lastResumeTry = 0
  private onStateChange: (() => void) | null = null
  enabled = true
  private started = false

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.started) {
      this.resumeIfSuspended()
      return
    }
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    const ctx = this.ctx

    this.master = ctx.createGain()
    this.master.gain.value = this.enabled ? 1 : 0
    this.master.connect(ctx.destination)

    // gentle space via feedback delay on music
    const delay = ctx.createDelay(1.2)
    delay.delayTime.value = 0.42
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    delay.connect(fb)
    fb.connect(delay)

    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 0.9
    this.sfxBus.connect(this.master)

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0.5
    const wet = ctx.createGain()
    wet.gain.value = 0.28
    this.musicBus.connect(this.master)
    this.musicBus.connect(wet)
    wet.connect(delay)
    delay.connect(this.master)

    this.ambBus = ctx.createGain()
    this.ambBus.gain.value = 0.0
    this.ambBus.connect(this.master)

    this.startAmbient()
    // auto-resume whenever the browser suspends the context
    this.onStateChange = () => this.resumeIfSuspended()
    ctx.addEventListener('statechange', this.onStateChange)
    this.nextNoteTime = ctx.currentTime + 0.4
    // rAF-driven scheduling comes from tick(); interval is a low-frequency fallback
    this.fallbackTimer = setInterval(() => this.tick(), 1000)
    // fade ambience in
    this.ambBus.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 3)

    this.started = true
    void ctx.resume().catch(() => {})
  }

  /** Called every animation frame from the game loop and on user gestures. */
  tick() {
    const ctx = this.ctx
    if (!ctx) return
    if (ctx.state !== 'running') {
      if (this.enabled) this.resumeIfSuspended()
      return
    }
    if (this.started) this.scheduleMusic()
  }

  private resumeIfSuspended() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'suspended') return
    const now = performance.now()
    if (now - this.lastResumeTry < 500) return
    this.lastResumeTry = now
    void ctx.resume().catch(() => {})
  }

  private startAmbient() {
    const ctx = this.ctx
    if (!ctx || !this.ambBus) return
    // filtered brown-ish noise = water wash
    const len = ctx.sampleRate * 3
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    lp.Q.value = 0.6
    // slow LFO on filter for wave-like motion
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 140
    lfo.connect(lfoGain)
    lfoGain.connect(lp.frequency)
    lfo.start()
    const ng = ctx.createGain()
    ng.gain.value = 0.16
    src.connect(lp)
    lp.connect(ng)
    ng.connect(this.ambBus)
    src.start()
    this.noiseSource = src

    // deep drone
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 58
    const og = ctx.createGain()
    og.gain.value = 0.05
    osc.connect(og)
    og.connect(this.ambBus)
    osc.start()
    this.droneOsc = osc
  }

  private scheduleMusic() {
    const ctx = this.ctx
    if (!ctx || !this.musicBus || ctx.state !== 'running') return
    // if the tab was throttled and we fell behind, jump forward instead of bursting
    if (this.nextNoteTime < ctx.currentTime) {
      this.nextNoteTime = ctx.currentTime + 0.05
    }
    try {
      while (this.nextNoteTime < ctx.currentTime + 0.7) {
        const t = this.nextNoteTime
        // random walk melody
        const step = Math.floor(Math.random() * 3) - 1
        this.melodyIdx = Math.max(0, Math.min(PENTA.length - 1, this.melodyIdx + step))
        const freq = PENTA[this.melodyIdx]
        this.melodyCount++
        const vel = 0.05 + Math.random() * 0.045
        this.playTone(freq, t, 0.9 + Math.random() * 0.7, vel, 'sine', this.musicBus)
        this.playTone(freq * 2, t, 0.7, vel * 0.25, 'triangle', this.musicBus)
        // soft low root every 8 notes
        if (this.melodyCount % 8 === 0) {
          this.playTone(PENTA[0] / 2, t, 2.6, 0.055, 'sine', this.musicBus)
          this.playTone(PENTA[0] / 2 * 1.5, t + 0.05, 2.4, 0.03, 'sine', this.musicBus)
        }
        this.nextNoteTime += 0.75 + Math.random() * 0.7
      }
    } catch {
      // never let one bad note kill the music loop
    }
  }

  private playTone(
    freq: number,
    at: number,
    dur: number,
    vel: number,
    type: OscillatorType,
    dest: AudioNode,
    slideTo?: number,
  ) {
    const ctx = this.ctx
    if (!ctx) return
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, at)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(vel, at + Math.min(0.08, dur * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g)
    g.connect(dest)
    o.start(at)
    o.stop(at + dur + 0.05)
  }

  private sfxTone(freq: number, dur: number, vel: number, type: OscillatorType, slideTo?: number) {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return
    try {
      this.playTone(freq, this.ctx.currentTime, dur, vel, type, this.sfxBus, slideTo)
    } catch {
      // ignore
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime)
      this.master.gain.linearRampToValueAtTime(on ? 1 : 0, this.ctx.currentTime + 0.2)
    }
  }

  bubble() {
    this.sfxTone(320 + Math.random() * 180, 0.16, 0.06, 'sine', 780 + Math.random() * 260)
  }

  plop() {
    this.sfxTone(520, 0.1, 0.09, 'sine', 170)
    this.sfxTone(140, 0.22, 0.05, 'sine')
  }

  eat() {
    this.sfxTone(240, 0.08, 0.08, 'triangle', 130)
    this.sfxTone(460 + Math.random() * 80, 0.14, 0.045, 'sine')
  }

  coin() {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return
    try {
      const t = this.ctx.currentTime
      this.playTone(880, t, 0.1, 0.07, 'square', this.sfxBus)
      this.playTone(1318, t + 0.08, 0.22, 0.07, 'square', this.sfxBus)
    } catch {
      // ignore
    }
  }

  buy() {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return
    try {
      const t = this.ctx.currentTime
      this.playTone(523, t, 0.2, 0.06, 'sine', this.sfxBus)
      this.playTone(659, t + 0.09, 0.2, 0.06, 'sine', this.sfxBus)
      this.playTone(784, t + 0.18, 0.35, 0.07, 'sine', this.sfxBus)
    } catch {
      // ignore
    }
  }

  levelUp() {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return
    try {
      const t = this.ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((n, i) => {
        this.playTone(n, t + i * 0.12, 0.5, 0.08, 'triangle', this.sfxBus as AudioNode)
      })
      this.playTone(1567.98, t + 0.48, 0.8, 0.06, 'sine', this.sfxBus as AudioNode)
    } catch {
      // ignore
    }
  }

  warn() {
    this.sfxTone(220, 0.3, 0.07, 'sine', 110)
  }

  pop() {
    this.sfxTone(760, 0.06, 0.08, 'sine', 220)
  }

  click() {
    this.sfxTone(660, 0.05, 0.035, 'sine')
  }

  dispose() {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer)
    if (this.ctx && this.onStateChange) {
      this.ctx.removeEventListener('statechange', this.onStateChange)
    }
    try {
      this.noiseSource?.stop()
      this.droneOsc?.stop()
      void this.ctx?.close()
    } catch {
      // ignore
    }
    this.ctx = null
    this.started = false
  }
}
