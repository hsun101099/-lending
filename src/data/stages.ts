import type { StageConfig, StageKey } from '../types'

// Ordered pipeline stages (withdrawn is a terminal side-exit, not part of the main flow)
export const STAGE_ORDER: StageKey[] = [
  'intake',
  'appraisal',
  'credit',
  'approval',
  'contract',
  'disbursement',
]

export const STAGE_CONFIG: Record<StageKey, StageConfig> = {
  intake: {
    key: 'intake',
    label: '受理',
    shortLabel: '受理',
    color: '#64748B',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  appraisal: {
    key: 'appraisal',
    label: '估價',
    shortLabel: '估價',
    color: '#3B82F6',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  credit: {
    key: 'credit',
    label: '徵信',
    shortLabel: '徵信',
    color: '#F97316',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  approval: {
    key: 'approval',
    label: '批示',
    shortLabel: '批示',
    color: '#9333EA',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  contract: {
    key: 'contract',
    label: '對保',
    shortLabel: '對保',
    color: '#0D9488',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  disbursement: {
    key: 'disbursement',
    label: '撥款',
    shortLabel: '撥款',
    color: '#16A34A',
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  withdrawn: {
    key: 'withdrawn',
    label: '撤件',
    shortLabel: '撤件',
    color: '#DC2626',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
}

export const ALL_FILTER_STAGES: StageKey[] = [...STAGE_ORDER, 'withdrawn']

export function stageProgress(stage: StageKey): number {
  if (stage === 'withdrawn') return 0
  const idx = STAGE_ORDER.indexOf(stage)
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100)
}
