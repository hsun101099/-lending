import { STAGE_CONFIG, STAGE_ORDER, stageProgress } from '../data/stages'
import { getTodayIso } from './today'
import { generateNextCaseId } from './caseId'
import type { LoanCase, StageKey } from '../types'

export interface NewCaseInput {
  customerName: string
  loanAmount: number
  loanType: string
  officer: string
  createdDate: string
  remarks: string
  currentStage: StageKey
}

export function createCase(input: NewCaseInput, existing: LoanCase[]): LoanCase {
  const currentIdx = STAGE_ORDER.indexOf(input.currentStage)
  const isFullyDone = input.currentStage === 'disbursement'
  const completedCount = isFullyDone ? STAGE_ORDER.length : currentIdx

  const timeline = STAGE_ORDER.map((key, i) => {
    const cfg = STAGE_CONFIG[key]
    if (i < completedCount) {
      return {
        key,
        label: cfg.label,
        status: 'completed' as const,
        completedDate: input.createdDate,
        officer: input.officer,
        description: `${cfg.label}作業已完成，資料已歸檔存查。`,
      }
    }
    if (i === currentIdx && !isFullyDone) {
      return {
        key,
        label: cfg.label,
        status: 'current' as const,
        officer: input.officer,
        description: `${cfg.label}進行中，${input.officer}承辦處理。`,
      }
    }
    return {
      key,
      label: cfg.label,
      status: 'pending' as const,
      description: `尚未進入${cfg.label}階段。`,
    }
  })

  return {
    id: generateNextCaseId(existing),
    customerName: input.customerName,
    loanAmount: input.loanAmount,
    loanType: input.loanType,
    officer: input.officer,
    createdDate: input.createdDate,
    currentStage: input.currentStage,
    progress: stageProgress(input.currentStage),
    lastUpdated: getTodayIso(),
    remarks: input.remarks,
    timeline,
  }
}

export function advanceStage(loanCase: LoanCase): LoanCase {
  if (loanCase.currentStage === 'withdrawn' || loanCase.currentStage === 'disbursement') return loanCase

  const idx = STAGE_ORDER.indexOf(loanCase.currentStage)
  const nextStage = STAGE_ORDER[idx + 1]
  const today = getTodayIso()

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
  const today = getTodayIso()

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
