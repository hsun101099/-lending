import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number
  color?: string
  showLabel?: boolean
  className?: string
}

export default function ProgressBar({ value, color = '#2563EB', showLabel = true, className = '' }: ProgressBarProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 w-full min-w-[72px] overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <span className="w-9 shrink-0 text-right text-xs font-semibold text-ink-soft tabular-nums">{value}%</span>
      )}
    </div>
  )
}
