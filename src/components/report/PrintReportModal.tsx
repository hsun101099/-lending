import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Printer, RotateCcw, X } from 'lucide-react'
import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import { OFFICER_OPTIONS } from '../../data/officers'
import { applyReportFilters, EMPTY_REPORT_FILTERS, type ReportFilters } from '../../utils/reportFilters'
import PrintableReport from './PrintableReport'
import type { LoanCase, StageKey } from '../../types'

interface PrintReportModalProps {
  open: boolean
  cases: LoanCase[]
  onClose: () => void
}

export default function PrintReportModal({ open, cases, onClose }: PrintReportModalProps) {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS)

  // 承辦人選單併入資料中既有的名字，避免舊案件的承辦人選不到
  const officerChoices = useMemo(() => {
    const fromData = cases.map((c) => c.officer).filter(Boolean)
    return Array.from(new Set([...OFFICER_OPTIONS, ...fromData]))
  }, [cases])

  const filteredCases = useMemo(() => applyReportFilters(cases, filters), [cases, filters])

  function toggleStage(stage: StageKey) {
    setFilters((f) => ({
      ...f,
      stages: f.stages.includes(stage) ? f.stages.filter((s) => s !== stage) : [...f.stages, stage],
    }))
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-ink transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="print-root fixed inset-0 z-[80] flex flex-col bg-slate-900/40 backdrop-blur-[2px]"
        >
          <div className="print-hide flex flex-1 flex-col overflow-hidden p-4 sm:p-6">
            <div className="mx-auto flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-drawer">
              {/* 標題列 */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Printer size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink">列印報表</h2>
                    <p className="text-xs text-ink-faint">設定篩選條件後列印，或在列印視窗中選擇「另存為 PDF」</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 篩選條件 */}
              <div className="shrink-0 space-y-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">建立日期（起）</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">建立日期（迄）</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">承辦人</label>
                    <select
                      value={filters.officer}
                      onChange={(e) => setFilters((f) => ({ ...f, officer: e.target.value }))}
                      className={fieldClass}
                    >
                      <option value="">全部承辦人</option>
                      {officerChoices.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                    流程階段（不選代表全部）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_FILTER_STAGES.map((stage) => {
                      const active = filters.stages.includes(stage)
                      return (
                        <button
                          key={stage}
                          onClick={() => toggleStage(stage)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                            active
                              ? 'border-primary bg-primary text-white shadow-sm'
                              : 'border-slate-200 bg-white text-ink-soft hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {STAGE_CONFIG[stage].label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 預覽 */}
              <div className="flex-1 overflow-auto bg-slate-100 p-6">
                <div className="mx-auto w-fit shadow-card">
                  <PrintableReport cases={filteredCases} filters={filters} />
                </div>
              </div>

              {/* 底部操作 */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-ink-soft">
                    符合條件 <span className="font-bold text-ink">{filteredCases.length}</span> / {cases.length} 筆
                  </p>
                  <button
                    onClick={() => setFilters(EMPTY_REPORT_FILTERS)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                  >
                    <RotateCcw size={12} />
                    清除條件
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
                  >
                    <Printer size={16} />
                    列印 / 存成 PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 實際送印的內容：畫面上隱藏，只在列印時出現 */}
          <div className="print-only hidden">
            <PrintableReport cases={filteredCases} filters={filters} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
