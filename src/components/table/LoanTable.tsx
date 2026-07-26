import { motion } from 'framer-motion'
import { AlertTriangle, ChevronRight, FilePlus2, Inbox, Trash2 } from 'lucide-react'
import { STAGE_CONFIG } from '../../data/stages'
import { getToday } from '../../utils/today'
import { daysSince, formatWan, formatDate } from '../../utils/format'
import type { LoanCase } from '../../types'
import StatusBadge from './StatusBadge'
import ProgressBar from './ProgressBar'

interface LoanTableProps {
  cases: LoanCase[]
  onSelect: (loanCase: LoanCase) => void
  hasAnyCases?: boolean
  onAddCase?: () => void
  onDelete?: (loanCase: LoanCase) => void
}

const OVERDUE_THRESHOLD = 7

export function isOverdue(loanCase: LoanCase): boolean {
  if (loanCase.currentStage === 'disbursement' || loanCase.currentStage === 'withdrawn') return false
  return daysSince(loanCase.lastUpdated, getToday()) > OVERDUE_THRESHOLD
}

const columns = ['客戶姓名', '貸款金額', '貸款種類', '承辦人', '建立日期', '目前流程', '案件狀態', '操作']

export default function LoanTable({ cases, onSelect, hasAnyCases = true, onAddCase, onDelete }: LoanTableProps) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-card py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-ink-faint">
          <Inbox size={22} />
        </div>
        {hasAnyCases ? (
          <>
            <p className="text-sm font-medium text-ink-soft">找不到符合條件的案件</p>
            <p className="text-xs text-ink-faint">請調整搜尋關鍵字或篩選條件</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-ink-soft">尚無任何案件</p>
            <p className="text-xs text-ink-faint">點擊下方按鈕新增第一筆案件</p>
            {onAddCase && (
              <button
                onClick={onAddCase}
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover"
              >
                <FilePlus2 size={16} />
                新增案件
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((loanCase, i) => {
              const overdue = isOverdue(loanCase)
              const cfg = STAGE_CONFIG[loanCase.currentStage]
              return (
                <motion.tr
                  key={loanCase.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.02 }}
                  onClick={() => onSelect(loanCase)}
                  className={`group cursor-pointer border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-blue-50/40 ${
                    overdue ? 'bg-red-50/60' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{loanCase.customerName}</span>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                          <AlertTriangle size={10} /> 已逾7天
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-faint">{loanCase.id}</p>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-ink tabular-nums">{formatWan(loanCase.loanAmount)}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{loanCase.loanType}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{loanCase.officer}</td>
                  <td className="px-5 py-3.5 text-ink-soft tabular-nums">{formatDate(loanCase.createdDate)}</td>
                  <td className="px-5 py-3.5">
                    <ProgressBar value={loanCase.progress} color={cfg.color} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge stage={loanCase.currentStage} className={overdue ? 'ring-2 ring-danger/30' : ''} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors duration-150 group-hover:bg-blue-50">
                        查看詳情
                        <ChevronRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(loanCase)
                          }}
                          title="刪除案件"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors duration-150 hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
