import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react'
import PasswordInput from '../common/PasswordInput'
import { changePassword, describeAuthError, MIN_PASSWORD_LENGTH, validatePassword } from '../../hooks/useAuth'
import { describeMembershipError, getRegistrationCode, updateRegistrationCode } from '../../services/membership'
import { MIN_CODE_LENGTH } from './JoinScreen'

interface AccountModalProps {
  open: boolean
  onClose: () => void
}

type Tab = 'password' | 'code'

/** 讓已登入的同仁自行設定密碼，以及查看、更改單位註冊碼。 */
export default function AccountModal({ open, onClose }: AccountModalProps) {
  const [tab, setTab] = useState<Tab>('password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [saving, setSaving] = useState(false)

  const [code, setCode] = useState('')
  const [codeVisible, setCodeVisible] = useState(false)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [codeDone, setCodeDone] = useState('')

  useEffect(() => {
    if (!open) return
    setTab('password')
    setPassword('')
    setConfirm('')
    setError('')
    setDone('')
    setSaving(false)
    setCode('')
    setCodeVisible(false)
    setCodeError('')
    setCodeDone('')
    setCodeLoading(true)
    getRegistrationCode()
      .then((value) => setCode(value))
      .catch(() => setCodeError('讀不到目前的註冊碼，可能是安全性規則尚未發布'))
      .finally(() => setCodeLoading(false))
  }, [open])

  async function saveCode() {
    if (code.trim().length < MIN_CODE_LENGTH) {
      setCodeError(`註冊碼至少 ${MIN_CODE_LENGTH} 個字`)
      return
    }
    setCodeError('')
    setCodeDone('')
    setCodeLoading(true)
    try {
      await updateRegistrationCode(code)
      setCodeDone('註冊碼已更新，請記得轉達給同仁')
    } catch (err) {
      setCodeError(describeMembershipError(err, 'setup'))
    } finally {
      setCodeLoading(false)
    }
  }

  async function save(next: string, successText: string) {
    setError('')
    setSaving(true)
    try {
      await changePassword(next)
      setDone(successText)
    } catch (err) {
      setError(describeAuthError(err, 'password'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pwError = validatePassword(password)
    if (pwError) {
      setError(pwError)
      return
    }
    if (!password.trim()) {
      setError('請輸入新密碼，或按下方的「改回只用員編登入」')
      return
    }
    if (password !== confirm) {
      setError('兩次輸入的密碼不一致')
      return
    }
    await save(password, '密碼已更新，下次登入請輸入新密碼')
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[2px]"
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-drawer"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">帳號與安全</h3>
                  <p className="mt-1 text-xs text-ink-soft">
                    {tab === 'password'
                      ? '設定後，登入時要同時輸入員編與密碼。'
                      : '新同仁建立帳號時要輸入這組碼，沒有就看不到案件資料。'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="關閉"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
                {([
                  { key: 'password' as Tab, label: '登入密碼' },
                  { key: 'code' as Tab, label: '單位註冊碼' },
                ]).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 ${
                      tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'code' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">目前的單位註冊碼</label>
                    <div className="relative">
                      <ShieldCheck
                        size={15}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                      />
                      <input
                        type={codeVisible ? 'text' : 'password'}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value)
                          setCodeDone('')
                        }}
                        placeholder={codeLoading ? '讀取中...' : '尚未設定'}
                        autoComplete="off"
                        spellCheck={false}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setCodeVisible((v) => !v)}
                        aria-label={codeVisible ? '隱藏註冊碼' : '顯示註冊碼'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors hover:text-ink"
                      >
                        {codeVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                      改掉之後，舊的註冊碼就不能再用來建立新帳號；已經在使用的同仁不受影響。
                    </p>
                  </div>

                  {codeError && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{codeError}</p>
                  )}
                  {codeDone && (
                    <p className="rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-success">{codeDone}</p>
                  )}

                  <button
                    type="button"
                    onClick={saveCode}
                    disabled={codeLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
                  >
                    {codeLoading && <Loader2 size={15} className="animate-spin" />}
                    {codeLoading ? '處理中...' : '儲存註冊碼'}
                  </button>
                </div>
              ) : done ? (
                <>
                  <p className="rounded-xl bg-green-50 px-3 py-2.5 text-xs font-medium text-success">{done}</p>
                  <button
                    onClick={onClose}
                    className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
                  >
                    完成
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                      新密碼（至少 {MIN_PASSWORD_LENGTH} 個字）
                    </label>
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      placeholder="請輸入新密碼"
                      autoComplete="new-password"
                      label="新密碼"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-soft">再次輸入新密碼</label>
                    <PasswordInput
                      value={confirm}
                      onChange={setConfirm}
                      placeholder="再輸入一次"
                      autoComplete="new-password"
                      label="再次輸入新密碼"
                    />
                  </div>

                  {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-danger">{error}</p>}

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
                  >
                    {saving && <Loader2 size={15} className="animate-spin" />}
                    {saving ? '儲存中...' : '儲存密碼'}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save('', '已取消密碼，下次登入密碼欄留空即可')}
                    className="w-full text-center text-[11px] text-ink-faint transition-colors duration-150 hover:text-ink-soft"
                  >
                    改回只用員編登入（取消密碼）
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
