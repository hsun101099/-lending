import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../data/stages'
import { compareCaseIdDesc } from './caseId'
import { formatDate, formatWan, wanToNt } from './format'
import type { LoanCase, StageKey } from '../types'

/** 報表可以依哪些欄位排序。 */
export type ReportSortKey = 'id' | 'amount' | 'createdDate' | 'officer' | 'stage' | 'category' | 'loanType'

/** asc＝由小到大（金額少到多、日期舊到新），desc 反之。 */
export type SortDirection = 'asc' | 'desc'

/** 排序選項與兩個方向各自的說法，讓畫面直接顯示「金額（多到少）」這種好懂的字。 */
export const SORT_OPTIONS: { key: ReportSortKey; label: string; asc: string; desc: string }[] = [
  { key: 'id', label: '案件編號', asc: '小到大', desc: '大到小' },
  { key: 'amount', label: '貸款金額', asc: '少到多', desc: '多到少' },
  { key: 'createdDate', label: '建立日期', asc: '舊到新', desc: '新到舊' },
  { key: 'stage', label: '目前流程', asc: '前段到後段', desc: '後段到前段' },
  { key: 'category', label: '類別', asc: '順向', desc: '反向' },
  { key: 'loanType', label: '貸款種類', asc: '順向', desc: '反向' },
  { key: 'officer', label: '受理人', asc: '順向', desc: '反向' },
]

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
  /** 依哪個欄位排序 */
  sortKey: ReportSortKey
  /** 排序方向 */
  sortDir: SortDirection
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
  // 報表預設照案件編號 1、2、3 由小到大印，翻頁時最好對照
  sortKey: 'id',
  sortDir: 'asc',
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

/**
 * 依指定欄位排序，回傳新陣列（不更動傳入的資料）。
 *
 * 兩筆資料在該欄位相同時一律再照案件編號由小到大排，
 * 這樣同樣的條件每次列印出來的順序都一致。
 */
export function sortReportCases(cases: LoanCase[], key: ReportSortKey, dir: SortDirection): LoanCase[] {
  const sign = dir === 'asc' ? 1 : -1
  // 中文字要照筆畫／注音排才符合直覺，交給瀏覽器的中文定序處理
  const text = (a: string, b: string) => (a || '').localeCompare(b || '', 'zh-Hant')
  // 編號由小到大＝既有「由新到舊」比較函式的反向
  const byId = (a: LoanCase, b: LoanCase) => -compareCaseIdDesc(a.id, b.id)

  const compare = (a: LoanCase, b: LoanCase): number => {
    switch (key) {
      case 'amount':
        return a.loanAmount - b.loanAmount
      case 'createdDate':
        // ISO 日期字串可直接以字典序比較
        return (a.createdDate || '').localeCompare(b.createdDate || '')
      case 'stage':
        return ALL_FILTER_STAGES.indexOf(a.currentStage) - ALL_FILTER_STAGES.indexOf(b.currentStage)
      case 'category':
        return text(a.category ?? '', b.category ?? '')
      case 'loanType':
        return text(a.loanType, b.loanType)
      case 'officer':
        return text(a.officer, b.officer)
      default:
        return byId(a, b)
    }
  }

  return [...cases].sort((a, b) => {
    const result = compare(a, b)
    return result !== 0 ? sign * result : byId(a, b)
  })
}

/** 目前排序方式的中文說明，例如「貸款金額（多到少）」。 */
export function describeSort(filters: ReportFilters): string {
  const option = SORT_OPTIONS.find((o) => o.key === filters.sortKey) ?? SORT_OPTIONS[0]
  return `${option.label}（${filters.sortDir === 'asc' ? option.asc : option.desc}）`
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

  // 排序方式一定要印出來，日後看到紙本才知道當初是照什麼順序排的
  parts.push(`排序：${describeSort(filters)}`)

  return parts.length > 1 ? parts.join('　｜　') : `篩選條件：全部案件　｜　${parts[0]}`
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
