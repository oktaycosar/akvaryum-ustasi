// Zustand store for game UI state

import { create } from 'zustand'
import type { GameToast, SelectedFishInfo, UiSync } from './types'

interface AquariumStore {
  sync: UiSync | null
  started: boolean
  loaded: boolean
  soundOn: boolean
  shopOpen: boolean
  toasts: GameToast[]
  selectedFish: SelectedFishInfo | null
  setSync: (s: UiSync) => void
  setStarted: (v: boolean) => void
  setLoaded: (v: boolean) => void
  setSoundOn: (v: boolean) => void
  setShopOpen: (v: boolean) => void
  setSelectedFish: (f: SelectedFishInfo | null) => void
  pushToast: (t: Omit<GameToast, 'id'>) => void
  dismissToast: (id: number) => void
}

let toastSeq = 1

export const useAquarium = create<AquariumStore>((set) => ({
  sync: null,
  started: false,
  loaded: false,
  soundOn: true,
  shopOpen: false,
  toasts: [],
  selectedFish: null,
  setSync: (s) => set({ sync: s }),
  setStarted: (v) => set({ started: v }),
  setLoaded: (v) => set({ loaded: v }),
  setSoundOn: (v) => set({ soundOn: v }),
  setShopOpen: (v) => set({ shopOpen: v }),
  setSelectedFish: (f) => set({ selectedFish: f }),
  pushToast: (t) => {
    const id = toastSeq++
    set((st) => ({ toasts: [...st.toasts.slice(-3), { ...t, id }] }))
  },
  dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
}))
