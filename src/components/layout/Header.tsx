import { Bell, CalendarDays, LogOut } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  title: string
  subtitle: string
  overdueCount: number
  userEmail: string
  onLogout: () => void
}

/** 沒有顯示名稱時，用信箱前半段當作稱呼，並取前兩碼做頭像。 */
function displayNameFrom(email: string): string {
  return email.split('@')[0] || '使用者'
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export default function Header({ title, subtitle, overdueCount, userEmail, onLogout }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false)
  const name = displayNameFrom(userEmail)

  const notifications =
    overdueCount > 0
      ? [{ text: `${overdueCount} 筆案件已逾期 7 天未更新，請優先處理`, time: '即時' }]
      : []

  return (
    <header className="flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 py-4 backdrop-blur-sm lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-ink">
          <span aria-hidden>🏦</span> {title}
        </h1>
        <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3.5 py-2 text-xs font-medium text-ink-soft md:flex">
          <CalendarDays size={14} className="text-ink-faint" />
          {getTodayLabel()}
        </div>

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-ink-soft transition-colors duration-200 hover:bg-slate-100 hover:text-ink"
          >
            <Bell size={17} />
            {overdueCount > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-slate-100 bg-white p-2 shadow-card-hover">
              <p className="px-2.5 py-1.5 text-xs font-semibold text-ink-faint">通知</p>
              {notifications.length === 0 ? (
                <p className="px-2.5 py-4 text-center text-xs text-ink-faint">目前沒有新通知</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.text} className="rounded-xl px-2.5 py-2 text-sm hover:bg-slate-50">
                    <p className="text-ink">{n.text}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">{n.time}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold uppercase text-white">
            {name.slice(0, 2)}
          </div>
          <div className="hidden max-w-[160px] text-left leading-tight md:block">
            <p className="truncate text-xs font-semibold text-ink" title={userEmail}>
              {name}
            </p>
            <p className="text-[11px] text-ink-faint">已登入</p>
          </div>
          <button
            onClick={onLogout}
            title="登出"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
