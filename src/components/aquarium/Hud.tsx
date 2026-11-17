'use client'

// Top HUD: level + objective progress, coins, fish count, sound & shop buttons

import { Coins, Fish, Store, Volume2, VolumeX, AlertTriangle, Sun, Sunset, Moon, Sunrise } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { runtime } from '@/lib/game/runtime'
import { useAquarium } from '@/lib/game/store'
import { AnimatePresence, motion } from 'framer-motion'

export default function Hud() {
  const sync = useAquarium((s) => s.sync)
  const started = useAquarium((s) => s.started)
  const soundOn = useAquarium((s) => s.soundOn)
  const setSoundOn = useAquarium((s) => s.setSoundOn)
  const setShopOpen = useAquarium((s) => s.setShopOpen)

  if (!sync || !started) return null

  const pct = Math.min(100, Math.round((sync.objCurrent / Math.max(1, sync.objTarget)) * 100))

  const PHASE = {
    day: { icon: <Sun className="h-4 w-4 text-amber-300" />, label: 'Gündüz' },
    sunset: { icon: <Sunset className="h-4 w-4 text-orange-300" />, label: 'Gün Batımı' },
    night: { icon: <Moon className="h-4 w-4 text-slate-300" />, label: 'Gece' },
    dawn: { icon: <Sunrise className="h-4 w-4 text-yellow-200" />, label: 'Şafak' },
  } as const
  const phase = PHASE[sync.dayPhase]

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    runtime.audio?.setEnabled(next)
    const engine = runtime.engine
    if (engine) {
      fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engine.getSaveData()),
      }).catch(() => {})
    }
  }

  return (
    <AnimatePresence>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4"
      >
        {/* Level & objective */}
        <div className="pointer-events-auto min-w-0 max-w-[52vw] rounded-2xl border border-white/10 bg-[#0a1d26]/75 p-2.5 shadow-lg backdrop-blur-md sm:max-w-sm sm:p-4">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-bold tracking-wide text-emerald-300">
              SEVİYE {sync.level}
            </span>
            <span className="truncate text-sm font-semibold text-white/90">{sync.levelTitle}</span>
          </div>
          <p className="mt-1 truncate text-xs text-white/60">{sync.levelDesc}</p>
          <div className="mt-2 flex items-center gap-2">
            <Progress
              value={pct}
              className="h-2 flex-1 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-emerald-400 [&>div]:to-teal-300"
            />
            <span className="min-w-[64px] text-right text-xs font-semibold tabular-nums text-emerald-300">
              {sync.objCurrent}/{sync.objTarget}
            </span>
          </div>
          {sync.sickCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
              <span>{sync.sickCount} balık aç — suya yem bırak!</span>
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0a1d26]/75 px-2.5 py-1.5 shadow-lg backdrop-blur-md sm:px-3 sm:py-2"
              title={phase.label}
            >
              {phase.icon}
              <span className="hidden text-xs font-medium text-white/70 lg:inline">{phase.label}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-amber-300/20 bg-[#0a1d26]/75 px-2.5 py-1.5 shadow-lg backdrop-blur-md sm:px-3 sm:py-2">
              <Coins className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-bold tabular-nums text-amber-200">{sync.coins}</span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0a1d26]/75 px-3 py-2 shadow-lg backdrop-blur-md sm:flex">
              <Fish className="h-4 w-4 text-teal-300" />
              <span className="text-sm font-bold tabular-nums text-teal-100">
                {sync.fishCount}/{sync.tankCap}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
              aria-label={soundOn ? 'Sesi kapat' : 'Sesi aç'}
              className="h-9 w-9 rounded-2xl border-white/10 bg-[#0a1d26]/75 text-white/80 backdrop-blur-md hover:bg-[#123240] hover:text-white sm:h-10 sm:w-10"
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => setShopOpen(true)}
              aria-label="Mağazayı aç"
              className="h-9 rounded-2xl bg-emerald-600 px-3 text-white shadow-lg hover:bg-emerald-500 sm:h-10 sm:px-4"
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Mağaza</span>
            </Button>
          </div>
          {sync.sickCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-950/70 px-2.5 py-1 text-xs font-medium text-amber-200 backdrop-blur-md sm:hidden">
              <AlertTriangle className="h-3 w-3 animate-pulse" />
              <span>{sync.sickCount} balık aç</span>
            </div>
          )}
        </div>
      </motion.header>
    </AnimatePresence>
  )
}
