import { ArrowDownUp } from 'lucide-react'
import { SORT_OPTIONS, type ReportFilters, type ReportSortKey, type SortDirection } from '../../utils/reportFilters'

interface SortControlsProps {
  filters: ReportFilters
  onChange: (patch: Partial<ReportFilters>) => void
}

/**
 * 報表排序的選擇列，放在預覽頁的版面上方。
 *
 * 按下去下方版面立刻重排，不必回篩選頁；下載的 PDF 也照同一個順序。
 */
export default function SortControls({ filters, onChange }: SortControlsProps) {
  const option = SORT_OPTIONS.find((o) => o.key === filters.sortKey) ?? SORT_OPTIONS[0]

  const chip = (key: ReportSortKey, label: string) => {
    const active = filters.sortKey === key
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChange({ sortKey: key })}
        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
          active
            ? 'border-primary bg-blue-50 text-primary'
            : 'border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="print-hide">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-ink-soft">
          <ArrowDownUp size={12} />
          排序
        </p>
        {/* 方向的說法會隨欄位改變：金額是「多到少」，日期是「新到舊」 */}
        <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-0.5">
          {(['asc', 'desc'] as SortDirection[]).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => onChange({ sortDir: dir })}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ${
                filters.sortDir === dir ? 'bg-primary text-white shadow-sm' : 'text-ink-soft hover:bg-slate-200/60'
              }`}
            >
              {dir === 'asc' ? option.asc : option.desc}
            </button>
          ))}
        </div>
      </div>
      {/* 選項較多，改成左右滑動，才不會把預覽擠掉 */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SORT_OPTIONS.map((o) => chip(o.key, o.label))}
      </div>
    </div>
  )
}
