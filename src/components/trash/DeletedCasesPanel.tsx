import { motion } from 'framer-motion'
import { ArchiveRestore, Trash2, Undo2 } from 'lucide-react'
import StatusBadge from '../table/StatusBadge'
import { formatWan, formatDate } from '../../utils/format'
import { describeDeletedAt } from '../../utils/recycleBin'
import type { LoanCase } from '../../types'

interface DeletedCasesPanelProps {
  cases: LoanCase[]
  onRestore: (loanCase: LoanCase) => void
  onPurge: (loanCase: LoanCase) => void
  onSelect: (loanCase: LoanCase) => void
}

export default function DeletedCasesPanel({ cases, onRestore, onPurge, onSelect }: DeletedCasesPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-ink">已刪除案件</h2>
        <p className="mt-1 text-sm text-ink-faint">
          刪除的案件會留在這裡，內容完整保留，按「復原」就會回到案件列表。
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-card py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-ink-faint">
            <ArchiveRestore size={22} />
          </div>
          <p className="text-sm font-medium text-ink-soft">目前沒有已刪除的案件</p>
          <p className="text-xs text-ink-faint">案件被刪除後會出現在這裡，隨時可以復原</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((loanCase, i) => (
            <motion.div
              key={loanCase.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.03 }}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <button
                onClick={() => onSelect(loanCase)}
                className="min-w-0 flex-1 text-left"
                title="查看案件詳情"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{loanCase.customerName}</span>
                  <StatusBadge stage={loanCase.currentStage} />
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {loanCase.id}．{formatWan(loanCase.loanAmount)}．{loanCase.loanType}．承辦 {loanCase.officer}．
                  建立於 {formatDate(loanCase.createdDate)}
                </p>
                <p className="mt-0.5 text-xs text-danger">
                  {describeDeletedAt(loanCase.deletedAt)}由 {loanCase.deletedBy || '未知'} 刪除
                </p>
              </button>

              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onRestore(loanCase)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
                >
                  <Undo2 size={14} />
                  復原
                </button>
                <button
                  onClick={() => onPurge(loanCase)}
                  title="永久刪除"
                  aria-label={`永久刪除 ${loanCase.customerName} 的案件`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-ink-faint transition-colors duration-150 hover:border-red-200 hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
