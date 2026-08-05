import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Paperclip, Plus, X } from 'lucide-react'
import type { StageKey, TimelineStep as TimelineStepType } from '../../types'
import { formatDate } from '../../utils/format'

interface TimelineProps {
  steps: TimelineStepType[]
  /** 唯讀時（例如已刪除的案件）不顯示可編輯的欄位 */
  editable?: boolean
  onChangeDate?: (key: StageKey, date: string) => void
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

/** 每一關的備註：既有的都保留，可以逐則刪除，也可以再新增。 */
function StepNotes({
  step,
  editable,
  onAddNote,
  onRemoveNote,
}: {
  step: TimelineStepType
  editable: boolean
  onAddNote?: (key: StageKey, note: string) => void
  onRemoveNote?: (key: StageKey, index: number) => void
}) {
  const [draft, setDraft] = useState('')
  const notes = step.notes ?? []

  function submit() {
    const text = draft.trim()
    if (!text) return
    onAddNote?.(step.key, text)
    setDraft('')
  }

  return (
    <div className="space-y-1.5">
      <span className="text-ink-faint">備註</span>
      {notes.length === 0 && !editable && <p className="text-ink-faint">—</p>}
      {notes.map((note, i) => (
        <div key={`${note}-${i}`} className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-1.5">
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-ink">{note}</p>
          {editable && (
            <button
              onClick={() => onRemoveNote?.(step.key, i)}
              aria-label={`刪除備註：${note}`}
              className="shrink-0 rounded p-0.5 text-ink-faint transition-colors duration-150 hover:bg-red-50 hover:text-danger"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      {editable && (
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="新增這一關的備註"
            aria-label={`${step.label} 新增備註`}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            aria-label={`${step.label} 儲存備註`}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:bg-slate-200 disabled:text-ink-faint"
          >
            <Plus size={13} />
            新增
          </button>
        </div>
      )}
    </div>
  )
}

export default function Timeline({
  steps,
  editable = false,
  onChangeDate,
  onAddNote,
  onRemoveNote,
}: TimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(
    steps.find((s) => s.status === 'current' || s.status === 'withdrawn')?.key ?? null
  )

  return (
    <div>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const isOpen = expanded === step.key
        const isInteractive = step.status !== 'pending'
        // 未開始的關卡還沒有日期可填；其餘都能補上或修正日期
        const canEditDate = editable && step.status !== 'pending'

        return (
          <div key={step.key} className="relative flex gap-4 pb-1">
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

            <div className="flex-1 pb-6">
              <button
                onClick={() => isInteractive && setExpanded(isOpen ? null : step.key)}
                disabled={!isInteractive}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150 ${
                  isInteractive ? 'hover:bg-slate-50' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-sm font-bold ${step.status === 'pending' ? 'text-ink-faint' : 'text-ink'}`}>
                    {step.label}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      step.status === 'completed'
                        ? 'bg-green-50 text-success'
                        : step.status === 'current'
                          ? 'bg-blue-50 text-primary'
                          : step.status === 'withdrawn'
                            ? 'bg-red-50 text-danger'
                            : 'bg-slate-100 text-ink-faint'
                    }`}
                  >
                    {STATUS_LABEL[step.status]}
                  </span>
                  {step.completedDate && (
                    <span className="text-[11px] tabular-nums text-ink-faint">{formatDate(step.completedDate)}</span>
                  )}
                </div>
                {isInteractive && (
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-ink-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && isInteractive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mt-1 space-y-2.5 rounded-xl bg-slate-50/70 p-4 text-sm">
                      {canEditDate ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="shrink-0 text-ink-faint">
                            {step.status === 'current' ? '開始日期' : '完成日期'}
                          </span>
                          {/* 補登舊案件時，每一關的日期都要能自己填 */}
                          <input
                            type="date"
                            value={step.completedDate ?? ''}
                            onChange={(e) => onChangeDate?.(step.key, e.target.value)}
                            aria-label={`${step.label} 日期`}
                            className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      ) : (
                        step.completedDate && (
                          <div className="flex justify-between gap-4">
                            <span className="text-ink-faint">完成日期</span>
                            <span className="font-medium text-ink">{formatDate(step.completedDate)}</span>
                          </div>
                        )
                      )}
                      {step.officer && (
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-faint">受理人</span>
                          <span className="font-medium text-ink">{step.officer}</span>
                        </div>
                      )}
                      {step.description && (
                        <div className="flex justify-between gap-4">
                          <span className="shrink-0 text-ink-faint">案件說明</span>
                          <span className="text-right font-medium text-ink">{step.description}</span>
                        </div>
                      )}

                      <StepNotes
                        step={step}
                        editable={editable}
                        onAddNote={onAddNote}
                        onRemoveNote={onRemoveNote}
                      />

                      {typeof step.attachments === 'number' && step.attachments > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-ink-faint">附件數量</span>
                          <span className="flex items-center gap-1 font-medium text-ink">
                            <Paperclip size={12} /> {step.attachments} 份
                          </span>
                        </div>
                      )}
                    </div>
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
