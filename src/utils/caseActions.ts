import { ANCHOR_DATE } from '../data/mockData'
import { STAGE_CONFIG, STAGE_ORDER, stageProgress } from '../data/stages'
import type { LoanCase } from '../types'

function todayIso(): string {
  return ANCHOR_DATE.toISOString().slice(0, 10)
}

export function advanceStage(loanCase: LoanCase): LoanCase {
  if (loanCase.currentStage === 'withdrawn' || loanCase.currentStage === 'disbursement') return loanCase

  const idx = STAGE_ORDER.indexOf(loanCase.currentStage)
  const nextStage = STAGE_ORDER[idx + 1]
  const today = todayIso()

  const timeline = loanCase.timeline.map((step, i) => {
    if (i === idx) {
      return { ...step, status: 'completed' as const, completedDate: today }
    }
    if (i === idx + 1) {
      return {
        ...step,
        status: 'current' as const,
        description: `${STAGE_CONFIG[nextStage].label}進行中，${loanCase.officer}承辦處理。`,
      }
    }
    return step
  })

  return {
    ...loanCase,
    currentStage: nextStage,
    progress: stageProgress(nextStage),
    lastUpdated: today,
    timeline,
  }
}

export function withdrawCase(loanCase: LoanCase): LoanCase {
  if (loanCase.currentStage === 'withdrawn' || loanCase.currentStage === 'disbursement') return loanCase

  const idx = STAGE_ORDER.indexOf(loanCase.currentStage)
  const today = todayIso()

  const timeline = [
    ...loanCase.timeline.slice(0, idx + 1).map((step, i) =>
      i === idx ? { ...step, status: 'completed' as const, completedDate: step.completedDate ?? today } : step
    ),
    {
      key: 'withdrawn' as const,
      label: '撤件',
      status: 'withdrawn' as const,
      completedDate: today,
      officer: loanCase.officer,
      note: '案件已撤件，流程終止。',
      attachments: 0,
      description: '案件已撤件，流程終止。',
    },
  ]

  return {
    ...loanCase,
    currentStage: 'withdrawn',
    lastUpdated: today,
    timeline,
  }
}
