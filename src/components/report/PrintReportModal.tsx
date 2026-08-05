import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import { CATEGORY_OPTIONS } from '../../data/categories'
import { LOAN_TYPE_OPTIONS } from '../../data/loanTypes'
import {
  applyReportFilters,
  countActiveFilters,
  describeFilters,
  EMPTY_REPORT_FILTERS,
  recentDaysRange,
  type ReportFilters,
} from '../../utils/reportFilters'
import { getSummaryCounts } from '../../utils/metrics'
import { formatWan } from '../../utils/format'
import { isOverdue } from '../table/LoanTable'
import PrintableReport from './PrintableReport'
import { downloadReportPdf } from '../../utils/downloadReportPdf'
import type { LoanCase, StageKey } from '../../types'

/** A4 橫式扣掉邊界後的內容寬度（273mm 換算為 96dpi 像素） */
const SHEET_WIDTH_PX = 1032
/** 手機縮到符合寬度會小到看不清楚，預設至少放大到這個比例，改以左右滑動查看 */
const MIN_READABLE_SCALE = 0.85
const MAX_SCALE = 1.6
const ZOOM_STEP = 0.15
/** 常用的天數區間 */
const RECENT_DAY_OPTIONS = [7, 30, 90, 180]

function isRecentRange(filters: ReportFilters, days: number): boolean {
  const range = recentDaysRange(days)
  return filters.dateFrom === range.dateFrom && filters.dateTo === range.dateTo
}

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
  const scrollRef = useRef<HTMLDivElement>(null)
  const zoomInitialised = useRef(false)
  const [fitScale, setFitScale] = useState(1)
  /** null 代表「符合寬度」，其他數字為使用者自行調整的顯示比例 */
  const [zoom, setZoom] = useState<number | null>(null)
  const [naturalHeight, setNaturalHeight] = useState(0)

  const scale = zoom ?? fitScale
  const isScrollable = scale > fitScale + 0.001

  const filteredCases = useMemo(() => applyReportFilters(cases, filters), [cases, filters])
  const activeFilterCount = countActiveFilters(filters)
  const summary = getSummaryCounts(filteredCases)
  const totalAmount = filteredCases.reduce((sum, c) => sum + c.loanAmount, 0)
  const overdueCount = filteredCases.filter(isOverdue).length

  // 受理人為自由輸入，選單直接取自實際資料，只列出真的存在的受理人
  const officerChoices = useMemo(
    () => Array.from(new Set(cases.map((c) => c.officer).filter(Boolean))).sort(),
    [cases]
  )

  // 先量出「剛好塞滿寬度」的比例，再據以決定預設顯示比例
  useEffect(() => {
    if (!open || step !== 'preview') {
      zoomInitialised.current = false
      return
    }
    const box = scrollRef.current
    if (!box) return
    const update = () => {
      const fit = Math.min(1, box.clientWidth / SHEET_WIDTH_PX)
      setFitScale(fit)
      // 量到寬度之後才決定預設值，且只決定一次，之後交給使用者自行調整
      if (!zoomInitialised.current) {
        zoomInitialised.current = true
        setZoom(fit < MIN_READABLE_SCALE ? MIN_READABLE_SCALE : null)
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(box)
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
      setDownloadError(e instanceof Error ? e.message : '產生 PDF 失敗，請稍後再試')
    } finally {
      setDownloading(false)
    }
  }

  /** 類別、貸款種類這類多選條件：點一下加入，再點一下移除。 */
  function toggleValue(key: 'categories' | 'loanTypes', value: string) {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }))
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
                      {step === 'filter' ? '步驟 1／2：設定要列入報表的案件' : '步驟 2／2：確認內容後下載 PDF'}
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
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink-soft">
                        建立日期
                        <span className="ml-1 font-normal text-ink-faint">可直接選最近幾天</span>
                      </label>
                      {/* 常用的天數區間，按一下就套用，不用自己算日期 */}
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {RECENT_DAY_OPTIONS.map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, ...recentDaysRange(days) }))}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 ${
                              isRecentRange(filters, days)
                                ? 'border-primary bg-blue-50 text-primary'
                                : 'border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
                            }`}
                          >
                            最近 {days} 天
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }))}
                          className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-colors duration-150 hover:border-primary hover:text-primary"
                        >
                          不限日期
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                          aria-label="建立日期（起）"
                          className={fieldClass}
                        />
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                          aria-label="建立日期（迄）"
                          className={fieldClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink-soft">
                        貸款金額（萬）
                        <span className="ml-1 font-normal text-ink-faint">留空代表不限</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={filters.amountFromWan}
                          onChange={(e) => setFilters((f) => ({ ...f, amountFromWan: e.target.value }))}
                          placeholder="最低"
                          aria-label="貸款金額下限（萬）"
                          className={fieldClass}
                        />
                        <span className="shrink-0 text-xs text-ink-faint">~</span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={filters.amountToWan}
                          onChange={(e) => setFilters((f) => ({ ...f, amountToWan: e.target.value }))}
                          placeholder="最高"
                          aria-label="貸款金額上限（萬）"
                          className={fieldClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink-soft">
                        類別
                        <span className="ml-1 font-normal text-ink-faint">不選代表全部</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_OPTIONS.map((category) => {
                          const active = filters.categories.includes(category)
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => toggleValue('categories', category)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                                active
                                  ? 'border-primary bg-blue-50 text-primary'
                                  : 'border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
                              }`}
                            >
                              {category}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-ink-soft">
                        貸款種類
                        <span className="ml-1 font-normal text-ink-faint">不選代表全部</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {LOAN_TYPE_OPTIONS.map((loanType) => {
                          const active = filters.loanTypes.includes(loanType)
                          return (
                            <button
                              key={loanType}
                              type="button"
                              onClick={() => toggleValue('loanTypes', loanType)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                                active
                                  ? 'border-primary bg-blue-50 text-primary'
                                  : 'border-slate-200 text-ink-soft hover:border-primary hover:text-primary'
                              }`}
                            >
                              {loanType}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                        受理人
                        <span className="ml-1 font-normal text-ink-faint">留空代表全部</span>
                      </label>
                      <input
                        value={filters.officer}
                        onChange={(e) => setFilters((f) => ({ ...f, officer: e.target.value }))}
                        placeholder="輸入受理人姓名"
                        list="report-officer-options"
                        autoComplete="off"
                        className={fieldClass}
                      />
                      {/* 目前資料裡出現過的受理人，可直接點選，不用整個名字打完 */}
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
                        {activeFilterCount > 0 && (
                          <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            已套用 {activeFilterCount} 項條件
                          </span>
                        )}
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
                    {/* A4 橫式版面放最上面，並附上縮放控制 */}
                    <div className="print-hide flex flex-wrap items-center justify-between gap-2 px-5 pb-2 pt-4 sm:px-6">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-soft">版面預覽</p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          下載的 PDF 就是這個 A4 橫式版面
                          {isScrollable && <span className="text-primary">，可左右滑動</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-50 p-1">
                        <button
                          onClick={() => setZoom(Math.max(fitScale, scale - ZOOM_STEP))}
                          disabled={scale <= fitScale + 0.001}
                          aria-label="縮小"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint/50 disabled:hover:bg-transparent"
                        >
                          <Minus size={15} />
                        </button>
                        <span
                          aria-label="目前縮放比例"
                          className="w-11 text-center text-[11px] font-semibold tabular-nums text-ink-soft"
                        >
                          {Math.round(scale * 100)}%
                        </span>
                        <button
                          onClick={() => setZoom(Math.min(MAX_SCALE, scale + ZOOM_STEP))}
                          disabled={scale >= MAX_SCALE - 0.001}
                          aria-label="放大"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint/50 disabled:hover:bg-transparent"
                        >
                          <Plus size={15} />
                        </button>
                        <button
                          onClick={() => setZoom(null)}
                          aria-label="符合寬度"
                          title="整張放進畫面"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-white hover:text-ink"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* 等比縮放的 A4 版面；下載時仍以原始尺寸輸出 */}
                    <div className="print-scroll px-5 pb-4 sm:px-6">
                      <div ref={scrollRef} className="print-scroll overflow-x-auto">
                        <div
                          className="report-frame overflow-hidden"
                          style={{
                            width: SHEET_WIDTH_PX * scale,
                            height: naturalHeight ? naturalHeight * scale : undefined,
                          }}
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

                    {/* 統計數字改放在版面下方，往下捲即可看到 */}
                    <div className="print-hide border-t border-slate-100 px-5 py-4 sm:px-6">
                      <p className="text-xs font-semibold text-ink-soft">統計摘要</p>
                      <p className="mb-3 mt-0.5 text-[11px] text-ink-faint">{describeFilters(filters)}</p>
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
                  </div>

                  {/* 步驟二底部：返回與下載 */}
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
