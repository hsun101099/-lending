import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, Briefcase, CalendarDays, FilePlus2, User, X } from 'lucide-react'
import { LOAN_TYPE_OPTIONS } from '../../data/loanTypes'
import { getTodayIso } from '../../utils/today'
import type { NewCaseInput } from '../../utils/caseActions'

interface NewCaseModalProps {
  open: boolean
  onClose: () => void
  onCreate: (input: NewCaseInput) => void
}

const emptyForm = {
  customerName: '',
  loanAmount: '',
  loanType: '',
  officer: '',
  createdDate: getTodayIso(),
  remarks: '',
}

export default function NewCaseModal({ open, onClose, onCreate }: NewCaseModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [touched, setTouched] = useState(false)

  const amountValue = Number(form.loanAmount)
  const errors = {
    customerName: form.customerName.trim() === '',
    loanAmount: !form.loanAmount || !(amountValue > 0),
    loanType: form.loanType.trim() === '',
    officer: form.officer.trim() === '',
  }
  const isValid = !Object.values(errors).some(Boolean)

  function reset() {
    setForm({ ...emptyForm, createdDate: getTodayIso() })
    setTouched(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!isValid) return
    onCreate({
      customerName: form.customerName.trim(),
      loanAmount: amountValue,
      loanType: form.loanType.trim(),
      officer: form.officer.trim(),
      createdDate: form.createdDate,
      remarks: form.remarks.trim(),
    })
    reset()
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 focus:outline-none focus:ring-4 ${
      hasError && touched
        ? 'border-danger/60 focus:border-danger focus:ring-red-100'
        : 'border-slate-200 focus:border-primary focus:ring-blue-100'
    }`

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-drawer"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <FilePlus2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-ink">新增案件</h2>
                    <p className="text-xs text-ink-faint">登打客戶基本資料，案件將以「受理」狀態建立</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <User size={12} /> 客戶姓名
                  </label>
                  <input
                    value={form.customerName}
                    onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                    placeholder="例如：陳建宇"
                    className={inputClass(errors.customerName)}
                  />
                  {touched && errors.customerName && <p className="mt-1 text-xs text-danger">請輸入客戶姓名</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <Banknote size={12} /> 貸款金額 (NT$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.loanAmount}
                      onChange={(e) => setForm((f) => ({ ...f, loanAmount: e.target.value }))}
                      placeholder="例如：5000000"
                      className={inputClass(errors.loanAmount)}
                    />
                    {touched && errors.loanAmount && <p className="mt-1 text-xs text-danger">請輸入有效金額</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <Briefcase size={12} /> 貸款種類
                    </label>
                    <input
                      list="loan-type-options"
                      value={form.loanType}
                      onChange={(e) => setForm((f) => ({ ...f, loanType: e.target.value }))}
                      placeholder="例如：房屋貸款"
                      className={inputClass(errors.loanType)}
                    />
                    <datalist id="loan-type-options">
                      {LOAN_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    {touched && errors.loanType && <p className="mt-1 text-xs text-danger">請輸入貸款種類</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <User size={12} /> 承辦人
                    </label>
                    <input
                      value={form.officer}
                      onChange={(e) => setForm((f) => ({ ...f, officer: e.target.value }))}
                      placeholder="例如：王建宏"
                      className={inputClass(errors.officer)}
                    />
                    {touched && errors.officer && <p className="mt-1 text-xs text-danger">請輸入承辦人</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <CalendarDays size={12} /> 建立日期
                    </label>
                    <input
                      type="date"
                      value={form.createdDate}
                      onChange={(e) => setForm((f) => ({ ...f, createdDate: e.target.value }))}
                      className={inputClass(false)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft">備註（選填）</label>
                  <textarea
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    placeholder="例如：客戶補件中"
                    rows={2}
                    className={`${inputClass(false)} resize-none`}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
                  >
                    建立案件
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
