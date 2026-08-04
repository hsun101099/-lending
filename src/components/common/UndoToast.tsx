import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Undo2, X } from 'lucide-react'

interface UndoToastProps {
  open: boolean
  message: string
  actionLabel?: string
  /** 幾毫秒後自動關閉 */
  duration?: number
  onAction: () => void
  onDismiss: () => void
}

/**
 * 刪除後立刻出現的復原提示。
 * 誤刪時不必先找到回收桶，直接在原地按一下就能還原。
 */
export default function UndoToast({
  open,
  message,
  actionLabel = '復原',
  duration = 10000,
  onAction,
  onDismiss,
}: UndoToastProps) {
  // 以 ref 保存回呼，避免父層每次重繪都把倒數重新計時
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => dismissRef.current(), duration)
    return () => clearTimeout(timer)
  }, [open, duration, message])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed inset-x-4 bottom-6 z-[80] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-drawer backdrop-blur-sm"
        >
          <p className="min-w-0 flex-1 truncate text-sm">{message}</p>
          <button
            onClick={onAction}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold transition-colors duration-150 hover:bg-white/25"
          >
            <Undo2 size={14} />
            {actionLabel}
          </button>
          <button
            onClick={onDismiss}
            aria-label="關閉提示"
            className="shrink-0 rounded-lg p-1 text-white/60 transition-colors duration-150 hover:text-white"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
