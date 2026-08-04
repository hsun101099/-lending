import { useState } from 'react'
import { motion } from 'framer-motion'
import { IdCard, KeyRound, Landmark, Loader2, ShieldCheck, User } from 'lucide-react'
import {
  describeAuthError,
  discardCurrentAccount,
  getEmployeeId,
  loginWithEmployeeId,
  MIN_EMPLOYEE_ID_LENGTH,
  MIN_PASSWORD_LENGTH,
  registerWithEmployeeId,
  validateEmployeeId,
  validatePassword,
} from '../../hooks/useAuth'
import {
  checkMembership,
  describeMembershipError,
  joinWithCode,
} from '../../services/membership'
import { MIN_CODE_LENGTH } from './JoinScreen'

type Mode = 'login' | 'register'

/** 已經整理成中文說明的錯誤，直接顯示即可。 */
class JoinError extends Error {}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setEmployeeId('')
    setName('')
    setPassword('')
    setPasswordConfirm('')
    setCode('')
  }

  /**
   * 建立帳號後立刻用註冊碼把自己加入名冊。
   * 註冊碼不對就把剛建立的帳號收回，不讓外人留下可用的帳號。
   */
  async function registerAndJoin() {
    const user = await registerWithEmployeeId(name.trim(), employeeId, password)
    try {
      await joinWithCode({
        uid: user.uid,
        code,
        name: name.trim(),
        employeeId: getEmployeeId(user),
      })
    } catch (err) {
      // 新版安全性規則尚未發布時，名冊本來就寫不進去，這種情況照舊放行
      if ((await checkMembership(user.uid)) === 'rulesNotReady') return
      await discardCurrentAccount().catch(() => {})
      throw new JoinError(describeMembershipError(err, 'join'))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const idError = validateEmployeeId(employeeId)
    if (idError) {
      setError(idError)
      return
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setError('請輸入姓名')
        return
      }
      const pwError = validatePassword(password, true)
      if (pwError) {
        setError(pwError)
        return
      }
      if (password !== passwordConfirm) {
        setError('兩次輸入的密碼不一致')
        return
      }
      if (code.trim().length < MIN_CODE_LENGTH) {
        setError('請輸入單位註冊碼，若不知道請向同仁索取')
        return
      }
    }

    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await loginWithEmployeeId(employeeId, password)
      } else {
        await registerAndJoin()
      }
    } catch (err) {
      setError(err instanceof JoinError ? err.message : describeAuthError(err, mode))
      setSubmitting(false)
    }
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
            {mode === 'login' ? '請輸入你的員編與密碼' : '需要單位註冊碼才能建立帳號'}
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
              員編{mode === 'register' && `（至少 ${MIN_EMPLOYEE_ID_LENGTH} 碼）`}
            </label>
            <div className="relative">
              <IdCard size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={employeeId}
                // 員編只會有英數與連字號，先擋掉其他字元避免登入時才報錯
                onChange={(e) => setEmployeeId(e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())}
                placeholder="請輸入員編"
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                className={`${inputClass} tracking-wider`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              密碼
              {mode === 'register' && (
                <span className="font-normal text-ink-faint">（至少 {MIN_PASSWORD_LENGTH} 個字）</span>
              )}
            </label>
            <div className="relative">
              <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? '沒設定密碼請留空' : '請設定密碼'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={inputClass}
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-soft">再次輸入密碼</label>
                <div className="relative">
                  <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="再輸入一次"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-soft">單位註冊碼</label>
                <div className="relative">
                  <ShieldCheck
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="請向單位內的同仁索取"
                    autoComplete="off"
                    spellCheck={false}
                    className={inputClass}
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                  沒有註冊碼就看不到任何案件資料，用來防止外人自行註冊。
                </p>
              </div>
            </>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={
              submitting ||
              !employeeId ||
              (mode === 'register' && (!name || !password || !passwordConfirm || !code))
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? '處理中...' : mode === 'login' ? '登入' : '建立帳號並登入'}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-faint">
          {mode === 'login'
            ? '第一次使用請點上方「建立帳號」；先前用數字登入的同仁，員編填原本那組數字、密碼留空即可'
            : '密碼請自行牢記，忘記將無法自行取回'}
        </p>
      </motion.div>
    </div>
  )
}
