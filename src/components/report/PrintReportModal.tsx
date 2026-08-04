import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Download, FileText, Loader2, Printer, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import { applyReportFilters, describeFilters, EMPTY_REPORT_FILTERS, type ReportFilters } from '../../utils/reportFilters'
import { getSummaryCounts } from '../../utils/metrics'
import { formatWan } from '../../utils/format'
import { isOverdue } from '../table/LoanTable'
import PrintableReport from './PrintableReport'
import { downloadReportPdf } from '../../utils/downloadReportPdf'
import type { LoanCase, StageKey } from '../../types'

/** A4 橫式扣掉邊界後的內容寬度（273mm 換算為 96dpi 像素） */
const SHEET_WIDTH_PX = 1032

type Step = 'filter' | 'preview'

interface PrintReportModalProps {
  open: boolean
  cases: LoanCase[]
  onClose: () => void
}

export default function PrintReportModal({ open, cases, onClose }: PrintReportModalProps) {
  const [step, setStep] = useState<Step>('filter')
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const previewRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalHeight, setNaturalHeight] = useState(0)

  const filteredCases = useMemo(() => applyReportFilters(cases, filters), [cases, filters])
  const summary = getSummaryCounts(filteredCases)
  const totalAmount = filteredCases.reduce((sum, c) => sum + c.loanAmount, 0)
  const overdueCount = filteredCases.filter(isOverdue).length

  // 承辦人為自由輸入，選單直接取自實際資料，只列出真的存在的承辦人
  const officerChoices = useMemo(
    () => Array.from(new Set(cases.map((c) => c.officer).filter(Boolean))).sort(),
    [cases]
  )

  // 報表為 A4 實際尺寸，於畫面上等比縮小以完整顯示，手機才不會被裁掉右半邊
  useEffect(() => {
    if (!open || step !== 'preview') return
    const frame = frameRef.current
    if (!frame) return
    const update = () => setScale(Math.min(1, frame.clientWidth / SHEET_WIDTH_PX))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [open, step])

  useEffect(() => {
    if (!open || step !== 'preview') return
    const content = previewRef.current
    if (!content) return
    const update = () => setNaturalHeight(content.offsetHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(content)
    return () => observer.disconnect()
  }, [open, step, filteredCases.length])

  function handleClose() {
    onClose()
    // 等關閉動畫結束再重設，避免關閉過程畫面跳動
    setTimeout(() => {
      setStep('filter')
      setFilters(EMPTY_REPORT_FILTERS)
      setDownloadError('')
    }, 250)
  }

  async function handleDownload() {
    if (!previewRef.current) return
    setDownloading(true)
    setDownloadError('')
    try {
      await downloadReportPdf(previewRef.current)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : '產生 PDF 失敗，請改用列印功能')
    } finally {
      setDownloading(false)
    }
  }

  function toggleStage(stage: StageKey) {
    setFilters((f) => ({
      ...f,
      stages: f.stages.includes(stage) ? f.stages.filter((s) => s !== stage) : [...f.stages, stage],
    }))
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100'

  const summaryTiles = [
    { label: '案件筆數', value: `${filteredCases.length}`, unit: '件', accent: true },
    { label: '處理中', value: `${summary.processing}`, unit: '件' },
    { label: '已完成', value: `${summary.completed}`, unit: '件' },
    { label: '撤件', value: `${summary.withdrawn}`, unit: '件' },
    { label: '逾期未更新', value: `${overdueCount}`, unit: '件' },
    { label: '貸款總金額', value: formatWan(totalAmount), unit: '' },
  ]

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
          <div className="print-scroll flex flex-1 flex-col overflow-hidden p-3 sm:p-6">
            <div className="print-shell mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-drawer">
              {/* 標題列 */}
              <div className="print-hide flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    {step === 'filter' ? <SlidersHorizontal size={17} /> : <FileText size={17} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-ink">
                      {step === 'filter' ? '選擇報表範圍' : '報表預覽'}
                    </h2>
                    <p className="truncate text-xs text-ink-faint">
                      {step === 'filter' ? '步驟 1／2：設定要列入報表的案件' : '步驟 2／2：確認內容後下載或列印'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="關閉"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 步驟指示 */}
              <div className="print-hide flex shrink-0 gap-1.5 px-5 pt-3 sm:px-6">
                {(['filter', 'preview'] as Step[]).map((s) => (
                  <span
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      s === 'filter' || step === 'preview' ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {step === 'filter' ? (
                <>
                  <div className="print-hide flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                        承辦人
                        <span className="ml-1 font-normal text-ink-faint">留空代表全部</span>
                      </label>
                      <input
                        value={filters.officer}
                        onChange={(e) => setFilters((f) => ({ ...f, officer: e.target.value }))}
                        placeholder="輸入承辦人姓名"
                        list="report-officer-options"
                        autoComplete="off"
                        className={fieldClass}
                      />
                      {/* 目前資料裡出現過的承辦人，可直接點選，不用整個名字打完 */}
                      <datalist id="report-officer-options">
                        {officerChoices.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                      {officerChoices.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {officerChoices.map((o) => (
                            <button
                              key={o}
                              type="button"
                              onClick={() =>
                                setFilters((f) => ({ ...f, officer: f.officer.trim() === o ? '' : o }))
                              }
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                                filters.officer.trim() === o
                                  ? 'border-primary bg-blue-50 text-primary'
                                  : 'border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
                              }`}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink-soft">
                        流程階段
                        <span className="ml-1 font-normal text-ink-faint">不選代表全部</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                        {ALL_FILTER_STAGES.map((stage) => {
                          const active = filters.stages.includes(stage)
                          return (
                            <motion.button
                              key={stage}
                              onClick={() => toggleStage(stage)}
                              whileTap={{ scale: 0.96 }}
                              className={`relative rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-colors duration-200 sm:text-xs ${
                                active ? 'text-white' : 'text-ink-soft hover:text-ink'
                              }`}
                            >
                              <span
                                className={`absolute inset-0 rounded-xl transition-colors duration-200 ${
                                  active
                                    ? 'bg-primary shadow-[0_2px_10px_-2px_rgba(37,99,235,0.55)]'
                                    : 'bg-slate-50 hover:bg-slate-100'
                                }`}
                              />
                              <span className="relative z-10 truncate">{STAGE_CONFIG[stage].label}</span>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 步驟一底部：即時顯示筆數，並前往預覽 */}
                  <div className="print-hide shrink-0 border-t border-slate-100 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs text-ink-soft">
                        符合條件 <span className="text-sm font-bold text-ink">{filteredCases.length}</span>
                        <span className="text-ink-faint"> / {cases.length} 筆</span>
                      </p>
                      <button
                        onClick={() => setFilters(EMPTY_REPORT_FILTERS)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                      >
                        <RotateCcw size={12} />
                        清除條件
                      </button>
                    </div>
                    <button
                      onClick={() => setStep('preview')}
                      disabled={filteredCases.length === 0}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
                    >
                      {filteredCases.length === 0 ? '查無符合條件的案件' : '下一步：檢視報表'}
                      {filteredCases.length > 0 && <ArrowRight size={16} />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="print-scroll flex-1 overflow-y-auto">
                    {/* 統整結果：手機上也讀得清楚，不必依賴縮小後的 A4 版面 */}
                    <div className="print-hide px-5 py-5 sm:px-6">
                      <p className="mb-3 text-xs font-medium text-ink-soft">{describeFilters(filters)}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {summaryTiles.map((tile) => (
                          <div
                            key={tile.label}
                            className={`rounded-xl px-3 py-2.5 ${tile.accent ? 'bg-blue-50' : 'bg-slate-50'}`}
                          >
                            <p className="text-[11px] text-ink-faint">{tile.label}</p>
                            <p
                              className={`mt-0.5 text-lg font-bold tabular-nums ${
                                tile.accent ? 'text-primary' : 'text-ink'
                              }`}
                            >
                              {tile.value}
                              {tile.unit && <span className="ml-0.5 text-xs font-semibold">{tile.unit}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="print-hide px-5 pb-1 sm:px-6">
                      <p className="text-xs font-semibold text-ink-soft">版面預覽</p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">以下為實際列印/下載的 A4 橫式版面</p>
                    </div>

                    {/* 等比縮小的 A4 版面；下載時仍以原始尺寸輸出 */}
                    <div className="print-scroll px-5 py-3 sm:px-6">
                      <div
                        ref={frameRef}
                        className="report-frame overflow-hidden"
                        style={{ height: naturalHeight ? naturalHeight * scale : undefined }}
                      >
                        <div
                          className="report-scaler origin-top-left"
                          style={{ transform: `scale(${scale})`, width: SHEET_WIDTH_PX }}
                        >
                          <div ref={previewRef}>
                            <PrintableReport cases={filteredCases} filters={filters} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 步驟二底部：返回與輸出 */}
                  <div className="print-hide shrink-0 space-y-2.5 border-t border-slate-100 px-5 py-4 sm:px-6">
                    {downloadError && (
                      <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{downloadError}</p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row-reverse">
                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {downloading ? '產生中...' : '下載此 PDF 檔'}
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:border-primary hover:text-primary sm:flex-1"
                      >
                        <Printer size={16} />
                        列印
                      </button>
                      <button
                        onClick={() => setStep('filter')}
                        className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink sm:flex-none sm:px-4"
                      >
                        <ArrowLeft size={16} />
                        重新篩選
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
