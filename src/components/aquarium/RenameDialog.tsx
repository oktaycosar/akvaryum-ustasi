'use client'

// Rename dialog: opens when the player taps a fish in the tank

import { useState } from 'react'
import { Dices, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FishPreview from '@/components/aquarium/FishPreview'
import { runtime, saveNow } from '@/lib/game/runtime'
import { useAquarium } from '@/lib/game/store'
import { FISH_NAMES } from '@/lib/game/names'
import { SPECIES } from '@/lib/game/species'
import type { SelectedFishInfo } from '@/lib/game/types'

function RenameForm({ fish }: { fish: SelectedFishInfo }) {
  const setSelectedFish = useAquarium((s) => s.setSelectedFish)
  const [name, setName] = useState(fish.name ?? '')

  const close = () => setSelectedFish(null)

  const save = () => {
    const engine = runtime.engine
    if (engine) {
      engine.renameFish(fish.id, name)
      saveNow()
    }
    close()
  }

  const randomName = () => {
    const current = name.trim()
    const candidates = FISH_NAMES.filter((n) => n !== current)
    setName(candidates[Math.floor(Math.random() * candidates.length)])
  }

  return (
    <div
      className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0a1d26]/95 p-5 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-white">{SPECIES[fish.speciesId]?.name ?? 'Balık'}</h2>
          <p className="text-[11px] italic text-white/45">{SPECIES[fish.speciesId]?.latin}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Kapat"
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="my-3 flex justify-center rounded-2xl bg-gradient-to-b from-teal-900/50 to-[#0b2830] py-2">
        <FishPreview speciesId={fish.speciesId} active width={150} height={80} />
      </div>

      <label className="mb-1.5 block text-xs font-medium text-white/60" htmlFor="fish-name">
        Balığının adı
      </label>
      <div className="flex gap-2">
        <Input
          id="fish-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
          maxLength={16}
          placeholder="Örn. Boncuk"
          className="border-white/15 bg-white/5 text-white placeholder:text-white/30"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={randomName}
          aria-label="Rastgele isim"
          title="Rastgele isim"
          className="shrink-0 border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Dices className="h-4 w-4" />
        </Button>
      </div>

      <Button
        onClick={save}
        className="mt-4 w-full bg-emerald-600 font-semibold hover:bg-emerald-500"
      >
        <Check className="h-4 w-4" />
        Kaydet
      </Button>
    </div>
  )
}

export default function RenameDialog() {
  const selectedFish = useAquarium((s) => s.selectedFish)
  const setSelectedFish = useAquarium((s) => s.setSelectedFish)

  if (!selectedFish) return null

  return (
    <div
      className="absolute inset-0 z-[45] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={() => setSelectedFish(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Balığı yeniden adlandır"
    >
      <RenameForm key={selectedFish.id} fish={selectedFish} />
    </div>
  )
}
