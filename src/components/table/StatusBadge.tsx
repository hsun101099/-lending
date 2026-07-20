import { STAGE_CONFIG } from '../../data/stages'
import type { StageKey } from '../../types'

interface StatusBadgeProps {
  stage: StageKey
  className?: string
}

export default function StatusBadge({ stage, className = '' }: StatusBadgeProps) {
  const cfg = STAGE_CONFIG[stage]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
