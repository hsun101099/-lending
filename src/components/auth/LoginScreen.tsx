import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Landmark, Loader2, User } from 'lucide-react'
import {
  describeAuthError,
  loginWithPin,
  MIN_PIN_LENGTH,
  registerWithPin,
  validatePin,
} from '../../hooks/useAuth'

type Mode = 'login' | 'register'

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setPin('')
    setPinConfirm('')
    setName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const pinError = validatePin(pin)
    if (pinError) {
      setError(pinError)
      return
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setError('請輸入姓名')
        return
      }
      if (pin !== pinConfirm) {
        setError('兩次輸入的數字不一致')
        return
      }
    }

    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await loginWithPin(pin)
      } else {
        await registerWithPin(name.trim(), pin)
      }
    } catch (err) {
      setError(describeAuthError(err, mode))
      setSubmitting(false)
    }
  }

  // 手機上叫出數字鍵盤，減少輸入錯誤
  const pinInputProps = {
    inputMode: 'numeric' as const,
    pattern: '[0-9]*',
    autoComplete: 'off',
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100'

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
            <Landmark size={22} strokeWidth={2.25} />
          </div>
          <h1 className="text-lg font-bold text-ink">銀行放款流程管理系統</h1>
          <p className="mt-1 text-xs text-ink-faint">
            {mode === 'login' ? '請輸入你設定的數字密碼' : '設定姓名與數字密碼即可開始使用'}
          </p>
        </div>

        {/* 登入 / 建立帳號 切換 */}
        <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
                mode === m ? 'bg-white text-primary shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {m === 'login' ? '登入' : '建立帳號'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">姓名</label>
              <div className="relative">
                <User size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：王先生"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              數字密碼{mode === 'register' && `（至少 ${MIN_PIN_LENGTH} 位）`}
            </label>
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="請輸入數字"
                {...pinInputProps}
                className={inputClass}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">再次輸入數字密碼</label>
              <div className="relative">
                <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="password"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="再輸入一次"
                  {...pinInputProps}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !pin || (mode === 'register' && (!name || !pinConfirm))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? '處理中...' : mode === 'login' ? '登入' : '建立帳號並登入'}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-faint">
          {mode === 'login'
            ? '第一次使用請點上方「建立帳號」'
            : '數字密碼就是你的登入方式，請自行牢記，忘記將無法自行取回'}
        </p>
      </motion.div>
    </div>
  )
}
