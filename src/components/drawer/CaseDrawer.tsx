import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowUpCircle,
  Banknote,
  Briefcase,
  CalendarDays,
  CornerUpLeft,
  Hash,
  Tags,
  Trash2,
  Undo2,
  User,
  X,
  XCircle,
} from 'lucide-react'
import type { LoanCase, StageKey } from '../../types'
import { formatWan, formatDate } from '../../utils/format'
import { describeDeletedAt, isDeleted } from '../../utils/recycleBin'
import StatusBadge from '../table/StatusBadge'
import ProgressBar from '../table/ProgressBar'
import Timeline from './Timeline'
import { STAGE_CONFIG, STAGE_ORDER } from '../../data/stages'
import { isOverdue } from '../table/LoanTable'
import { REMARK_SUGGESTIONS } from '../../data/remarkSuggestions'

interface CaseDrawerProps {
  loanCase: LoanCase | null
  onClose: () => void
  onAdvanceStage: (id: string) => void
  onWithdraw: (id: string) => void
  onUpdateRemarks: (id: string, remarks: string) => void
  onDelete: (loanCase: LoanCase) => void
  onRestore: (loanCase: LoanCase) => void
  onRevertStage: (id: string) => void
  onChangeStepDate: (id: string, key: StageKey, date: string) => void
  onChangeStepOfficer: (id: string, key: StageKey, officer: string) => void
  onAddStepNote: (id: string, key: StageKey, note: string) => void
  onRemoveStepNote: (id: string, key: StageKey, index: number) => void
}

export default function CaseDrawer({
  loanCase,
  onClose,
  onAdvanceStage,
  onWithdraw,
  onUpdateRemarks,
  onDelete,
  onRestore,
  onRevertStage,
  onChangeStepDate,
  onChangeStepOfficer,
  onAddStepNote,
  onRemoveStepNote,
}: CaseDrawerProps) {
  const [remarksDraft, setRemarksDraft] = useState('')

  useEffect(() => {
    setRemarksDraft(loanCase?.remarks ?? '')
  }, [loanCase?.id, loanCase?.remarks])

  const deleted = !!loanCase && isDeleted(loanCase)
  const isConcluded = loanCase && (loanCase.currentStage === 'disbursement' || loanCase.currentStage === 'withdrawn')
  const overdue = loanCase ? isOverdue(loanCase) : false
  const nextStageLabel =
    loanCase && !isConcluded
      ? STAGE_CONFIG[STAGE_ORDER[STAGE_ORDER.indexOf(loanCase.currentStage) + 1]]?.label
      : null

  // 撤件的案件退回到撤件前那一關；其餘退回流程上的前一關
  const previousStage = loanCase
    ? loanCase.currentStage === 'withdrawn'
      ? [...loanCase.timeline].reverse().find((s) => s.status === 'completed')?.key
      : STAGE_ORDER[STAGE_ORDER.indexOf(loanCase.currentStage) - 1]
    : undefined
  const canRevert = !deleted && !!previousStage
  const revertLabel = previousStage ? STAGE_CONFIG[previousStage].label : ''

  const infoItems = loanCase
    ? [
        { icon: Banknote, label: '貸款金額', value: formatWan(loanCase.loanAmount) },
        { icon: Briefcase, label: '貸款種類', value: loanCase.loanType },
        { icon: Tags, label: '類別', value: loanCase.category || '—' },
        { icon: Hash, label: '案件編號', value: loanCase.id },
        { icon: User, label: '受理人', value: loanCase.officer },
        { icon: CalendarDays, label: '建立日期', value: formatDate(loanCase.createdDate) },
      ]
    : []

  return (
    <AnimatePresence>
      {loanCase && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-drawer sm:max-w-lg"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge stage={loanCase.currentStage} />
                  {overdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                      <AlertTriangle size={11} /> 已逾7天
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-ink">{loanCase.customerName}</h2>
                <p className="mt-0.5 text-sm text-ink-faint">{loanCase.loanType} 貸款申請</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!deleted && (
                  <button
                    onClick={() => onDelete(loanCase)}
                    title="刪除案件"
                    aria-label="刪除案件"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="關閉案件詳情"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {deleted && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/70 px-3.5 py-3">
                  <Trash2 size={15} className="mt-0.5 shrink-0 text-danger" />
                  <div>
                    <p className="text-sm font-semibold text-ink">這筆案件已被刪除</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {describeDeletedAt(loanCase.deletedAt)}由 {loanCase.deletedBy || '未知'} 刪除，資料完整保留，可直接復原。
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-6 grid grid-cols-2 gap-3">
                {infoItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
                      <item.icon size={12} />
                      {item.label}
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-ink" title={item.value}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-faint">
                  <span>案件進度</span>
                  <span>{loanCase.progress}%</span>
                </div>
                <ProgressBar
                  value={loanCase.progress}
                  color={STAGE_CONFIG[loanCase.currentStage].color}
                  showLabel={false}
                />
              </div>

              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">案件流程時間軸</h3>
                {!deleted && <span className="text-[11px] text-ink-faint">點一下看細節，按 ✎ 才能修改</span>}
              </div>
              <Timeline
                steps={loanCase.timeline}
                editable={!deleted}
                caseOfficer={loanCase.officer}
                onChangeDate={(key, date) => onChangeStepDate(loanCase.id, key, date)}
                onChangeOfficer={(key, officer) => onChangeStepOfficer(loanCase.id, key, officer)}
                onAddNote={(key, note) => onAddStepNote(loanCase.id, key, note)}
                onRemoveNote={(key, index) => onRemoveStepNote(loanCase.id, key, index)}
              />

              <div className="mt-2">
                <h3 className="mb-2 text-sm font-bold text-ink">備註區</h3>
                <textarea
                  value={remarksDraft}
                  onChange={(e) => setRemarksDraft(e.target.value)}
                  onBlur={() => !deleted && onUpdateRemarks(loanCase.id, remarksDraft)}
                  readOnly={deleted}
                  placeholder="例如：客戶補件中 / 等待主管批示 / 待保證人資料..."
                  rows={3}
                  className={`w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-ink placeholder:text-ink-faint transition-all duration-200 focus:border-primary focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                    deleted ? 'bg-slate-50 text-ink-soft' : ''
                  }`}
                />
                <div className={`mt-2 flex flex-wrap gap-1.5 ${deleted ? 'hidden' : ''}`}>
                  {REMARK_SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setRemarksDraft(s)
                        onUpdateRemarks(loanCase.id, s)
                      }}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-ink-soft transition-colors duration-150 hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              {deleted ? (
                <button
                  onClick={() => onRestore(loanCase)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
                >
                  <Undo2 size={16} />
                  復原此案件
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => onAdvanceStage(loanCase.id)}
                    disabled={!!isConcluded}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-ink-faint"
                  >
                    <ArrowUpCircle size={16} />
                    {nextStageLabel ? `更新流程至「${nextStageLabel}」` : '案件已結案'}
                  </button>
                  <div className="flex gap-2">
                    {/* 按錯「更新流程」時可以退回；撤件後也能用它把案件救回來 */}
                    <button
                      onClick={() => onRevertStage(loanCase.id)}
                      disabled={!canRevert}
                      title={revertLabel ? `退回上一關（${revertLabel}）` : '已在第一關，無法退回'}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-ink-faint disabled:hover:border-slate-100 disabled:hover:text-ink-faint"
                    >
                      <CornerUpLeft size={16} />
                      {revertLabel ? `退回「${revertLabel}」` : '退回上一關'}
                    </button>
                    <button
                      onClick={() => onWithdraw(loanCase.id)}
                      disabled={!!isConcluded}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-2.5 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-ink-faint disabled:hover:bg-white"
                    >
                      <XCircle size={16} />
                      撤件
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
