import { motion } from 'framer-motion'
import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import type { StageKey } from '../../types'

export type FilterValue = 'all' | StageKey

interface FilterTabsProps {
  value: FilterValue
  onChange: (value: FilterValue) => void
  counts: Record<string, number>
}

export default function FilterTabs({ value, onChange, counts }: FilterTabsProps) {
  const tabs: { key: FilterValue; label: string }[] = [
    { key: 'all', label: '全部' },
    ...ALL_FILTER_STAGES.map((s) => ({ key: s as FilterValue, label: STAGE_CONFIG[s].label })),
  ]

  return (
    <div className="relative">
      {/* 階段多達 12 個，手機改為單列橫向捲動，避免擠成好幾排；桌機空間足夠則自動換行 */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-x-visible">
        {tabs.map((tab) => {
          const active = tab.key === value
          const count = counts[tab.key] ?? 0
          const isEmpty = count === 0 && !active

          return (
            <motion.button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              whileTap={{ scale: 0.96 }}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-200 ${
                active ? 'text-white' : isEmpty ? 'text-ink-faint hover:text-ink-soft' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {/* 選取色塊在選項之間實際滑動，而非直接切換 */}
              {active && (
                <motion.span
                  layoutId="filter-active-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-primary shadow-[0_2px_8px_-2px_rgba(37,99,235,0.5)]"
                />
              )}
              {!active && (
                <span className="absolute inset-0 rounded-full bg-transparent transition-colors duration-200 hover:bg-slate-100/80" />
              )}

              <span className="relative z-10">{tab.label}</span>
              <span
                className={`relative z-10 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums transition-colors duration-200 ${
                  active ? 'bg-white/25 text-white' : isEmpty ? 'text-ink-faint/70' : 'bg-slate-100 text-ink-faint'
                }`}
              >
                {count}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* 提示右側還有選項，桌機換行後不需要 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-app-bg to-transparent sm:hidden" />
    </div>
  )
}
