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
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-x-visible">
        {tabs.map((tab) => {
          const active = tab.key === value
          const count = counts[tab.key] ?? 0
          const isEmpty = count === 0 && !active

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                active
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : isEmpty
                    ? 'border-slate-200/70 bg-white text-ink-faint hover:border-slate-300 hover:text-ink-soft'
                    : 'border-slate-200 bg-white text-ink-soft hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  active ? 'bg-white/20 text-white' : isEmpty ? 'bg-slate-50 text-ink-faint' : 'bg-slate-100 text-ink-faint'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 提示右側還有選項，桌機換行後不需要 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-app-bg to-transparent sm:hidden" />
    </div>
  )
}
