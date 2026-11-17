'use client'

// Toast stack with auto-dismiss

import { useEffect } from 'react'
import { AlertTriangle, PartyPopper, Sparkles, Info } from 'lucide-react'
import { useAquarium } from '@/lib/game/store'
import type { GameToast } from '@/lib/game/types'
import { AnimatePresence, motion } from 'framer-motion'

const STYLES: Record<
  GameToast['kind'],
  { ring: string; icon: React.ReactNode; bg: string }
> = {
  info: {
    ring: 'ring-white/15',
    bg: 'bg-[#0a1d26]/90',
    icon: <Info className="h-4 w-4 text-teal-300" />,
  },
  success: {
    ring: 'ring-emerald-400/40',
    bg: 'bg-[#0a2620]/90',
    icon: <PartyPopper className="h-4 w-4 text-emerald-300" />,
  },
  warn: {
    ring: 'ring-amber-400/40',
    bg: 'bg-[#261a08]/90',
    icon: <AlertTriangle className="h-4 w-4 text-amber-300" />,
  },
  reward: {
    ring: 'ring-amber-300/50',
    bg: 'bg-[#241d06]/90',
    icon: <Sparkles className="h-4 w-4 text-amber-300" />,
  },
}

function ToastItem({ toast }: { toast: GameToast }) {
  const dismissToast = useAquarium((s) => s.dismissToast)
  const style = STYLES[toast.kind]

  useEffect(() => {
    const t = setTimeout(() => dismissToast(toast.id), 4200)
    return () => clearTimeout(t)
  }, [toast.id, dismissToast])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl px-4 py-3 shadow-xl ring-1 backdrop-blur-md ${style.ring} ${style.bg}`}
      role="status"
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight text-white">{toast.title}</p>
        {toast.desc && <p className="mt-0.5 text-xs leading-snug text-white/65">{toast.desc}</p>}
      </div>
    </motion.div>
  )
}

export default function ToastStack() {
  const toasts = useAquarium((s) => s.toasts)
  const started = useAquarium((s) => s.started)

  if (!started) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[7.5rem] z-30 flex flex-col items-center gap-2 px-4 sm:top-24">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  )
}
