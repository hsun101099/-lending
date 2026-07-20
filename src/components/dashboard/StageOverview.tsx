import { motion } from 'framer-motion'
import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import type { LoanCase } from '../../types'

interface StageOverviewProps {
  cases: LoanCase[]
}

export default function StageOverview({ cases }: StageOverviewProps) {
  const counts = ALL_FILTER_STAGES.map((stage) => ({
    stage,
    count: cases.filter((c) => c.currentStage === stage).length,
  }))
  const max = Math.max(...counts.map((c) => c.count), 1)

  return (
    <div className="rounded-2xl border border-slate-100 bg-card p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">流程統計</h2>
          <p className="mt-0.5 text-xs text-ink-faint">各流程階段目前案件分布</p>
        </div>
        <span className="text-xs font-medium text-ink-faint">共 {cases.length} 筆案件</span>
      </div>

      <div className="space-y-4">
        {counts.map(({ stage, count }, i) => {
          const cfg = STAGE_CONFIG[stage]
          const width = (count / max) * 100
          return (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-12 shrink-0 text-sm font-semibold text-ink-soft">{cfg.label}</div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-50">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: cfg.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                />
              </div>
              <div className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-ink">{count}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
