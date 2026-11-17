'use client'

import GameCanvas from '@/components/aquarium/GameCanvas'
import Hud from '@/components/aquarium/Hud'
import Shop from '@/components/aquarium/Shop'
import StartOverlay from '@/components/aquarium/StartOverlay'
import ToastStack from '@/components/aquarium/ToastStack'
import RenameDialog from '@/components/aquarium/RenameDialog'
import { MousePointerClick } from 'lucide-react'
import { useAquarium } from '@/lib/game/store'
import { AnimatePresence, motion } from 'framer-motion'

export default function Page() {
  const started = useAquarium((s) => s.started)
  const shopOpen = useAquarium((s) => s.shopOpen)

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#0b222a]">
      <GameCanvas />

      <Hud />
      <ToastStack />
      <Shop />
      <RenameDialog />
      <StartOverlay />

      {/* bottom hint */}
      <AnimatePresence>
        {started && !shopOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center"
          >
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0a1d26]/70 px-3.5 py-1.5 text-xs text-white/60 backdrop-blur-md">
              <MousePointerClick className="h-3.5 w-3.5 text-teal-300" />
              Suya dokunarak yem bırak · balıklara dokunup isim ver · parlayan kabarcıkları yakala
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
