import type { LoanCase } from '../types'

export function generateNextCaseId(existing: LoanCase[]): string {
  const year = new Date().getFullYear()
  const prefix = `LN-${year}-`
  const maxSeq = existing.reduce((max, c) => {
    if (!c.id.startsWith(prefix)) return max
    const seq = Number(c.id.slice(prefix.length))
    return Number.isFinite(seq) && seq > max ? seq : max
  }, 1000)
  return `${prefix}${maxSeq + 1}`
}
