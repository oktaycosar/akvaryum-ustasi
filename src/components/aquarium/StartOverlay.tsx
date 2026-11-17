'use client'

// Start overlay: intro, instructions and audio unlock gesture

import { Fish, MousePointerClick, Sparkles, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runtime } from '@/lib/game/runtime'
import { useAquarium } from '@/lib/game/store'
import { motion } from 'framer-motion'

export default function StartOverlay() {
  const started = useAquarium((s) => s.started)
  const loaded = useAquarium((s) => s.loaded)
  const setStarted = useAquarium((s) => s.setStarted)
  const soundOn = useAquarium((s) => s.soundOn)

  if (started) return null

  const begin = () => {
    const audio = runtime.audio
    if (audio) {
      audio.init()
      audio.setEnabled(soundOn)
    }
    setStarted(true)
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#04131a]/90 via-[#04131a]/80 to-[#04131a]/95 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1d26]/90 p-6 text-center shadow-2xl sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/30 to-emerald-600/30 ring-1 ring-teal-400/30">
          <Fish className="h-8 w-8 text-teal-300" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Akvaryum Ustası
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          Gerçekçi bir akvaryum kur, balıklarını besle, seviyeleri tamamla.
        </p>

        {!loaded ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Akvaryum hazırlanıyor...
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-2.5 text-left">
              <li className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-3">
                <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                <span className="text-sm text-white/75">
                  Suya dokun — yem tanesi düşer, balıklar yarışarak kapışır.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-3">
                <Fish className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span className="text-sm text-white/75">
                  Aç kalan balıklar hasta olur. Balıklara dokunup isim verebilirsin.
                </span>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span className="text-sm text-white/75">
                  Seviyeleri tamamla, 8 tür ve 7 süs eşyası keşfet. Gün batıp gece çökünce tank
                  ışıkları söner — altın kabarcıklarını kaçırmadan yakala!
                </span>
              </li>
            </ul>
            <Button
              onClick={begin}
              size="lg"
              className="mt-6 w-full bg-emerald-600 text-base font-bold hover:bg-emerald-500"
            >
              <Play className="h-5 w-5" />
              Oyuna Başla
            </Button>
            <p className="mt-3 text-[11px] text-white/40">
              Ses efektleri ve sualtı müziği için hoparlörünü aç.
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
