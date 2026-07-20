import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  label: string
  value: string
  icon: LucideIcon
  tint: 'primary' | 'success' | 'warning' | 'danger' | 'slate'
  helper?: string
  index?: number
}

const TINTS: Record<DashboardCardProps['tint'], { bg: string; text: string; ring: string }> = {
  primary: { bg: 'bg-blue-50', text: 'text-primary', ring: 'ring-blue-100' },
  success: { bg: 'bg-green-50', text: 'text-success', ring: 'ring-green-100' },
  warning: { bg: 'bg-amber-50', text: 'text-warning', ring: 'ring-amber-100' },
  danger: { bg: 'bg-red-50', text: 'text-danger', ring: 'ring-red-100' },
  slate: { bg: 'bg-slate-100', text: 'text-ink-soft', ring: 'ring-slate-200' },
}

export default function DashboardCard({ label, value, icon: Icon, tint, helper, index = 0 }: DashboardCardProps) {
  const t = TINTS[tint]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className="group rounded-2xl border border-slate-100 bg-card p-5 shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-soft">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
          {helper && <p className="mt-1.5 text-xs text-ink-faint">{helper}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.text} ring-4 ${t.ring} transition-transform duration-300 group-hover:scale-105`}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>
    </motion.div>
  )
}
