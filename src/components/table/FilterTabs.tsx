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
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
              active
                ? 'border-primary bg-primary text-white shadow-sm'
                : 'border-slate-200 bg-white text-ink-soft hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink-faint'
              }`}
            >
              {counts[tab.key] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}
