import type { LoanCase } from '../types'

/**
 * 刪除案件採「先移到回收桶」的方式，避免經辦誤刪就再也救不回來。
 * 資料仍留在原本的集合，只是多了 deletedAt 標記，一般畫面與報表都會濾掉。
 */
export function isDeleted(loanCase: LoanCase): boolean {
  return !!loanCase.deletedAt
}

export interface CasePartition {
  /** 仍在辦理中的案件（一般清單、統計、報表都只看這些） */
  active: LoanCase[]
  /** 已刪除的案件，最近刪除的排在最前面 */
  deleted: LoanCase[]
}

export function partitionCases(cases: LoanCase[]): CasePartition {
  const active: LoanCase[] = []
  const deleted: LoanCase[] = []
  cases.forEach((c) => (isDeleted(c) ? deleted : active).push(c))
  deleted.sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
  return { active, deleted }
}

/** 把刪除時間顯示成「幾分鐘前」這種好讀的形式。 */
export function describeDeletedAt(deletedAt: string | undefined, now: Date = new Date()): string {
  if (!deletedAt) return ''
  const then = new Date(deletedAt)
  if (Number.isNaN(then.getTime())) return ''

  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000)
  if (minutes < 1) return '剛剛'
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return then.toLocaleDateString('zh-TW')
}
