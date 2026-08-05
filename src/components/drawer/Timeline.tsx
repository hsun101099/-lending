import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pencil, Plus, X } from 'lucide-react'
import type { StageKey, TimelineStep as TimelineStepType } from '../../types'
import { formatDate } from '../../utils/format'

interface TimelineProps {
  steps: TimelineStepType[]
  /** 案件層級的受理人，與該關相同時就不重複顯示 */
  caseOfficer?: string
  /** 唯讀時（例如已刪除的案件）不出現編輯按鈕 */
  editable?: boolean
  onChangeDate?: (key: StageKey, date: string) => void
  onChangeOfficer?: (key: StageKey, officer: string) => void
  onAddNote?: (key: StageKey, note: string) => void
  onRemoveNote?: (key: StageKey, index: number) => void
}

function StepIcon({ status }: { status: TimelineStepType['status'] }) {
  if (status === 'completed') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white shadow-sm">
        <Check size={16} strokeWidth={3} />
      </div>
    )
  }
  if (status === 'withdrawn') {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white shadow-sm">
        <X size={16} strokeWidth={3} />
      </div>
    )
  }
  if (status === 'current') {
    return (
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-sm">
        <span className="pulse-ring absolute inset-0 rounded-full" />
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
      <span className="h-2 w-2 rounded-full bg-slate-300" />
    </div>
  )
}

const STATUS_LABEL: Record<TimelineStepType['status'], string> = {
  completed: '已完成',
  current: '進行中',
  pending: '未開始',
  withdrawn: '已撤件',
}

const STATUS_CLASS: Record<TimelineStepType['status'], string> = {
  completed: 'bg-green-50 text-success',
  current: 'bg-blue-50 text-primary',
  pending: 'bg-slate-100 text-ink-faint',
  withdrawn: 'bg-red-50 text-danger',
}

/** 編輯面板：按下鉛筆才會出現，平常畫面保持乾淨也不會誤按。 */
function EditPanel({
  step,
  onChangeDate,
  onChangeOfficer,
  onAddNote,
  onRemoveNote,
  onDone,
}: {
  step: TimelineStepType
  onChangeDate?: (key: StageKey, date: string) => void
  onChangeOfficer?: (key: StageKey, officer: string) => void
  onAddNote?: (key: StageKey, note: string) => void
  onRemoveNote?: (key: StageKey, index: number) => void
  onDone: () => void
}) {
  const [draft, setDraft] = useState('')
  const notes = step.notes ?? []

  function submitNote() {
    const text = draft.trim()
    if (!text) return
    onAddNote?.(step.key, text)
    setDraft('')
  }

  const fieldClass =
    'min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div className="mt-2 space-y-2.5 rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-ink-faint">日期</span>
        <input
          type="date"
          value={step.completedDate ?? ''}
          onChange={(e) => onChangeDate?.(step.key, e.target.value)}
          aria-label={`${step.label} 日期`}
          className={fieldClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs text-ink-faint">受理人</span>
        <input
          value={step.officer ?? ''}
          onChange={(e) => onChangeOfficer?.(step.key, e.target.value)}
          placeholder="這一關的受理人"
          aria-label={`${step.label} 受理人`}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-xs text-ink-faint">備註</span>
        {notes.map((note, i) => (
          <div key={`${note}-${i}`} className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-1.5">
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-ink">{note}</p>
            <button
              onClick={() => onRemoveNote?.(step.key, i)}
              aria-label={`刪除備註：${note}`}
              className="shrink-0 rounded p-0.5 text-ink-faint transition-colors duration-150 hover:bg-red-50 hover:text-danger"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitNote()
              }
            }}
            placeholder="新增這一關的備註"
            aria-label={`${step.label} 新增備註`}
            className={fieldClass}
          />
          <button
            onClick={submitNote}
            disabled={!draft.trim()}
            aria-label={`${step.label} 儲存備註`}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:bg-slate-200 disabled:text-ink-faint"
          >
            <Plus size={13} />
            新增
          </button>
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-lg bg-white py-1.5 text-xs font-semibold text-ink-soft transition-colors duration-150 hover:text-ink"
      >
        完成編輯
      </button>
    </div>
  )
}

export default function Timeline({
  steps,
  caseOfficer,
  editable = false,
  onChangeDate,
  onChangeOfficer,
  onAddNote,
  onRemoveNote,
}: TimelineProps) {
  // 平常都是唯讀，按下鉛筆才進入編輯，一次只編輯一關
  const [editingKey, setEditingKey] = useState<string | null>(null)

  return (
    <div>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const isEditing = editingKey === step.key
        const notes = step.notes ?? []
        // 未開始的關卡還沒有內容可填
        const canEdit = editable && step.status !== 'pending'
        const showOfficer = step.officer && step.officer !== caseOfficer

        return (
          <div key={step.key} className="relative flex gap-4">
            {!isLast && (
              <div
                className={`absolute left-4 top-8 h-[calc(100%-1rem)] w-0.5 -translate-x-1/2 ${
                  step.status === 'completed' ? 'bg-success/40' : 'bg-slate-200'
                }`}
              />
            )}
            <div className="z-10 shrink-0 pt-0.5">
              <StepIcon status={step.status} />
            </div>

            <div className="min-w-0 flex-1 pb-5">
              <div className="flex min-h-8 items-center gap-2">
                <span className={`text-sm font-bold ${step.status === 'pending' ? 'text-ink-faint' : 'text-ink'}`}>
                  {step.label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[step.status]}`}>
                  {STATUS_LABEL[step.status]}
                </span>
                {step.completedDate && (
                  <span className="text-[11px] tabular-nums text-ink-faint">{formatDate(step.completedDate)}</span>
                )}
                {canEdit && (
                  <button
                    onClick={() => setEditingKey(isEditing ? null : step.key)}
                    title={`編輯${step.label}`}
                    aria-label={`編輯${step.label}`}
                    className={`ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                      isEditing ? 'bg-primary text-white' : 'text-ink-faint hover:bg-slate-100 hover:text-ink'
                    }`}
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>

              {/* 受理人與本關相同時不重複顯示，畫面才乾淨 */}
              {showOfficer && <p className="mt-1 text-xs text-ink-soft">受理人：{step.officer}</p>}

              {/* 備註平常就看得到，案件走到後面幾關時，前面的備註仍然一目了然 */}
              {notes.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {notes.map((note, n) => (
                    <li
                      key={`${note}-${n}`}
                      className="flex gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-ink-soft"
                    >
                      <span className="select-none text-ink-faint">・</span>
                      <span className="min-w-0 whitespace-pre-wrap break-words">{note}</span>
                    </li>
                  ))}
                </ul>
              )}

              <AnimatePresence initial={false}>
                {isEditing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <EditPanel
                      step={step}
                      onChangeDate={onChangeDate}
                      onChangeOfficer={onChangeOfficer}
                      onAddNote={onAddNote}
                      onRemoveNote={onRemoveNote}
                      onDone={() => setEditingKey(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
    </div>
  )
}
