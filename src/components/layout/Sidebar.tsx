import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Landmark,
} from 'lucide-react'
import type { ViewMode } from '../../App'

interface SidebarProps {
  view: ViewMode
  onChangeView: (view: ViewMode) => void
}

const NAV_ITEMS: { key: ViewMode | null; label: string; icon: typeof LayoutDashboard; enabled: boolean }[] = [
  { key: 'dashboard', label: '案件總覽', icon: LayoutDashboard, enabled: true },
  { key: null, label: '案件管理', icon: FileText, enabled: false },
  { key: null, label: '客戶資料', icon: Users, enabled: false },
  { key: 'manager', label: '主管報表', icon: BarChart3, enabled: true },
]

export default function Sidebar({ view, onChangeView }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-card">
          <Landmark size={18} strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-ink">放款流程管理</p>
          <p className="text-[11px] text-ink-faint">Loan Workflow Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.key !== null && item.key === view
          return (
            <button
              key={item.label}
              disabled={!item.enabled}
              onClick={() => item.key && onChangeView(item.key)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-blue-50 text-primary'
                  : item.enabled
                    ? 'text-ink-soft hover:bg-slate-50 hover:text-ink'
                    : 'cursor-not-allowed text-ink-faint/60'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              {item.label}
              {!item.enabled && (
                <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">
                  即將推出
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          disabled
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-faint/60"
        >
          <Settings size={18} />
          系統設定
        </button>
      </div>
    </aside>
  )
}
