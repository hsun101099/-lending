/**
 * 案件編號的排序規則。
 *
 * 編號已改為單純的流水號（1、2、3……），但早期建立的案件是
 * LN-2026-1001 這種格式。舊案件都比新編號的案件更早建立，
 * 因此排在後面，同一類之中則以數字大小由新到舊。
 */
export function isLegacyCaseId(id: string): boolean {
  return !/^\d+$/.test(id)
}

function numericPart(id: string): number {
  const match = id.match(/(\d+)\s*$/)
  return match ? Number(match[1]) : 0
}

/** 由新到舊排序用的比較函式。 */
export function compareCaseIdDesc(a: string, b: string): number {
  const aLegacy = isLegacyCaseId(a)
  const bLegacy = isLegacyCaseId(b)
  if (aLegacy !== bLegacy) return aLegacy ? 1 : -1
  const diff = numericPart(b) - numericPart(a)
  return diff !== 0 ? diff : b.localeCompare(a)
}
