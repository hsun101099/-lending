import { STAGE_CONFIG } from '../data/stages'
import { formatDate } from './format'
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
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  dateFrom: '',
  dateTo: '',
  stages: [],
  officer: '',
}

export function applyReportFilters(cases: LoanCase[], filters: ReportFilters): LoanCase[] {
  // 受理人是自由輸入，因此以「包含」比對：打「王」也找得到「王先生」
  const officer = filters.officer.trim().toLowerCase()
  return cases.filter((c) => {
    // ISO 日期字串（YYYY-MM-DD）可直接以字典序比較大小
    if (filters.dateFrom && c.createdDate < filters.dateFrom) return false
    if (filters.dateTo && c.createdDate > filters.dateTo) return false
    if (filters.stages.length > 0 && !filters.stages.includes(c.currentStage)) return false
    if (officer && !c.officer.toLowerCase().includes(officer)) return false
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

  return parts.length > 0 ? parts.join('　｜　') : '篩選條件：全部案件'
}
