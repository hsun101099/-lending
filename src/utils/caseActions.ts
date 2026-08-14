import { STAGE_CONFIG, STAGE_ORDER, stageProgress } from '../data/stages'
import { getTodayIso } from './today'
import type { LoanCase, StageKey, TimelineStep } from '../types'

export interface NewCaseInput {
  customerName: string
  loanAmount: number
  loanType: string
  category: string
  officer: string
  createdDate: string
  remarks: string
  currentStage: StageKey
  /** 各階段的完成日期。補登舊案件時可逐關填寫，未填則沿用建立日期 */
  stageDates?: Partial<Record<StageKey, string>>
}

/** 移除值為 undefined 或空字串的欄位（Firestore 不接受 undefined）。 */
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as T
}

/** 依登打內容組出一筆完整案件；案件編號由呼叫端（資料層）配發。 */
export function buildCase(input: NewCaseInput, id: string): LoanCase {
  const currentIdx = STAGE_ORDER.indexOf(input.currentStage)
  const isFullyDone = input.currentStage === 'disbursement'
  const completedCount = isFullyDone ? STAGE_ORDER.length : currentIdx
  const dateOf = (key: StageKey) => input.stageDates?.[key]?.trim() || input.createdDate

  const timeline = STAGE_ORDER.map((key, i) => {
    const cfg = STAGE_CONFIG[key]
    if (i < completedCount) {
      return {
        key,
        label: cfg.label,
        status: 'completed' as const,
        completedDate: dateOf(key),
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
        description: `${cfg.label}進行中，${input.officer}受理處理。`,
      }
    }
    return {
      key,
      label: cfg.label,
      status: 'pending' as const,
      description: `尚未進入${cfg.label}階段。`,
    }
  })

  // 補登舊案件時，最後異動日應是最後一關的日期，逾期提醒才會準確
  const lastUpdated = timeline
    .map((s) => s.completedDate)
    .filter((d): d is string => !!d)
    .concat(input.createdDate)
    .reduce((latest, d) => (d > latest ? d : latest), input.createdDate)

  return {
    id,
    customerName: input.customerName,
    loanAmount: input.loanAmount,
    loanType: input.loanType,
    category: input.category,
    officer: input.officer,
    createdDate: input.createdDate,
    currentStage: input.currentStage,
    progress: stageProgress(input.currentStage),
    lastUpdated,
    remarks: input.remarks,
    timeline,
  }
}

export function advanceStage(loanCase: LoanCase): LoanCase {
  if (loanCase.currentStage === 'withdrawn' || loanCase.currentStage === 'disbursement') return loanCase

  const idx = STAGE_ORDER.indexOf(loanCase.currentStage)
  const nextStage = STAGE_ORDER[idx + 1]
  const today = getTodayIso()
  // 撥款為流程終點，抵達即代表全案完成，不再是「進行中」
  const reachesFinalStage = nextStage === 'disbursement'

  const timeline = loanCase.timeline.map((step, i) => {
    if (i === idx) {
      // 使用者可能已經先把這一關的日期改成實際完成日，這時就沿用他填的，不要蓋成今天
      return { ...step, status: 'completed' as const, completedDate: step.completedDate ?? today }
    }
    if (i === idx + 1) {
      return reachesFinalStage
        ? {
            ...step,
            status: 'completed' as const,
            completedDate: step.completedDate ?? today,
            officer: step.officer ?? loanCase.officer,
            description: `${STAGE_CONFIG[nextStage].label}作業已完成，資料已歸檔存查。`,
          }
        : {
            ...step,
            status: 'current' as const,
            officer: step.officer ?? loanCase.officer,
            description: `${STAGE_CONFIG[nextStage].label}進行中，${loanCase.officer}受理處理。`,
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

/**
 * 退回上一關。按錯「更新流程」時可以還原，撤件後也能用它把案件救回來。
 * 被退回的那一關會清掉完成日期，重新成為進行中。
 */
export function revertStage(loanCase: LoanCase): LoanCase {
  const today = getTodayIso()

  // 撤件：拿掉撤件那一筆，回到撤件前所在的關卡
  if (loanCase.currentStage === 'withdrawn') {
    const kept = loanCase.timeline.filter((step) => step.key !== 'withdrawn')
    const lastDoneIdx = kept.reduce((last, step, i) => (step.status === 'completed' ? i : last), -1)
    if (lastDoneIdx < 0) return loanCase
    const backTo = STAGE_ORDER[lastDoneIdx]
    return {
      ...loanCase,
      currentStage: backTo,
      progress: stageProgress(backTo),
      lastUpdated: today,
      timeline: kept.map((step, i) =>
        i === lastDoneIdx
          ? clean({ ...step, status: 'current' as const, completedDate: undefined })
          : step
      ),
    }
  }

  // 第一關（受理）沒有上一關可退
  const idx = STAGE_ORDER.indexOf(loanCase.currentStage)
  if (idx <= 0) return loanCase

  const backTo = STAGE_ORDER[idx - 1]
  const timeline = loanCase.timeline.map((step, i) => {
    if (i === idx) return clean({ ...step, status: 'pending' as const, completedDate: undefined })
    if (i === idx - 1) return clean({ ...step, status: 'current' as const, completedDate: undefined })
    return step
  })

  return {
    ...loanCase,
    currentStage: backTo,
    progress: stageProgress(backTo),
    lastUpdated: today,
    timeline,
  }
}

/** 更新某一關的受理人。 */
export function setStepOfficer(loanCase: LoanCase, key: StageKey, officer: string): LoanCase {
  return updateTimelineStep(loanCase, key, { officer: officer.trim() })
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

/** 更新某一關的資料（例如補上正確的完成日期）。 */
export function updateTimelineStep(
  loanCase: LoanCase,
  key: StageKey,
  patch: Partial<TimelineStep>
): LoanCase {
  const timeline = loanCase.timeline.map((step) => (step.key === key ? clean({ ...step, ...patch }) : step))
  return { ...loanCase, timeline, lastUpdated: getTodayIso() }
}

/** 在某一關新增一則備註，原有的備註都會保留。 */
export function addStepNote(loanCase: LoanCase, key: StageKey, note: string): LoanCase {
  const text = note.trim()
  if (!text) return loanCase
  const timeline = loanCase.timeline.map((step) =>
    step.key === key ? clean({ ...step, note: undefined, notes: [...(step.notes ?? []), text] }) : step
  )
  return { ...loanCase, timeline, lastUpdated: getTodayIso() }
}

/** 刪除某一關的第 index 則備註。 */
export function removeStepNote(loanCase: LoanCase, key: StageKey, index: number): LoanCase {
  const timeline = loanCase.timeline.map((step) => {
    if (step.key !== key) return step
    const notes = (step.notes ?? []).filter((_, i) => i !== index)
    return clean({ ...step, note: undefined, notes: notes.length > 0 ? notes : undefined })
  })
  return { ...loanCase, timeline, lastUpdated: getTodayIso() }
}
