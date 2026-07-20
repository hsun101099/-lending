import type { LoanCase } from '../types'
import { isOverdue } from '../components/table/LoanTable'
import { daysSince } from './format'

export function getSummaryCounts(cases: LoanCase[]) {
  const total = cases.length
  const completed = cases.filter((c) => c.currentStage === 'disbursement').length
  const withdrawn = cases.filter((c) => c.currentStage === 'withdrawn').length
  const processing = total - completed - withdrawn
  return { total, processing, completed, withdrawn }
}

export function getManagerMetrics(cases: LoanCase[], now: Date) {
  const todayIso = now.toISOString().slice(0, 10)

  const newToday = cases.filter((c) => c.createdDate === todayIso).length

  const disbursedToday = cases.filter(
    (c) => c.currentStage === 'disbursement' && c.lastUpdated === todayIso
  )
  const completedToday = disbursedToday.length
  const disbursedAmountToday = disbursedToday.reduce((sum, c) => sum + c.loanAmount, 0)

  const pendingApproval = cases.filter((c) => c.currentStage === 'approval').length
  const stuckCases = cases.filter(isOverdue).length

  const completedCases = cases.filter((c) => c.currentStage === 'disbursement')
  const avgProcessingDays =
    completedCases.length > 0
      ? Math.round(
          (completedCases.reduce((sum, c) => sum + daysSince(c.createdDate, new Date(`${c.lastUpdated}T00:00:00`)), 0) /
            completedCases.length) *
            10
        ) / 10
      : 0

  return { newToday, completedToday, disbursedAmountToday, pendingApproval, stuckCases, avgProcessingDays }
}

export function getMonthlyNewCaseSeries(cases: LoanCase[], now: Date) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInView = now.getDate()
  const buckets = new Map<string, number>()

  for (let d = 1; d <= daysInView; d++) {
    const key = String(d).padStart(2, '0')
    buckets.set(key, 0)
  }

  cases.forEach((c) => {
    const created = new Date(`${c.createdDate}T00:00:00`)
    if (created.getFullYear() === year && created.getMonth() === month) {
      const key = String(created.getDate()).padStart(2, '0')
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
  })

  return Array.from(buckets.entries()).map(([day, count]) => ({ day: `${month + 1}/${day}`, count }))
}

export function getDailyCompletionSeries(cases: LoanCase[], now: Date, days = 14) {
  const buckets: { key: string; label: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 })
  }
  const map = new Map(buckets.map((b) => [b.key, b]))

  cases
    .filter((c) => c.currentStage === 'disbursement')
    .forEach((c) => {
      const bucket = map.get(c.lastUpdated)
      if (bucket) bucket.count += 1
    })

  return buckets.map(({ label, count }) => ({ label, count }))
}
