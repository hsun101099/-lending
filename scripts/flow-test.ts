/**
 * 完整流程自動測試。
 *
 * 重點在於驗證「寫回 Firestore 的資料」始終合法：Firestore 會拒絕
 * 值為 undefined 的欄位，先前更新流程失敗即肇因於此。
 * 執行方式：npx tsx scripts/flow-test.ts
 */
import { STAGE_ORDER, STAGE_CONFIG, ALL_FILTER_STAGES, stageProgress } from '../src/data/stages'
import { LOAN_TYPE_OPTIONS } from '../src/data/loanTypes'
import { CATEGORY_OPTIONS } from '../src/data/categories'
import { buildCase, advanceStage, withdrawCase, type NewCaseInput } from '../src/utils/caseActions'
import { normalizeCase } from '../src/utils/normalizeCase'
import { applyReportFilters, describeFilters, EMPTY_REPORT_FILTERS } from '../src/utils/reportFilters'
import { getSummaryCounts, getManagerMetrics, getDailyCompletionSeries, getMonthlyNewCaseSeries } from '../src/utils/metrics'
import { formatWan, wanToNt, formatDate } from '../src/utils/format'
import type { LoanCase } from '../src/types'

let failures = 0
let checks = 0

function check(condition: boolean, label: string, detail = '') {
  checks++
  if (!condition) {
    failures++
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

/** 找出物件中任何值為 undefined 的欄位路徑（Firestore 會因此整筆寫入失敗）。 */
function findUndefinedPaths(value: unknown, path = '$'): string[] {
  if (value === undefined) return [path]
  if (value === null || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap((v, i) => findUndefinedPaths(v, `${path}[${i}]`))
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    findUndefinedPaths(v, `${path}.${k}`)
  )
}

/** 模擬存入 Firestore 再讀回：寫入前檢查合法性，讀回時套用資料轉換。 */
function roundTrip(loanCase: LoanCase, label: string): LoanCase {
  const { id, ...payload } = loanCase
  const bad = findUndefinedPaths(payload)
  check(bad.length === 0, `${label}：可安全寫入 Firestore`, bad.join(', '))
  return normalizeCase(JSON.parse(JSON.stringify({ ...payload, id })) as LoanCase)
}

function makeInput(i: number, stage = STAGE_ORDER[0]): NewCaseInput {
  return {
    customerName: `客戶${i}`,
    loanAmount: wanToNt((i + 1) * 130),
    loanType: LOAN_TYPE_OPTIONS[i % LOAN_TYPE_OPTIONS.length],
    category: CATEGORY_OPTIONS[i % CATEGORY_OPTIONS.length],
    officer: i % 2 === 0 ? '王先生' : '盧小姐',
    createdDate: `2026-07-${String((i % 27) + 1).padStart(2, '0')}`,
    remarks: i % 3 === 0 ? '客戶補件中' : '',
    currentStage: stage,
  }
}

console.log('\n=== 1. 十次完整流程：受理 → 撥款（每關都存檔再讀回）===')
const completed: LoanCase[] = []
for (let run = 0; run < 10; run++) {
  let c = buildCase(makeInput(run), `LN-2026-${2000 + run}`)
  c = roundTrip(c, `第${run + 1}輪 建立`)

  check(c.currentStage === 'intake', `第${run + 1}輪 起始於受理`, c.currentStage)
  check(c.progress === stageProgress('intake'), `第${run + 1}輪 起始進度`, String(c.progress))

  for (let step = 1; step < STAGE_ORDER.length; step++) {
    const before = c.currentStage
    c = advanceStage(c)
    c = roundTrip(c, `第${run + 1}輪 更新至${STAGE_CONFIG[c.currentStage].label}`)

    check(c.currentStage === STAGE_ORDER[step], `第${run + 1}輪 第${step}次推進`, `${before} → ${c.currentStage}`)
    check(c.progress === stageProgress(c.currentStage), `第${run + 1}輪 進度同步`, String(c.progress))
    check(c.timeline.length === STAGE_ORDER.length, `第${run + 1}輪 時間軸完整`, String(c.timeline.length))

    const isFinal = c.currentStage === 'disbursement'
    const currents = c.timeline.filter((t) => t.status === 'current')
    check(currents.length === (isFinal ? 0 : 1), `第${run + 1}輪 進行中關卡數`, String(currents.length))
    const doneCount = c.timeline.filter((t) => t.status === 'completed').length
    const expectedDone = isFinal ? STAGE_ORDER.length : step
    check(doneCount === expectedDone, `第${run + 1}輪 已完成關數`, `${doneCount} 應為 ${expectedDone}`)
    c.timeline
      .filter((t) => t.status === 'completed')
      .forEach((t) => check(!!t.completedDate, `第${run + 1}輪 ${t.label} 有完成日期`))
  }

  check(c.currentStage === 'disbursement', `第${run + 1}輪 終點為撥款`, c.currentStage)
  check(c.progress === 100, `第${run + 1}輪 終點進度 100%`, String(c.progress))
  check(
    c.timeline.every((t) => t.status === 'completed'),
    `第${run + 1}輪 撥款後全部關卡完成`
  )

  const noOp = advanceStage(c)
  check(noOp.currentStage === 'disbursement', `第${run + 1}輪 已撥款不可再推進`)
  completed.push(c)
}

console.log('=== 2. 撤件：於每一關撤件皆須正確 ===')
// 撥款為已結案狀態，依設計不可撤件，故排除於此迴圈外單獨驗證
for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
  let c = buildCase(makeInput(i, STAGE_ORDER[i]), `LN-2026-${3000 + i}`)
  c = roundTrip(c, `${STAGE_CONFIG[STAGE_ORDER[i]].label} 建立`)
  c = withdrawCase(c)
  c = roundTrip(c, `於${STAGE_CONFIG[STAGE_ORDER[i]].label}撤件`)

  check(c.currentStage === 'withdrawn', `於${STAGE_CONFIG[STAGE_ORDER[i]].label}撤件後狀態`, c.currentStage)
  const last = c.timeline[c.timeline.length - 1]
  check(last.key === 'withdrawn' && last.status === 'withdrawn', `撤件為時間軸最後一關`)
  check(c.timeline.filter((t) => t.status === 'current').length === 0, `撤件後無進行中關卡`)
  check(withdrawCase(c).currentStage === 'withdrawn', `撤件後再次撤件不變`)
  check(advanceStage(c).currentStage === 'withdrawn', `撤件後不可推進`)
}

// 已撥款結案的案件不得被撤件
const settled = buildCase(makeInput(0, 'disbursement'), 'LN-2026-3900')
check(withdrawCase(settled).currentStage === 'disbursement', '已撥款案件不可撤件')

console.log('=== 3. 直接從中段建立（登打已在辦理中的案件）===')
STAGE_ORDER.forEach((stage, idx) => {
  let c = buildCase(makeInput(idx, stage), `LN-2026-${4000 + idx}`)
  c = roundTrip(c, `直接建立於${STAGE_CONFIG[stage].label}`)
  const done = c.timeline.filter((t) => t.status === 'completed').length
  const expected = stage === 'disbursement' ? STAGE_ORDER.length : idx
  check(done === expected, `建立於${STAGE_CONFIG[stage].label} 前置關卡標記為完成`, `${done} 應為 ${expected}`)
  check(c.progress === stageProgress(stage), `建立於${STAGE_CONFIG[stage].label} 進度正確`)
})

console.log('=== 4. 舊版資料相容（6 關時代留下的案件）===')
const legacy = {
  id: 'LN-2026-1005',
  customerName: '王永慶',
  loanAmount: 60_000_000,
  loanType: '信保基金',
  officer: '盧小姐',
  createdDate: '2026-07-23',
  currentStage: 'approval',
  progress: 67,
  lastUpdated: '2026-07-23',
  remarks: '',
  timeline: [
    { key: 'intake', label: '受理', status: 'completed', completedDate: '2026-07-23', officer: '盧小姐' },
    { key: 'appraisal', label: '估價', status: 'completed', completedDate: '2026-07-23' },
    { key: 'credit', label: '徵信', status: 'completed' },
    { key: 'approval', label: '批示', status: 'current' },
    { key: 'contract', label: '對保', status: 'pending' },
    { key: 'disbursement', label: '撥款', status: 'pending' },
  ],
} as unknown as LoanCase

let migrated = normalizeCase(legacy)
check(migrated.timeline.length === STAGE_ORDER.length, '舊案件時間軸補齊為 11 關', String(migrated.timeline.length))
check(migrated.currentStage === 'approval', '舊案件維持在單位批示')
check(migrated.progress === stageProgress('approval'), '舊案件進度依新流程重算', String(migrated.progress))
check(findUndefinedPaths(migrated).length === 0, '舊案件轉換後可寫入 Firestore', findUndefinedPaths(migrated).join(', '))

// 這正是回報的失敗情境：讀取舊案件後按「更新流程」
migrated = advanceStage(migrated)
const advancedBad = findUndefinedPaths((({ id, ...rest }) => rest)(migrated))
check(advancedBad.length === 0, '舊案件更新流程後可寫入 Firestore', advancedBad.join(', '))
check(migrated.currentStage === 'headOffice', '舊案件推進至總社批示', migrated.currentStage)

// 缺欄位、狀態不明的殘缺資料
const broken = { id: 'LN-X', customerName: '殘缺', loanAmount: 0, loanType: '', officer: '',
  createdDate: '2026-07-01', currentStage: 'unknown-stage', progress: 0, lastUpdated: '2026-07-01',
  remarks: '' } as unknown as LoanCase
const fixed = normalizeCase(broken)
check(fixed.currentStage === 'intake', '未知階段回復為受理', fixed.currentStage)
check(fixed.timeline.length === STAGE_ORDER.length, '缺少時間軸時自動補齊')
check(findUndefinedPaths(fixed).length === 0, '殘缺資料轉換後可寫入 Firestore')

console.log('=== 5. 統計與報表 ===')
const mixed = [
  ...completed,
  ...STAGE_ORDER.map((s, i) => buildCase(makeInput(i, s), `LN-2026-${5000 + i}`)),
  withdrawCase(buildCase(makeInput(1, 'credit'), 'LN-2026-5900')),
]
const summary = getSummaryCounts(mixed)
check(summary.total === mixed.length, '案件總數', `${summary.total}/${mixed.length}`)
check(
  summary.total === summary.processing + summary.completed + summary.withdrawn,
  '處理中＋已完成＋撤件＝總數',
  `${summary.processing}+${summary.completed}+${summary.withdrawn}`
)
check(summary.withdrawn === 1, '撤件計數', String(summary.withdrawn))

const metrics = getManagerMetrics(mixed, new Date('2026-07-15T10:00:00'))
check(metrics.stuckCases >= 0 && Number.isFinite(metrics.avgProcessingDays), '主管指標為有效數值')
check(getDailyCompletionSeries(mixed, new Date('2026-07-15T10:00:00')).length === 14, '每日完成序列 14 天')
check(getMonthlyNewCaseSeries(mixed, new Date('2026-07-15T10:00:00')).length === 15, '本月序列至當日')

check(applyReportFilters(mixed, EMPTY_REPORT_FILTERS).length === mixed.length, '空條件回傳全部')
check(
  applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '王先生' }).every((c) => c.officer === '王先生'),
  '承辦人篩選'
)
check(
  applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, stages: ['withdrawn'] }).length === 1,
  '流程階段篩選'
)
const ranged = applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, dateFrom: '2026-07-05', dateTo: '2026-07-10' })
check(ranged.every((c) => c.createdDate >= '2026-07-05' && c.createdDate <= '2026-07-10'), '日期區間篩選')
check(applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, dateFrom: '2027-01-01' }).length === 0, '無符合時回傳空陣列')
check(describeFilters(EMPTY_REPORT_FILTERS).includes('全部'), '無條件時的說明文字')
check(describeFilters({ ...EMPTY_REPORT_FILTERS, officer: '王先生' }).includes('王先生'), '條件說明含承辦人')

console.log('=== 6. 顯示格式 ===')
check(formatWan(60_000_000) === '6,000萬', '金額轉萬（含千分位）', formatWan(60_000_000))
check(formatWan(wanToNt(130)) === '130萬', '萬↔元 轉換一致', formatWan(wanToNt(130)))
check(formatWan(0) === '0萬', '零金額', formatWan(0))
check(formatDate('2026-07-23') === '2026/07/23', '日期格式', formatDate('2026-07-23'))
check(ALL_FILTER_STAGES.length === STAGE_ORDER.length + 1, '篩選階段含撤件')
check(new Set(STAGE_ORDER).size === STAGE_ORDER.length, '流程階段無重複')
check(
  ALL_FILTER_STAGES.every((s) => !!STAGE_CONFIG[s]?.label && !!STAGE_CONFIG[s]?.color),
  '每個階段都有名稱與顏色'
)

console.log(`\n${failures === 0 ? '✅ 全部通過' : '❌ 有失敗項目'}：${checks - failures}/${checks} 項檢查通過\n`)
process.exit(failures === 0 ? 0 : 1)
