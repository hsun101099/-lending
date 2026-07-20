import type { LoanCase, StageKey, TimelineStep } from '../types'
import { STAGE_CONFIG, STAGE_ORDER, stageProgress } from './stages'

// Anchor "today" for the prototype dataset so relative offsets stay meaningful.
export const ANCHOR_DATE = new Date('2026-07-20T09:00:00')

function daysAgo(n: number): Date {
  const d = new Date(ANCHOR_DATE)
  d.setDate(d.getDate() - n)
  return d
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const STAGE_NOTES: Record<StageKey, string[]> = {
  intake: ['已收齊申請文件，案件正式受理', '客戶親送申請書及身分證明文件', '線上申請已受理，等待後續作業'],
  appraisal: ['已安排鑑價人員至現場勘查', '估價報告已完成並歸檔', '等待合作估價公司回覆報告'],
  credit: ['聯徵中心查詢中', '已核對薪資與收入證明', '徵信報告審核中，資料齊全'],
  approval: ['已送交主管審核', '待授信會議核決額度', '核決條件已加註於系統'],
  contract: ['已完成對保簽約作業', '保證人資料尚待補齊', '已通知客戶預約對保時間'],
  disbursement: ['撥款作業已完成', '匯款處理中，預計今日入帳', '撥款金額已與客戶確認無誤'],
  withdrawn: ['客戶主動撤回申請', '因徵信未通過，案件撤件', '客戶改向其他銀行申辦，撤件'],
}

const REMARK_POOL = [
  '客戶補件中，預計三日內送達',
  '等待主管批示，已提醒加速處理',
  '待保證人資料齊備後續辦',
  '等待鑑價公司回覆估價報告',
  '徵信結果確認中，暫無異常',
  '案件進度正常，依排程推進',
  '已通知客戶對保時間，待確認',
  '客戶要求延後對保，協調中',
  '',
]

let attachmentSeed = 3
function nextAttachments(): number {
  attachmentSeed = (attachmentSeed * 5 + 7) % 9
  return attachmentSeed + 1
}

interface CaseSeed {
  customerName: string
  loanAmount: number
  loanType: string
  officer: string
  createdDaysAgo: number
  currentStage: StageKey
  lastUpdatedDaysAgo: number
  remarks: string
  withdrawnAfterIndex?: number // index in STAGE_ORDER of last completed stage before withdrawal
}

function buildTimeline(seed: CaseSeed): TimelineStep[] {
  const lastUpdated = daysAgo(seed.lastUpdatedDaysAgo)

  if (seed.currentStage === 'withdrawn') {
    const cutoff = seed.withdrawnAfterIndex ?? 1
    const completedStages = STAGE_ORDER.slice(0, cutoff + 1)
    const span = Math.max(seed.createdDaysAgo - seed.lastUpdatedDaysAgo, completedStages.length)
    const steps: TimelineStep[] = completedStages.map((key, i) => {
      const gap = Math.round((span / (completedStages.length + 1)) * (i + 1))
      return {
        key,
        label: STAGE_CONFIG[key].label,
        status: 'completed',
        completedDate: iso(daysAgo(seed.createdDaysAgo - gap)),
        officer: seed.officer,
        note: STAGE_NOTES[key][i % STAGE_NOTES[key].length],
        attachments: nextAttachments(),
        description: `${STAGE_CONFIG[key].label}作業已完成，資料已歸檔存查。`,
      }
    })
    steps.push({
      key: 'withdrawn',
      label: '撤件',
      status: 'withdrawn',
      completedDate: iso(lastUpdated),
      officer: seed.officer,
      note: STAGE_NOTES.withdrawn[(cutoff + steps.length) % STAGE_NOTES.withdrawn.length],
      attachments: 0,
      description: '案件已撤件，流程終止。',
    })
    return steps
  }

  const currentIdx = STAGE_ORDER.indexOf(seed.currentStage)
  const isFullyDone = seed.currentStage === 'disbursement'
  const completedCount = isFullyDone ? STAGE_ORDER.length : currentIdx
  const span = Math.max(seed.createdDaysAgo - seed.lastUpdatedDaysAgo, completedCount || 1)

  return STAGE_ORDER.map((key, i) => {
    const cfg = STAGE_CONFIG[key]
    if (i < completedCount || (isFullyDone && i === STAGE_ORDER.length - 1)) {
      const gap = Math.round((span / (STAGE_ORDER.length + 1)) * (i + 1))
      const completedDate = i === STAGE_ORDER.length - 1 && isFullyDone ? lastUpdated : daysAgo(seed.createdDaysAgo - gap)
      return {
        key,
        label: cfg.label,
        status: 'completed' as const,
        completedDate: iso(completedDate),
        officer: seed.officer,
        note: STAGE_NOTES[key][i % STAGE_NOTES[key].length],
        attachments: nextAttachments(),
        description: `${cfg.label}作業已完成，資料已歸檔存查。`,
      }
    }
    if (i === currentIdx) {
      return {
        key,
        label: cfg.label,
        status: 'current' as const,
        officer: seed.officer,
        note: STAGE_NOTES[key][(i + 1) % STAGE_NOTES[key].length],
        attachments: nextAttachments(),
        description: `${cfg.label}進行中，${seed.officer}承辦處理。`,
      }
    }
    return {
      key,
      label: cfg.label,
      status: 'pending' as const,
      description: `尚未進入${cfg.label}階段。`,
    }
  })
}

function buildCase(id: string, seed: CaseSeed): LoanCase {
  return {
    id,
    customerName: seed.customerName,
    loanAmount: seed.loanAmount,
    loanType: seed.loanType,
    officer: seed.officer,
    createdDate: iso(daysAgo(seed.createdDaysAgo)),
    currentStage: seed.currentStage,
    progress: stageProgress(seed.currentStage),
    lastUpdated: iso(daysAgo(seed.lastUpdatedDaysAgo)),
    remarks: seed.remarks,
    timeline: buildTimeline(seed),
  }
}

const seeds: CaseSeed[] = [
  // 受理 intake (3)
  { customerName: '陳建宇', loanAmount: 8_500_000, loanType: '房屋貸款', officer: '王建宏', createdDaysAgo: 0, currentStage: 'intake', lastUpdatedDaysAgo: 0, remarks: '客戶補件中，預計三日內送達' },
  { customerName: '林淑芬', loanAmount: 600_000, loanType: '信用貸款', officer: '陳怡君', createdDaysAgo: 9, currentStage: 'intake', lastUpdatedDaysAgo: 9, remarks: '案件受理後尚待承辦人指派' },
  { customerName: '王大明', loanAmount: 1_200_000, loanType: '汽車貸款', officer: '林俊傑', createdDaysAgo: 0, currentStage: 'intake', lastUpdatedDaysAgo: 0, remarks: '' },

  // 估價 appraisal (3)
  { customerName: '張雅雯', loanAmount: 12_000_000, loanType: '房屋貸款', officer: '張雅婷', createdDaysAgo: 6, currentStage: 'appraisal', lastUpdatedDaysAgo: 3, remarks: '等待鑑價公司回覆估價報告' },
  { customerName: '李承翰', loanAmount: 15_800_000, loanType: '二胎房貸', officer: '李思穎', createdDaysAgo: 14, currentStage: 'appraisal', lastUpdatedDaysAgo: 10, remarks: '鑑價人員已預約現場勘查時間' },
  { customerName: '黃美惠', loanAmount: 9_600_000, loanType: '房屋貸款', officer: '黃志明', createdDaysAgo: 4, currentStage: 'appraisal', lastUpdatedDaysAgo: 2, remarks: '' },

  // 徵信 credit (3)
  { customerName: '吳宗翰', loanAmount: 3_000_000, loanType: '企業貸款', officer: '吳佩珊', createdDaysAgo: 5, currentStage: 'credit', lastUpdatedDaysAgo: 4, remarks: '徵信結果確認中，暫無異常' },
  { customerName: '蔡佩君', loanAmount: 800_000, loanType: '信用貸款', officer: '蔡文彬', createdDaysAgo: 16, currentStage: 'credit', lastUpdatedDaysAgo: 11, remarks: '聯徵查詢異常，需重新確認收入資料' },
  { customerName: '楊志豪', loanAmount: 2_200_000, loanType: '留學貸款', officer: '王建宏', createdDaysAgo: 3, currentStage: 'credit', lastUpdatedDaysAgo: 1, remarks: '' },

  // 批示 approval (3)
  { customerName: '劉冠廷', loanAmount: 6_500_000, loanType: '房屋貸款', officer: '陳怡君', createdDaysAgo: 8, currentStage: 'approval', lastUpdatedDaysAgo: 5, remarks: '等待主管批示，已提醒加速處理' },
  { customerName: '鄭雅文', loanAmount: 18_000_000, loanType: '企業貸款', officer: '林俊傑', createdDaysAgo: 20, currentStage: 'approval', lastUpdatedDaysAgo: 13, remarks: '待授信會議核決額度' },
  { customerName: '許志偉', loanAmount: 1_500_000, loanType: '裝修貸款', officer: '張雅婷', createdDaysAgo: 6, currentStage: 'approval', lastUpdatedDaysAgo: 4, remarks: '' },

  // 對保 contract (2)
  { customerName: '謝佳蓉', loanAmount: 5_400_000, loanType: '房屋貸款', officer: '李思穎', createdDaysAgo: 12, currentStage: 'contract', lastUpdatedDaysAgo: 8, remarks: '待保證人資料齊備後續辦' },
  { customerName: '郭建志', loanAmount: 950_000, loanType: '汽車貸款', officer: '黃志明', createdDaysAgo: 7, currentStage: 'contract', lastUpdatedDaysAgo: 2, remarks: '已通知客戶對保時間，待確認' },

  // 撥款 disbursement / 已完成 (18)
  { customerName: '曾詩涵', loanAmount: 7_200_000, loanType: '房屋貸款', officer: '吳佩珊', createdDaysAgo: 30, currentStage: 'disbursement', lastUpdatedDaysAgo: 1, remarks: '案件已結案' },
  { customerName: '蘇柏翰', loanAmount: 4_300_000, loanType: '企業貸款', officer: '蔡文彬', createdDaysAgo: 33, currentStage: 'disbursement', lastUpdatedDaysAgo: 2, remarks: '案件已結案' },
  { customerName: '賴怡如', loanAmount: 650_000, loanType: '信用貸款', officer: '王建宏', createdDaysAgo: 25, currentStage: 'disbursement', lastUpdatedDaysAgo: 3, remarks: '案件已結案' },
  { customerName: '周俊宏', loanAmount: 11_000_000, loanType: '房屋貸款', officer: '陳怡君', createdDaysAgo: 40, currentStage: 'disbursement', lastUpdatedDaysAgo: 5, remarks: '案件已結案' },
  { customerName: '洪雅萍', loanAmount: 2_800_000, loanType: '留學貸款', officer: '林俊傑', createdDaysAgo: 28, currentStage: 'disbursement', lastUpdatedDaysAgo: 6, remarks: '案件已結案' },
  { customerName: '邱冠宇', loanAmount: 1_800_000, loanType: '汽車貸款', officer: '張雅婷', createdDaysAgo: 22, currentStage: 'disbursement', lastUpdatedDaysAgo: 1, remarks: '案件已結案' },
  { customerName: '潘思妤', loanAmount: 9_900_000, loanType: '房屋貸款', officer: '李思穎', createdDaysAgo: 35, currentStage: 'disbursement', lastUpdatedDaysAgo: 4, remarks: '案件已結案' },
  { customerName: '高俊傑', loanAmount: 3_600_000, loanType: '裝修貸款', officer: '黃志明', createdDaysAgo: 27, currentStage: 'disbursement', lastUpdatedDaysAgo: 2, remarks: '案件已結案' },
  { customerName: '蕭雅芳', loanAmount: 720_000, loanType: '信用貸款', officer: '吳佩珊', createdDaysAgo: 18, currentStage: 'disbursement', lastUpdatedDaysAgo: 0, remarks: '案件已結案' },
  { customerName: '游承恩', loanAmount: 15_200_000, loanType: '二胎房貸', officer: '蔡文彬', createdDaysAgo: 45, currentStage: 'disbursement', lastUpdatedDaysAgo: 7, remarks: '案件已結案' },
  { customerName: '江美玲', loanAmount: 5_100_000, loanType: '企業貸款', officer: '王建宏', createdDaysAgo: 24, currentStage: 'disbursement', lastUpdatedDaysAgo: 3, remarks: '案件已結案' },
  { customerName: '顏志強', loanAmount: 1_100_000, loanType: '汽車貸款', officer: '陳怡君', createdDaysAgo: 20, currentStage: 'disbursement', lastUpdatedDaysAgo: 2, remarks: '案件已結案' },
  { customerName: '簡佩瑜', loanAmount: 8_800_000, loanType: '房屋貸款', officer: '林俊傑', createdDaysAgo: 32, currentStage: 'disbursement', lastUpdatedDaysAgo: 5, remarks: '案件已結案' },
  { customerName: '范文彬', loanAmount: 2_400_000, loanType: '信用貸款', officer: '張雅婷', createdDaysAgo: 19, currentStage: 'disbursement', lastUpdatedDaysAgo: 0, remarks: '案件已結案' },
  { customerName: '石家豪', loanAmount: 6_700_000, loanType: '房屋貸款', officer: '李思穎', createdDaysAgo: 29, currentStage: 'disbursement', lastUpdatedDaysAgo: 4, remarks: '案件已結案' },
  { customerName: '姚雅琪', loanAmount: 980_000, loanType: '裝修貸款', officer: '黃志明', createdDaysAgo: 17, currentStage: 'disbursement', lastUpdatedDaysAgo: 2, remarks: '案件已結案' },
  { customerName: '白俊彥', loanAmount: 13_500_000, loanType: '企業貸款', officer: '吳佩珊', createdDaysAgo: 38, currentStage: 'disbursement', lastUpdatedDaysAgo: 6, remarks: '案件已結案' },
  { customerName: '康怡萱', loanAmount: 4_950_000, loanType: '房屋貸款', officer: '蔡文彬', createdDaysAgo: 26, currentStage: 'disbursement', lastUpdatedDaysAgo: 3, remarks: '案件已結案' },

  // 撤件 withdrawn (3)
  { customerName: '廖建成', loanAmount: 2_000_000, loanType: '信用貸款', officer: '王建宏', createdDaysAgo: 15, currentStage: 'withdrawn', lastUpdatedDaysAgo: 6, remarks: '客戶主動撤回申請', withdrawnAfterIndex: 0 },
  { customerName: '尤佳蓉', loanAmount: 6_200_000, loanType: '房屋貸款', officer: '陳怡君', createdDaysAgo: 21, currentStage: 'withdrawn', lastUpdatedDaysAgo: 9, remarks: '因徵信未通過，案件撤件', withdrawnAfterIndex: 2 },
  { customerName: '阮志明', loanAmount: 1_300_000, loanType: '汽車貸款', officer: '林俊傑', createdDaysAgo: 11, currentStage: 'withdrawn', lastUpdatedDaysAgo: 4, remarks: '客戶改向其他銀行申辦', withdrawnAfterIndex: 1 },
]

export const LOAN_CASES: LoanCase[] = seeds.map((seed, i) =>
  buildCase(`LN-2026-${String(1000 + i)}`, seed)
)

export const REMARK_SUGGESTIONS = REMARK_POOL.filter(Boolean)

export const OFFICERS = Array.from(new Set(LOAN_CASES.map((c) => c.officer)))
export const LOAN_TYPES = Array.from(new Set(LOAN_CASES.map((c) => c.loanType)))
