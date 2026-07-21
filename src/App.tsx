import { useEffect, useMemo, useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ManagerPanel from './components/dashboard/ManagerPanel'
import SearchBar from './components/table/SearchBar'
import FilterTabs, { type FilterValue } from './components/table/FilterTabs'
import LoanTable, { isOverdue } from './components/table/LoanTable'
import CaseDrawer from './components/drawer/CaseDrawer'
import NewCaseModal from './components/forms/NewCaseModal'
import ConfirmDialog from './components/common/ConfirmDialog'
import { ALL_FILTER_STAGES } from './data/stages'
import { advanceStage, createCase, withdrawCase, type NewCaseInput } from './utils/caseActions'
import type { LoanCase } from './types'

export type ViewMode = 'dashboard' | 'manager'

const STORAGE_KEY = 'loan-workflow-cases'

function loadStoredCases(): LoanCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LoanCase[]) : []
  } catch {
    return []
  }
}

function App() {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [cases, setCases] = useState<LoanCase[]>(loadStoredCases)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [isNewCaseOpen, setNewCaseOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LoanCase | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  }, [cases])

  const overdueCount = useMemo(() => cases.filter(isOverdue).length, [cases])

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

  function handleCreateCase(input: NewCaseInput) {
    setCases((prev) => [createCase(input, prev), ...prev])
    setNewCaseOpen(false)
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return
    setCases((prev) => prev.filter((c) => c.id !== pendingDelete.id))
    if (selectedId === pendingDelete.id) setSelectedId(null)
    setPendingDelete(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg text-ink">
      <Sidebar view={view} onChangeView={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="銀行放款流程管理系統"
          subtitle={view === 'dashboard' ? '案件列表與登打' : '主管報表 Manager Dashboard'}
          overdueCount={overdueCount}
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
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-ink">案件列表</h2>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      顯示 {filteredCases.length} / {cases.length} 筆案件
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <SearchBar value={search} onChange={setSearch} />
                    <button
                      onClick={() => setNewCaseOpen(true)}
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
                    >
                      <FilePlus2 size={16} />
                      新增案件
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <FilterTabs value={filter} onChange={setFilter} counts={filterCounts} />
                </div>
                <LoanTable
                  cases={filteredCases}
                  onSelect={(c) => setSelectedId(c.id)}
                  hasAnyCases={cases.length > 0}
                  onAddCase={() => setNewCaseOpen(true)}
                  onDelete={setPendingDelete}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl">
              <ManagerPanel
                cases={cases}
                onSelectCase={(c) => setSelectedId(c.id)}
                onDeleteCase={setPendingDelete}
                onAddCase={() => setNewCaseOpen(true)}
              />
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
        onDelete={setPendingDelete}
      />

      <NewCaseModal open={isNewCaseOpen} onClose={() => setNewCaseOpen(false)} onCreate={handleCreateCase} />

      <ConfirmDialog
        open={!!pendingDelete}
        title="刪除案件"
        message={
          pendingDelete
            ? `確定要刪除「${pendingDelete.customerName}」（${pendingDelete.id}）嗎？此操作無法復原。`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default App
