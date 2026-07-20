import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Paperclip, X } from 'lucide-react'
import type { TimelineStep as TimelineStepType } from '../../types'
import { formatDate } from '../../utils/format'

interface TimelineProps {
  steps: TimelineStepType[]
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

export default function Timeline({ steps }: TimelineProps) {
  const [expanded, setExpanded] = useState<string | null>(
    steps.find((s) => s.status === 'current' || s.status === 'withdrawn')?.key ?? null
  )

  return (
    <div>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        const isOpen = expanded === step.key
        const isInteractive = step.status !== 'pending'

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
                      {step.completedDate && (
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-faint">完成日期</span>
                          <span className="font-medium text-ink">{formatDate(step.completedDate)}</span>
                        </div>
                      )}
                      {step.officer && (
                        <div className="flex justify-between gap-4">
                          <span className="text-ink-faint">承辦人</span>
                          <span className="font-medium text-ink">{step.officer}</span>
                        </div>
                      )}
                      {step.description && (
                        <div className="flex justify-between gap-4">
                          <span className="shrink-0 text-ink-faint">案件說明</span>
                          <span className="text-right font-medium text-ink">{step.description}</span>
                        </div>
                      )}
                      {step.note && (
                        <div className="flex justify-between gap-4">
                          <span className="shrink-0 text-ink-faint">備註</span>
                          <span className="text-right font-medium text-ink">{step.note}</span>
                        </div>
                      )}
                      {typeof step.attachments === 'number' && (
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
