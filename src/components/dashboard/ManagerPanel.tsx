import { AlertOctagon, CheckCircle2, Clock, FilePlus2, Timer, Wallet } from 'lucide-react'
import DashboardCard from './DashboardCard'
import StageDistributionChart from '../charts/StageDistributionChart'
import MonthlyVolumeChart from '../charts/MonthlyVolumeChart'
import DailyCompletionChart from '../charts/DailyCompletionChart'
import { getDailyCompletionSeries, getManagerMetrics, getMonthlyNewCaseSeries } from '../../utils/metrics'
import { formatCurrencyCompact } from '../../utils/format'
import { getToday } from '../../utils/today'
import type { LoanCase } from '../../types'

interface ManagerPanelProps {
  cases: LoanCase[]
}

export default function ManagerPanel({ cases }: ManagerPanelProps) {
  const today = getToday()
  const m = getManagerMetrics(cases, today)
  const monthlySeries = getMonthlyNewCaseSeries(cases, today)
  const dailySeries = getDailyCompletionSeries(cases, today)

  const metrics = [
    { label: '今日新增案件', value: `${m.newToday} 件`, icon: FilePlus2, tint: 'primary' as const },
    { label: '今日完成案件', value: `${m.completedToday} 件`, icon: CheckCircle2, tint: 'success' as const },
    { label: '今日撥款金額', value: formatCurrencyCompact(m.disbursedAmountToday), icon: Wallet, tint: 'success' as const },
    { label: '目前待批示案件', value: `${m.pendingApproval} 件`, icon: Clock, tint: 'warning' as const },
    { label: '目前卡件案件', value: `${m.stuckCases} 件`, icon: AlertOctagon, tint: 'danger' as const, helper: '超過 7 天未更新' },
    { label: '平均處理天數', value: `${m.avgProcessingDays} 天`, icon: Timer, tint: 'slate' as const },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-ink">主管報表</h2>
        <p className="mt-1 text-sm text-ink-faint">全行放款案件即時營運指標</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, i) => (
          <DashboardCard key={metric.label} {...metric} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <StageDistributionChart cases={cases} />
        <MonthlyVolumeChart data={monthlySeries} />
        <div className="xl:col-span-2">
          <DailyCompletionChart data={dailySeries} />
        </div>
      </div>
    </div>
  )
}
