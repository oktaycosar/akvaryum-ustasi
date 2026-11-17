// Client-side runtime bridge between React components and the game engine

import type { AquariumEngine } from './engine'
import type { AudioEngine } from './audio'

export const runtime: {
  engine: AquariumEngine | null
  audio: AudioEngine | null
} = { engine: null, audio: null }

/** Persist current game state to the server immediately. */
export function saveNow() {
  const engine = runtime.engine
  if (!engine) return
  fetch('/api/game/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(engine.getSaveData()),
    keepalive: true,
  }).catch(() => {})
}
