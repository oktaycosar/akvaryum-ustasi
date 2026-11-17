'use client'

// Fish shop dialog with live animated species previews and decor tab

import { useEffect, useRef } from 'react'
import { Coins, Lock, Utensils, X, Fish as FishIcon, Gem } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import FishPreview from '@/components/aquarium/FishPreview'
import { drawDecorPreview } from '@/lib/game/decor'
import { runtime, saveNow } from '@/lib/game/runtime'
import { useAquarium } from '@/lib/game/store'
import { SPECIES_LIST, DECOR_ITEMS, TANK_CAP } from '@/lib/game/species'

function DecorPreview({ decorId, active }: { decorId: string; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = 132 * dpr
    canvas.height = 74 * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let t = Math.random() * 10
    const iv = setInterval(() => {
      t += 0.16
      drawDecorPreview(ctx, decorId, 132, 74, t)
    }, 140)
    drawDecorPreview(ctx, decorId, 132, 74, t)
    return () => clearInterval(iv)
  }, [decorId, active])

  return <canvas ref={ref} style={{ width: 132, height: 74 }} aria-hidden="true" />
}

export default function Shop() {
  const shopOpen = useAquarium((s) => s.shopOpen)
  const setShopOpen = useAquarium((s) => s.setShopOpen)
  const sync = useAquarium((s) => s.sync)

  if (!shopOpen || !sync) return null

  const tankFull = sync.fishCount >= TANK_CAP

  const buyFish = (speciesId: string) => {
    runtime.engine?.buyFish(speciesId)
    saveNow()
  }

  const buyDecor = (decorId: string) => {
    runtime.engine?.buyDecor(decorId)
    saveNow()
  }

  const sortedFish = [...SPECIES_LIST].sort(
    (a, b) => a.unlockLevel - b.unlockLevel || a.price - b.price,
  )

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center"
      onClick={() => setShopOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Akvaryum mağazası"
    >
      <div
        className="max-h-[88dvh] w-full max-w-3xl overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a1d26]/95 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Akvaryum Mağazası</h2>
            <p className="text-xs text-white/55">
              Tank: {sync.fishCount}/{TANK_CAP} balık · Cüzdan:{' '}
              <span className="font-semibold text-amber-300">{sync.coins} altın</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShopOpen(false)}
            aria-label="Mağazayı kapat"
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Tabs defaultValue="fish" className="px-5 pb-4">
          <TabsList className="mt-3 grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger
              value="fish"
              className="gap-1.5 text-white/70 data-[state=active]:bg-white/15 data-[state=active]:text-white"
            >
              <FishIcon className="h-4 w-4" /> Balıklar
            </TabsTrigger>
            <TabsTrigger
              value="decor"
              className="gap-1.5 text-white/70 data-[state=active]:bg-white/15 data-[state=active]:text-white"
            >
              <Gem className="h-4 w-4" /> Süsler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fish" className="mt-3">
            <ScrollArea className="max-h-[58dvh]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sortedFish.map((sp) => {
                  const unlocked = sync.level >= sp.unlockLevel
                  const affordable = sync.coins >= sp.price
                  return (
                    <div
                      key={sp.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                        unlocked
                          ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                          : 'border-white/5 bg-black/30'
                      }`}
                    >
                      <div className="shrink-0 rounded-xl bg-gradient-to-b from-teal-900/60 to-[#0b2830] p-1">
                        <FishPreview speciesId={sp.id} active={shopOpen} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-bold text-white">{sp.name}</h3>
                          {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                        </div>
                        <p className="mb-1 truncate text-[10px] italic text-white/40">{sp.latin}</p>
                        <p className="line-clamp-2 text-xs leading-snug text-white/60">{sp.desc}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/70">
                          <span className="flex items-center gap-1 text-amber-300">
                            <Coins className="h-3 w-3" /> {sp.price}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-300">
                            <Utensils className="h-3 w-3" /> yem başına +{sp.coinPerEat}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {unlocked ? (
                          <Button
                            size="sm"
                            disabled={!affordable || tankFull}
                            onClick={() => buyFish(sp.id)}
                            className="bg-emerald-600 hover:bg-emerald-500"
                          >
                            {tankFull ? 'Dolu' : affordable ? 'Satın Al' : 'Altın Az'}
                          </Button>
                        ) : (
                          <span className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/50">
                            Sv. {sp.unlockLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {tankFull && (
                <p className="mt-3 text-center text-xs text-amber-300/90">
                  Akvaryum dolu — aynı anda en fazla {TANK_CAP} balık besleyebilirsin.
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="decor" className="mt-3">
            <ScrollArea className="max-h-[58dvh]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DECOR_ITEMS.map((d) => {
                  const unlocked = sync.level >= d.unlockLevel
                  const affordable = sync.coins >= d.price
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                        unlocked
                          ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                          : 'border-white/5 bg-black/30'
                      }`}
                    >
                      <div className="shrink-0 rounded-xl bg-gradient-to-b from-slate-800/60 to-[#1c2f2a] p-1">
                        <DecorPreview decorId={d.id} active={shopOpen} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-bold text-white">{d.name}</h3>
                          {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                        </div>
                        <p className="line-clamp-2 text-xs leading-snug text-white/60">{d.desc}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          <span className="flex items-center gap-1 text-amber-300">
                            <Coins className="h-3 w-3" /> {d.price}
                          </span>
                          <span className="text-teal-300">{d.effect}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {unlocked ? (
                          <Button
                            size="sm"
                            disabled={!affordable}
                            onClick={() => buyDecor(d.id)}
                            className="bg-emerald-600 hover:bg-emerald-500"
                          >
                            {affordable ? 'Al' : 'Altın Az'}
                          </Button>
                        ) : (
                          <span className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/50">
                            Sv. {d.unlockLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
