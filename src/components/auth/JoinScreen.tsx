import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Loader2, ShieldCheck } from 'lucide-react'
import {
  createRegistrationCode,
  describeMembershipError,
  joinWithCode,
} from '../../services/membership'
import { getEmployeeId, logout } from '../../hooks/useAuth'
import type { User } from 'firebase/auth'

interface JoinScreenProps {
  user: User
  onJoined: () => void
}

export const MIN_CODE_LENGTH = 4

/**
 * 登入成功、但還不在單位名冊裡時出現。
 * 沒有正確的註冊碼就看不到任何案件資料，用來擋掉在網路上找到網址的陌生人。
 */
export default function JoinScreen({ user, onJoined }: JoinScreenProps) {
  const [mode, setMode] = useState<'join' | 'setup'>('join')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = code.trim()
    if (value.length < MIN_CODE_LENGTH) {
      setError(`註冊碼至少 ${MIN_CODE_LENGTH} 個字`)
      return
    }

    setError('')
    setSubmitting(true)
    try {
      if (mode === 'setup') await createRegistrationCode(value)
      await joinWithCode({
        uid: user.uid,
        code: value,
        name: user.displayName ?? '',
        employeeId: getEmployeeId(user),
      })
      onJoined()
    } catch (err) {
      setError(describeMembershipError(err, mode))
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm tracking-wider text-ink placeholder:text-ink-faint placeholder:tracking-normal transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100'

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-slate-100 bg-card p-8 shadow-card"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-card">
            <ShieldCheck size={22} strokeWidth={2.25} />
          </div>
          <h1 className="text-lg font-bold text-ink">
            {mode === 'join' ? '請輸入單位註冊碼' : '第一次啟用：設定註冊碼'}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
            {mode === 'join'
              ? '為了避免外人看到客戶資料，第一次使用需要輸入單位共用的註冊碼，之後就不會再問。'
              : '設定一組單位共用的註冊碼，之後同仁加入時都要輸入這組碼。請記下來並轉達給同仁。'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              {mode === 'join' ? '單位註冊碼' : `新的單位註冊碼（至少 ${MIN_CODE_LENGTH} 個字）`}
            </label>
            <div className="relative">
              <ShieldCheck
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={mode === 'join' ? '請向同仁索取' : '例如：branch-2026'}
                autoComplete="off"
                spellCheck={false}
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? '確認中...' : mode === 'join' ? '確認並開始使用' : '設定並開始使用'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'join' ? 'setup' : 'join')
            setError('')
            setCode('')
          }}
          className="mt-4 w-full text-center text-[11px] text-ink-faint transition-colors duration-150 hover:text-ink-soft"
        >
          {mode === 'join' ? '本單位第一次啟用，由我設定註冊碼' : '返回輸入既有的註冊碼'}
        </button>

        <button
          type="button"
          onClick={() => logout()}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-ink-soft transition-colors duration-150 hover:bg-slate-50"
        >
          <LogOut size={13} />
          登出，改用其他帳號
        </button>
      </motion.div>
    </div>
  )
}
