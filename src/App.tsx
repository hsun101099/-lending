import { useEffect, useMemo, useState } from 'react'
import { CloudUpload, FilePlus2, Loader2, X } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import ManagerPanel from './components/dashboard/ManagerPanel'
import SearchBar from './components/table/SearchBar'
import FilterTabs, { type FilterValue } from './components/table/FilterTabs'
import LoanTable, { isOverdue } from './components/table/LoanTable'
import CaseDrawer from './components/drawer/CaseDrawer'
import NewCaseModal from './components/forms/NewCaseModal'
import ConfirmDialog from './components/common/ConfirmDialog'
import SetupNotice from './components/common/SetupNotice'
import LoginScreen from './components/auth/LoginScreen'
import { ALL_FILTER_STAGES } from './data/stages'
import { advanceStage, withdrawCase, type NewCaseInput } from './utils/caseActions'
import { isFirebaseConfigured } from './services/firebaseConfig'
import { logout, useAuth } from './hooks/useAuth'
import { createCase, importCases, removeCase, saveCase, subscribeToCases } from './services/caseRepository'
import type { LoanCase } from './types'

export type ViewMode = 'dashboard' | 'manager'

const LEGACY_STORAGE_KEY = 'loan-workflow-cases'
const LEGACY_DISMISSED_KEY = 'loan-workflow-legacy-dismissed'

function readLegacyCases(): LoanCase[] {
  try {
    if (localStorage.getItem(LEGACY_DISMISSED_KEY)) return []
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as LoanCase[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function App() {
  const { user, loading: authLoading } = useAuth()

  const [view, setView] = useState<ViewMode>('dashboard')
  const [cases, setCases] = useState<LoanCase[]>([])
  const [casesLoading, setCasesLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [isNewCaseOpen, setNewCaseOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<LoanCase | null>(null)
  const [legacyCases, setLegacyCases] = useState<LoanCase[]>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!user) return
    setCasesLoading(true)
    return subscribeToCases(
      (next) => {
        setCases(next)
        setCasesLoading(false)
        setLoadError('')
      },
      (error) => {
        setLoadError(`讀取案件資料失敗：${error.message}`)
        setCasesLoading(false)
      }
    )
  }, [user])

  useEffect(() => {
    if (user) setLegacyCases(readLegacyCases())
  }, [user])

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

  function reportFailure(action: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    setLoadError(`${action}失敗：${message}`)
  }

  function handleAdvanceStage(id: string) {
    const target = cases.find((c) => c.id === id)
    if (target) saveCase(advanceStage(target)).catch((e) => reportFailure('更新流程', e))
  }

  function handleWithdraw(id: string) {
    const target = cases.find((c) => c.id === id)
    if (target) saveCase(withdrawCase(target)).catch((e) => reportFailure('撤件', e))
  }

  function handleUpdateRemarks(id: string, remarks: string) {
    const target = cases.find((c) => c.id === id)
    if (target && target.remarks !== remarks) {
      saveCase({ ...target, remarks }).catch((e) => reportFailure('儲存備註', e))
    }
  }

  function handleCreateCase(input: NewCaseInput) {
    setNewCaseOpen(false)
    createCase(input).catch((e) => reportFailure('建立案件', e))
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return
    const { id } = pendingDelete
    if (selectedId === id) setSelectedId(null)
    setPendingDelete(null)
    removeCase(id).catch((e) => reportFailure('刪除案件', e))
  }

  async function handleImportLegacy() {
    setImporting(true)
    try {
      await importCases(legacyCases)
      localStorage.setItem(LEGACY_DISMISSED_KEY, '1')
      setLegacyCases([])
    } catch (e) {
      reportFailure('匯入本機資料', e)
    } finally {
      setImporting(false)
    }
  }

  function handleDismissLegacy() {
    localStorage.setItem(LEGACY_DISMISSED_KEY, '1')
    setLegacyCases([])
  }

  if (!isFirebaseConfigured) return <SetupNotice />

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <Loader2 size={22} className="animate-spin text-ink-faint" />
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg text-ink">
      <Sidebar view={view} onChangeView={setView} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="銀行放款流程管理系統"
          subtitle={view === 'dashboard' ? '案件列表與登打' : '主管報表 Manager Dashboard'}
          overdueCount={overdueCount}
          userEmail={user.email ?? ''}
          onLogout={() => logout()}
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
          <div className="mx-auto max-w-7xl space-y-6">
            {loadError && (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm text-danger">{loadError}</p>
                <button onClick={() => setLoadError('')} className="shrink-0 text-danger/70 hover:text-danger">
                  <X size={16} />
                </button>
              </div>
            )}

            {legacyCases.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <CloudUpload size={18} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-ink">發現 {legacyCases.length} 筆存在這台電腦的舊資料</p>
                    <p className="mt-0.5 text-xs text-ink-soft">要把它們搬到雲端嗎？搬移後所有同仁都看得到。</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={handleDismissLegacy}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors duration-150 hover:bg-slate-50"
                  >
                    不用了
                  </button>
                  <button
                    onClick={handleImportLegacy}
                    disabled={importing}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:bg-slate-300"
                  >
                    {importing && <Loader2 size={12} className="animate-spin" />}
                    {importing ? '匯入中...' : '匯入雲端'}
                  </button>
                </div>
              </div>
            )}

            {casesLoading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-faint">
                <Loader2 size={16} className="animate-spin" />
                載入案件資料中...
              </div>
            ) : view === 'dashboard' ? (
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
            ) : (
              <ManagerPanel
                cases={cases}
                onSelectCase={(c) => setSelectedId(c.id)}
                onDeleteCase={setPendingDelete}
                onAddCase={() => setNewCaseOpen(true)}
              />
            )}
          </div>
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
            ? `確定要刪除「${pendingDelete.customerName}」（${pendingDelete.id}）嗎？此操作無法復原，且所有同仁都會看不到這筆案件。`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default App
