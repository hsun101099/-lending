import { useMemo, useState } from 'react'
import { CircleDollarSign, ListChecks, PackageOpen, Timer } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import DashboardCard from './components/dashboard/DashboardCard'
import StageOverview from './components/dashboard/StageOverview'
import ManagerPanel from './components/dashboard/ManagerPanel'
import SearchBar from './components/table/SearchBar'
import FilterTabs, { type FilterValue } from './components/table/FilterTabs'
import LoanTable from './components/table/LoanTable'
import CaseDrawer from './components/drawer/CaseDrawer'
import { LOAN_CASES } from './data/mockData'
import { ALL_FILTER_STAGES } from './data/stages'
import { getSummaryCounts } from './utils/metrics'
import { advanceStage, withdrawCase } from './utils/caseActions'
import type { LoanCase } from './types'

export type ViewMode = 'dashboard' | 'manager'

function App() {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [cases, setCases] = useState<LoanCase[]>(LOAN_CASES)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')

  const summary = useMemo(() => getSummaryCounts(cases), [cases])

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cases.filter((c) => {
      const matchesFilter = filter === 'all' || c.currentStage === filter
      if (!matchesFilter) return false
      if (!q) return true
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.officer.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        String(c.loanAmount).includes(q)
      )
    })
  }, [cases, search, filter])

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cases.length }
    ALL_FILTER_STAGES.forEach((s) => {
      counts[s] = cases.filter((c) => c.currentStage === s).length
    })
    return counts
  }, [cases])

  const selectedCase = cases.find((c) => c.id === selectedId) ?? null

  function handleAdvanceStage(id: string) {
    setCases((prev) => prev.map((c) => (c.id === id ? advanceStage(c) : c)))
  }

  function handleWithdraw(id: string) {
    setCases((prev) => prev.map((c) => (c.id === id ? withdrawCase(c) : c)))
  }

  function handleUpdateRemarks(id: string, remarks: string) {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, remarks } : c)))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg text-ink">
      <Sidebar view={view} onChangeView={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="銀行放款流程管理系統"
          subtitle={view === 'dashboard' ? '案件總覽 Dashboard' : '主管報表 Manager Dashboard'}
        />

        <div className="flex gap-2 border-b border-slate-200/70 bg-white px-4 py-2.5 sm:px-6 lg:hidden">
          <button
            onClick={() => setView('dashboard')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
              view === 'dashboard' ? 'bg-blue-50 text-primary' : 'text-ink-soft'
            }`}
          >
            案件總覽
          </button>
          <button
            onClick={() => setView('manager')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
              view === 'manager' ? 'bg-blue-50 text-primary' : 'text-ink-soft'
            }`}
          >
            主管報表
          </button>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {view === 'dashboard' ? (
            <div className="mx-auto max-w-7xl space-y-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardCard label="目前案件" value={`${summary.total} 件`} icon={ListChecks} tint="primary" index={0} />
                <DashboardCard label="處理中" value={`${summary.processing} 件`} icon={Timer} tint="warning" index={1} />
                <DashboardCard label="已完成" value={`${summary.completed} 件`} icon={CircleDollarSign} tint="success" index={2} />
                <DashboardCard label="撤件" value={`${summary.withdrawn} 件`} icon={PackageOpen} tint="danger" index={3} />
              </div>

              <StageOverview cases={cases} />

              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-ink">案件列表</h2>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      顯示 {filteredCases.length} / {cases.length} 筆案件
                    </p>
                  </div>
                  <SearchBar value={search} onChange={setSearch} />
                </div>
                <div className="mb-4">
                  <FilterTabs value={filter} onChange={setFilter} counts={filterCounts} />
                </div>
                <LoanTable cases={filteredCases} onSelect={(c) => setSelectedId(c.id)} />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl">
              <ManagerPanel cases={cases} />
            </div>
          )}
        </main>
      </div>

      <CaseDrawer
        loanCase={selectedCase}
        onClose={() => setSelectedId(null)}
        onAdvanceStage={handleAdvanceStage}
        onWithdraw={handleWithdraw}
        onUpdateRemarks={handleUpdateRemarks}
      />
    </div>
  )
}

export default App
