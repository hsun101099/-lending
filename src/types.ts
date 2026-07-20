export type StageKey =
  | 'intake'
  | 'appraisal'
  | 'credit'
  | 'approval'
  | 'contract'
  | 'disbursement'
  | 'withdrawn'

export interface StageConfig {
  key: StageKey
  label: string
  shortLabel: string
  color: string
  bg: string
  text: string
  border: string
  dot: string
}

export type TimelineStatus = 'completed' | 'current' | 'pending' | 'withdrawn'

export interface TimelineStep {
  key: StageKey
  label: string
  status: TimelineStatus
  completedDate?: string
  officer?: string
  note?: string
  attachments?: number
  description?: string
}

export interface LoanCase {
  id: string
  customerName: string
  loanAmount: number
  loanType: string
  officer: string
  createdDate: string
  currentStage: StageKey
  progress: number
  lastUpdated: string
  remarks: string
  timeline: TimelineStep[]
}

export interface SummaryMetric {
  label: string
  value: string
  delta?: string
  trend?: 'up' | 'down' | 'flat'
}
