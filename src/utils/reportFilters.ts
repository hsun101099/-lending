import { STAGE_CONFIG } from '../data/stages'
import { formatDate, formatWan, wanToNt } from './format'
import type { LoanCase, StageKey } from '../types'

export interface ReportFilters {
  /** 建立日期起（含），空字串代表不限 */
  dateFrom: string
  /** 建立日期迄（含），空字串代表不限 */
  dateTo: string
  /** 勾選的流程階段，空陣列代表全部 */
  stages: StageKey[]
  /** 受理人姓名（可只輸入其中幾個字），空字串代表全部 */
  officer: string
  /** 勾選的類別，空陣列代表全部 */
  categories: string[]
  /** 勾選的貸款種類，空陣列代表全部 */
  loanTypes: string[]
  /** 貸款金額下限（萬），空字串代表不限 */
  amountFromWan: string
  /** 貸款金額上限（萬），空字串代表不限 */
  amountToWan: string
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  dateFrom: '',
  dateTo: '',
  stages: [],
  officer: '',
  categories: [],
  loanTypes: [],
  amountFromWan: '',
  amountToWan: '',
}

/** 最近 N 天的快速選擇，回傳可直接套用的日期區間。 */
export function recentDaysRange(days: number, today = new Date()): { dateFrom: string; dateTo: string } {
  const end = new Date(today)
  const start = new Date(today)
  // 含今天在內共 days 天
  start.setDate(start.getDate() - (days - 1))
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { dateFrom: iso(start), dateTo: iso(end) }
}

export function applyReportFilters(cases: LoanCase[], filters: ReportFilters): LoanCase[] {
  // 受理人是自由輸入，因此以「包含」比對：打「王」也找得到「王先生」
  const officer = filters.officer.trim().toLowerCase()
  const from = filters.amountFromWan.trim() === '' ? null : wanToNt(Number(filters.amountFromWan))
  const to = filters.amountToWan.trim() === '' ? null : wanToNt(Number(filters.amountToWan))

  return cases.filter((c) => {
    // ISO 日期字串（YYYY-MM-DD）可直接以字典序比較大小
    if (filters.dateFrom && c.createdDate < filters.dateFrom) return false
    if (filters.dateTo && c.createdDate > filters.dateTo) return false
    if (filters.stages.length > 0 && !filters.stages.includes(c.currentStage)) return false
    if (officer && !c.officer.toLowerCase().includes(officer)) return false
    if (filters.categories.length > 0 && !filters.categories.includes(c.category ?? '')) return false
    if (filters.loanTypes.length > 0 && !filters.loanTypes.includes(c.loanType)) return false
    if (from !== null && Number.isFinite(from) && c.loanAmount < from) return false
    if (to !== null && Number.isFinite(to) && c.loanAmount > to) return false
    return true
  })
}

/** 產生列印表頭要顯示的篩選條件說明。 */
export function describeFilters(filters: ReportFilters): string {
  const parts: string[] = []

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? formatDate(filters.dateFrom) : '不限'
    const to = filters.dateTo ? formatDate(filters.dateTo) : '不限'
    parts.push(`建立日期：${from} ~ ${to}`)
  }
  if (filters.stages.length > 0) {
    parts.push(`流程階段：${filters.stages.map((s) => STAGE_CONFIG[s].label).join('、')}`)
  }
  if (filters.officer.trim()) {
    parts.push(`受理人：${filters.officer.trim()}`)
  }
  if (filters.categories.length > 0) {
    parts.push(`類別：${filters.categories.join('、')}`)
  }
  if (filters.loanTypes.length > 0) {
    parts.push(`貸款種類：${filters.loanTypes.join('、')}`)
  }
  if (filters.amountFromWan.trim() || filters.amountToWan.trim()) {
    const from = filters.amountFromWan.trim() ? formatWan(wanToNt(Number(filters.amountFromWan))) : '不限'
    const to = filters.amountToWan.trim() ? formatWan(wanToNt(Number(filters.amountToWan))) : '不限'
    parts.push(`貸款金額：${from} ~ ${to}`)
  }

  return parts.length > 0 ? parts.join('　｜　') : '篩選條件：全部案件'
}

/** 目前套用了幾項條件，讓畫面上可以提示「已套用 N 項」。 */
export function countActiveFilters(filters: ReportFilters): number {
  return [
    filters.dateFrom || filters.dateTo,
    filters.stages.length > 0,
    filters.officer.trim(),
    filters.categories.length > 0,
    filters.loanTypes.length > 0,
    filters.amountFromWan.trim() || filters.amountToWan.trim(),
  ].filter(Boolean).length
}
