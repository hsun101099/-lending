import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Banknote, Briefcase, CalendarDays, FilePlus2, ListChecks, Tags, User, X } from 'lucide-react'
import { LOAN_TYPE_OPTIONS } from '../../data/loanTypes'
import { CATEGORY_OPTIONS } from '../../data/categories'
import { OFFICER_OPTIONS } from '../../data/officers'
import { STAGE_CONFIG, STAGE_ORDER } from '../../data/stages'
import { getTodayIso } from '../../utils/today'
import { wanToNt } from '../../utils/format'
import type { NewCaseInput } from '../../utils/caseActions'
import type { StageKey } from '../../types'

const AMOUNT_STEP_WAN = 10

interface NewCaseModalProps {
  open: boolean
  onClose: () => void
  onCreate: (input: NewCaseInput) => void
}

const emptyForm = {
  customerName: '',
  loanAmountWan: '',
  loanType: '',
  category: '',
  officer: '',
  createdDate: getTodayIso(),
  remarks: '',
  currentStage: 'intake' as StageKey,
}

export default function NewCaseModal({ open, onClose, onCreate }: NewCaseModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [touched, setTouched] = useState(false)

  const amountWan = Number(form.loanAmountWan)
  const errors = {
    customerName: form.customerName.trim() === '',
    loanAmountWan: !form.loanAmountWan || !(amountWan > 0),
    loanType: form.loanType.trim() === '',
    category: form.category.trim() === '',
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
      loanAmount: wanToNt(amountWan),
      loanType: form.loanType,
      category: form.category,
      officer: form.officer,
      createdDate: form.createdDate,
      remarks: form.remarks.trim(),
      currentStage: form.currentStage,
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
                    <p className="text-xs text-ink-faint">登打客戶基本資料與目前辦理進度</p>
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
                      <Banknote size={12} /> 貸款金額（萬）
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step={AMOUNT_STEP_WAN}
                        value={form.loanAmountWan}
                        onChange={(e) => setForm((f) => ({ ...f, loanAmountWan: e.target.value }))}
                        placeholder="例如：500"
                        className={`${inputClass(errors.loanAmountWan)} pr-10`}
                      />
                      <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-faint">
                        萬
                      </span>
                    </div>
                    {touched && errors.loanAmountWan && <p className="mt-1 text-xs text-danger">請輸入有效金額</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <Tags size={12} /> 類別
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className={`${inputClass(errors.category)} ${form.category ? '' : 'text-ink-faint'}`}
                    >
                      <option value="">請選擇類別</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c} className="text-ink">
                          {c}
                        </option>
                      ))}
                    </select>
                    {touched && errors.category && <p className="mt-1 text-xs text-danger">請選擇類別</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <Briefcase size={12} /> 貸款種類
                  </label>
                  <select
                    value={form.loanType}
                    onChange={(e) => setForm((f) => ({ ...f, loanType: e.target.value }))}
                    className={`${inputClass(errors.loanType)} ${form.loanType ? '' : 'text-ink-faint'}`}
                  >
                    <option value="">請選擇貸款種類</option>
                    {LOAN_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t} className="text-ink">
                        {t}
                      </option>
                    ))}
                  </select>
                  {touched && errors.loanType && <p className="mt-1 text-xs text-danger">請選擇貸款種類</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                      <User size={12} /> 承辦人
                    </label>
                    <select
                      value={form.officer}
                      onChange={(e) => setForm((f) => ({ ...f, officer: e.target.value }))}
                      className={`${inputClass(errors.officer)} ${form.officer ? '' : 'text-ink-faint'}`}
                    >
                      <option value="">請選擇承辦人</option>
                      {OFFICER_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    {touched && errors.officer && <p className="mt-1 text-xs text-danger">請選擇承辦人</p>}
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
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                    <ListChecks size={12} /> 目前進度
                  </label>
                  <p className="mb-2.5 text-xs text-ink-faint">若案件已經在辦理中，可直接選擇目前所在的流程階段</p>
                  {/* 流程有先後順序，以編號的等寬格狀排列呈現，比長短不一的膠囊按鈕好讀 */}
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {STAGE_ORDER.map((stage, i) => {
                      const cfg = STAGE_CONFIG[stage]
                      const active = form.currentStage === stage
                      const passed = i < STAGE_ORDER.indexOf(form.currentStage)
                      return (
                        <motion.button
                          key={stage}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, currentStage: stage }))}
                          whileTap={{ scale: 0.96 }}
                          className={`relative flex items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-colors duration-200 sm:gap-1.5 sm:px-2 sm:text-xs ${
                            active ? 'text-white' : passed ? 'text-primary' : 'text-ink-soft hover:text-ink'
                          }`}
                        >
                          {/* 選取色塊在階段之間滑動，讓流程前進的感覺更明確 */}
                          {active ? (
                            <motion.span
                              layoutId="stage-active-tile"
                              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                              className="absolute inset-0 rounded-xl bg-primary shadow-[0_2px_10px_-2px_rgba(37,99,235,0.55)]"
                            />
                          ) : (
                            <span
                              className={`absolute inset-0 rounded-xl transition-colors duration-200 ${
                                passed ? 'bg-blue-50' : 'bg-slate-50 hover:bg-slate-100'
                              }`}
                            />
                          )}

                          <span
                            className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none tabular-nums ${
                              active ? 'bg-white/25 text-white' : passed ? 'bg-primary/15 text-primary' : 'bg-white text-ink-faint'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="relative z-10 truncate">{cfg.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                  {STAGE_ORDER.indexOf(form.currentStage) > 0 && (
                    <p className="mt-2 text-[11px] text-ink-faint">
                      建立後，第 1～{STAGE_ORDER.indexOf(form.currentStage)} 關會自動標記為已完成
                    </p>
                  )}
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
