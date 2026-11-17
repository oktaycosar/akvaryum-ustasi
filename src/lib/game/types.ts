// Shared game types for the aquarium game

export interface SavedFish {
  species: string
  growth: number
  name?: string
}

export interface SaveData {
  coins: number
  level: number
  fedTotal: number
  coinsTotal: number
  purchases: number
  fish: SavedFish[]
  decor: string[]
  soundOn: boolean
}

export type DayPhase = 'day' | 'sunset' | 'night' | 'dawn'

export interface UiSync {
  coins: number
  level: number
  levelTitle: string
  levelDesc: string
  objType: string
  objCurrent: number
  objTarget: number
  fishCount: number
  sickCount: number
  tankCap: number
  fedTotal: number
  coinsTotal: number
  purchases: number
  dayPhase: DayPhase
}

export interface SelectedFishInfo {
  id: number
  speciesId: string
  name?: string
  growth: number
}

export interface GameToast {
  id: number
  title: string
  desc?: string
  kind: 'info' | 'success' | 'warn' | 'reward'
}
