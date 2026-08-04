import { isStageKey, STAGE_CONFIG, STAGE_ORDER, stageProgress } from '../data/stages'
import type { LoanCase, TimelineStep } from '../types'

/**
 * 把資料庫讀出的案件調整成目前的流程定義。
 *
 * 流程階段擴充後（新增總社批示、授管室書審、用印、設定、核定），
 * 先前建立的案件時間軸只涵蓋舊的階段，直接顯示會缺漏。
 * 這裡以現行流程重建時間軸，並保留原有的完成日期、承辦人與備註。
 */
/**
 * 移除值為 undefined 的欄位。
 * Firestore 不接受 undefined，若直接寫入會整筆存檔失敗。
 */
function omitUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

export function normalizeCase(loanCase: LoanCase): LoanCase {
  const currentStage = isStageKey(loanCase.currentStage) ? loanCase.currentStage : 'intake'
  const existing = new Map((loanCase.timeline ?? []).map((step) => [step.key, step]))

  const isWithdrawn = currentStage === 'withdrawn'
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  const isFullyDone = currentStage === 'disbursement'

  // 撤件案件保留原本已完成的階段數，其餘視為未進行
  const withdrawnCompletedCount = isWithdrawn
    ? STAGE_ORDER.filter((key) => existing.get(key)?.status === 'completed').length
    : 0

  const timeline: TimelineStep[] = STAGE_ORDER.map((key, i) => {
    const cfg = STAGE_CONFIG[key]
    const prev = existing.get(key)
    const base = omitUndefined({
      key,
      label: cfg.label,
      officer: prev?.officer,
      note: prev?.note,
      attachments: prev?.attachments,
      completedDate: prev?.completedDate,
    })

    const completedCount = isWithdrawn ? withdrawnCompletedCount : isFullyDone ? STAGE_ORDER.length : currentIdx

    if (i < completedCount) {
      return {
        ...base,
        status: 'completed',
        description: prev?.description ?? `${cfg.label}作業已完成，資料已歸檔存查。`,
      }
    }
    if (!isWithdrawn && i === currentIdx) {
      return {
        ...base,
        status: 'current',
        description: prev?.description ?? `${cfg.label}進行中。`,
      }
    }
    return {
      key,
      label: cfg.label,
      status: 'pending',
      description: `尚未進入${cfg.label}階段。`,
    }
  })

  if (isWithdrawn) {
    const prev = existing.get('withdrawn')
    timeline.push({
      key: 'withdrawn',
      label: '撤件',
      status: 'withdrawn',
      completedDate: prev?.completedDate ?? loanCase.lastUpdated,
      officer: prev?.officer ?? loanCase.officer,
      note: prev?.note ?? '案件已撤件，流程終止。',
      description: prev?.description ?? '案件已撤件，流程終止。',
    })
  }

  return omitUndefined({
    ...loanCase,
    currentStage,
    progress: stageProgress(currentStage),
    timeline,
  })
}
