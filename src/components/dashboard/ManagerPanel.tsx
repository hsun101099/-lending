import { useMemo, useState } from 'react'
import {
  AlertOctagon,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FilePlus2,
  ListChecks,
  PackageOpen,
  Timer,
  Wallet,
} from 'lucide-react'
import DashboardCard from './DashboardCard'
import StageOverview from './StageOverview'
import StageDistributionChart from '../charts/StageDistributionChart'
import MonthlyVolumeChart from '../charts/MonthlyVolumeChart'
import DailyCompletionChart from '../charts/DailyCompletionChart'
import LoanTable from '../table/LoanTable'
import SearchBar from '../table/SearchBar'
import { getDailyCompletionSeries, getManagerMetrics, getMonthlyNewCaseSeries, getSummaryCounts } from '../../utils/metrics'
import { formatCurrencyCompact } from '../../utils/format'
import { getToday } from '../../utils/today'
import type { LoanCase } from '../../types'

interface ManagerPanelProps {
  cases: LoanCase[]
  onSelectCase: (loanCase: LoanCase) => void
  onDeleteCase: (loanCase: LoanCase) => void
  onAddCase: () => void
}

export default function ManagerPanel({ cases, onSelectCase, onDeleteCase, onAddCase }: ManagerPanelProps) {
  const [search, setSearch] = useState('')
  const today = getToday()
  const summary = getSummaryCounts(cases)
  const m = getManagerMetrics(cases, today)
  const monthlySeries = getMonthlyNewCaseSeries(cases, today)
  const dailySeries = getDailyCompletionSeries(cases, today)

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cases
    return cases.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.officer.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        String(c.loanAmount).includes(q)
    )
  }, [cases, search])

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="目前案件" value={`${summary.total} 件`} icon={ListChecks} tint="primary" index={0} />
        <DashboardCard label="處理中" value={`${summary.processing} 件`} icon={Timer} tint="warning" index={1} />
        <DashboardCard label="已完成" value={`${summary.completed} 件`} icon={CircleDollarSign} tint="success" index={2} />
        <DashboardCard label="撤件" value={`${summary.withdrawn} 件`} icon={PackageOpen} tint="danger" index={3} />
      </div>

      <StageOverview cases={cases} />

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

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-ink">案件列表</h3>
            <p className="mt-0.5 text-xs text-ink-faint">點擊案件可查看完整詳細資訊</p>
          </div>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <LoanTable
          cases={filteredCases}
          onSelect={onSelectCase}
          hasAnyCases={cases.length > 0}
          onDelete={onDeleteCase}
          onAddCase={onAddCase}
        />
      </div>
    </div>
  )
}
