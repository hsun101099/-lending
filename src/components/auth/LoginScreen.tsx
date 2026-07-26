import { useState } from 'react'
import { motion } from 'framer-motion'
import { Landmark, Loader2, Lock, Mail } from 'lucide-react'
import { describeAuthError, login } from '../../hooks/useAuth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(describeAuthError(err))
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100'

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl border border-slate-100 bg-card p-8 shadow-card"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-card">
            <Landmark size={22} strokeWidth={2.25} />
          </div>
          <h1 className="text-lg font-bold text-ink">銀行放款流程管理系統</h1>
          <p className="mt-1 text-xs text-ink-faint">請使用公司配發的帳號登入</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">電子郵件</label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@bank.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">密碼</label>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? '登入中...' : '登入'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
