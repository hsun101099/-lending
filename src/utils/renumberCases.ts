import { isLegacyCaseId } from './caseId'
import type { LoanCase } from '../types'

export interface Renumbering {
  /** 舊編號 → 新編號 */
  moves: { from: string; to: string }[]
  /** 重新編號後最大的號碼，用來校正發號計數器 */
  nextCounter: number
}

/**
 * 早期建立的案件是 LN-2026-1001 這種編號，後來改成單純的流水號。
 * 只要還有舊格式的編號存在，就把全部案件依建立時間重新編成 1、2、3……
 * 之後編號固定不變，即使有案件被永久刪除也不會再重編。
 */
export function needsRenumber(cases: LoanCase[]): boolean {
  return cases.some((c) => isLegacyCaseId(c.id))
}

function timeOrder(a: LoanCase, b: LoanCase): number {
  if (a.createdDate !== b.createdDate) return a.createdDate < b.createdDate ? -1 : 1
  // 同一天建立時，沿用原本的先後：舊格式的比較早，其餘依號碼大小
  const aLegacy = isLegacyCaseId(a.id)
  const bLegacy = isLegacyCaseId(b.id)
  if (aLegacy !== bLegacy) return aLegacy ? -1 : 1
  const aNum = Number(a.id.match(/(\d+)\s*$/)?.[1] ?? 0)
  const bNum = Number(b.id.match(/(\d+)\s*$/)?.[1] ?? 0)
  return aNum - bNum
}

/** 依建立時間由舊到新，重新編成 1、2、3……。 */
export function planRenumber(cases: LoanCase[]): Renumbering {
  const ordered = [...cases].sort(timeOrder)
  const moves = ordered.map((c, i) => ({ from: c.id, to: String(i + 1) }))
  return { moves, nextCounter: ordered.length }
}
