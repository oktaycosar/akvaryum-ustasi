'use client'

// Canvas host: creates the engine, loads the save and manages autosave

import { useEffect, useRef } from 'react'
import { AquariumEngine } from '@/lib/game/engine'
import { AudioEngine } from '@/lib/game/audio'
import { runtime, saveNow } from '@/lib/game/runtime'
import { useAquarium } from '@/lib/game/store'
import type { SaveData } from '@/lib/game/types'

const DEFAULT_SAVE: SaveData = {
  coins: 100,
  level: 1,
  fedTotal: 0,
  coinsTotal: 0,
  purchases: 0,
  fish: [],
  decor: [],
  soundOn: true,
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const audio = new AudioEngine()
    runtime.audio = audio
    // if the game was already started (e.g. hot remount), restore audio immediately
    if (useAquarium.getState().started) audio.init()
    const engine = new AquariumEngine(canvas, audio, {
      onSync: (s) => useAquarium.getState().setSync(s),
      onToast: (title, desc, kind) =>
        useAquarium.getState().pushToast({ title, desc, kind: kind ?? 'info' }),
      onFishSelect: (f) => useAquarium.getState().setSelectedFish(f),
    })
    runtime.engine = engine
    // debug/testing hook (harmless in production)
    ;(window as unknown as { __aquaRuntime?: typeof runtime }).__aquaRuntime = runtime

    let cancelled = false
    const load = async () => {
      let save: SaveData | null = null
      try {
        const res = await fetch('/api/game/state')
        if (res.ok) {
          const json: { save: SaveData | null } = await res.json()
          save = json.save ?? null
        }
      } catch {
        save = null
      }
      if (cancelled) return
      engine.loadSave(save ?? DEFAULT_SAVE)
      if (save) {
        audio.setEnabled(save.soundOn)
        useAquarium.getState().setSoundOn(save.soundOn)
      }
      useAquarium.getState().setLoaded(true)
      engine.start()
    }
    void load()

    const autosave = setInterval(saveNow, 12000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveNow()
      } else {
        // back in view: wake audio up if the browser suspended it
        audio.tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', saveNow)

    return () => {
      cancelled = true
      clearInterval(autosave)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', saveNow)
      saveNow()
      engine.destroy()
      audio.dispose()
      runtime.engine = null
      runtime.audio = null
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const engine = runtime.engine
    if (!canvas || !engine) return
    const rect = canvas.getBoundingClientRect()
    // any tap is a user gesture: give the audio context a chance to resume
    runtime.audio?.tick()
    engine.pointerDown(e.clientX - rect.left, e.clientY - rect.top)
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none select-none"
      onPointerDown={onPointerDown}
      aria-label="Akvaryum oyun alanı"
    />
  )
}
