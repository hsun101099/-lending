import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  /** 給螢幕閱讀器與測試用的名稱，也會用在顯示／隱藏按鈕上 */
  label: string
}

/** 密碼欄位，附一個眼睛可以看自己打了什麼。 */
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = 'off',
  label,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={label}
        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-11 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={`${visible ? '隱藏' : '顯示'}${label}`}
        title={visible ? '隱藏密碼' : '顯示密碼'}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint transition-colors duration-150 hover:text-ink"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
