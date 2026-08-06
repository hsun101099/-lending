import { ArrowDownUp } from 'lucide-react'
import { SORT_OPTIONS, type ReportFilters, type ReportSortKey, type SortDirection } from '../../utils/reportFilters'

interface SortControlsProps {
  filters: ReportFilters
  onChange: (patch: Partial<ReportFilters>) => void
  /** 預覽頁空間有限，改用可左右滑動的窄版 */
  compact?: boolean
}

/**
 * 報表排序的選擇列。
 *
 * 篩選頁與預覽頁共用同一個元件，兩邊按起來一樣、結果也一樣；
 * 預覽頁按下去會立刻重排，不必回上一步。
 */
export default function SortControls({ filters, onChange, compact = false }: SortControlsProps) {
  const option = SORT_OPTIONS.find((o) => o.key === filters.sortKey) ?? SORT_OPTIONS[0]

  const chip = (key: ReportSortKey, label: string) => {
    const active = filters.sortKey === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChange({ sortKey: key })}
        className={`shrink-0 rounded-full border font-medium transition-colors duration-150 ${
          compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          active
            ? 'border-primary bg-blue-50 text-primary'
            : 'border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
        }`}
      >
        {label}
      </button>
    )
  }

  const directions = (['asc', 'desc'] as SortDirection[]).map((dir) => {
    const active = filters.sortDir === dir
    return (
      <button
        key={dir}
        type="button"
        onClick={() => onChange({ sortDir: dir })}
        className={`font-semibold transition-colors duration-200 ${
          compact ? 'rounded-lg px-2.5 py-1 text-[11px]' : 'flex-1 rounded-xl py-2 text-xs'
        } ${active ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-ink-soft hover:bg-slate-100'}`}
      >
        {dir === 'asc' ? option.asc : option.desc}
      </button>
    )
  })

  if (compact) {
    return (
      <div className="print-hide">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-ink-soft">
            <ArrowDownUp size={12} />
            排序
          </p>
          <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-0.5">{directions}</div>
        </div>
        {/* 選項較多，改成左右滑動，才不會把預覽擠掉 */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {SORT_OPTIONS.map((o) => chip(o.key, o.label))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-ink-soft">
        排序方式
        <span className="ml-1 font-normal text-ink-faint">報表與 PDF 都照這個順序印</span>
      </label>
      <div className="mb-2.5 flex flex-wrap gap-1.5">{SORT_OPTIONS.map((o) => chip(o.key, o.label))}</div>
      {/* 方向的說法會隨欄位改變：金額是「多到少」，日期是「新到舊」 */}
      <div className="flex gap-1.5">{directions}</div>
    </div>
  )
}
