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
import {
  buildCase,
  advanceStage,
  withdrawCase,
  addStepNote,
  removeStepNote,
  revertStage,
  updateTimelineStep,
  type NewCaseInput,
} from '../src/utils/caseActions'
import { normalizeCase } from '../src/utils/normalizeCase'
import { getTodayIso } from '../src/utils/today'
import {
  applyReportFilters,
  countActiveFilters,
  describeFilters,
  describeSort,
  EMPTY_REPORT_FILTERS,
  recentDaysRange,
  sortReportCases,
} from '../src/utils/reportFilters'
import { getSummaryCounts, getManagerMetrics, getDailyCompletionSeries, getMonthlyNewCaseSeries } from '../src/utils/metrics'
import { formatWan, wanToNt, formatDate, validateAmountWan } from '../src/utils/format'
import { describeDeletedAt, isDeleted, partitionCases } from '../src/utils/recycleBin'
import { compareCaseIdDesc, isLegacyCaseId } from '../src/utils/caseId'
import { needsRenumber, planRenumber } from '../src/utils/renumberCases'
import {
  getEmployeeId,
  MAX_ACCOUNT_GENERATION,
  normalizeEmployeeId,
  resolveSecret,
  validateEmployeeId,
  validatePassword,
} from '../src/hooks/useAuth'
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
  '受理人篩選'
)
// 受理人改為手動輸入後，篩選以「包含」比對，打幾個字就找得到
check(
  applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '王' }).every((c) => c.officer.includes('王')),
  '受理人只打一個字也找得到'
)
check(
  applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '王' }).length ===
    applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '王先生' }).length,
  '打部分字與打全名結果一致'
)
check(
  applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: ' 王先生 ' }).length ===
    applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '王先生' }).length,
  '前後空白不影響受理人篩選'
)
check(applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '   ' }).length === mixed.length, '只打空白視為不篩選')
check(applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, officer: '查無此人' }).length === 0, '查無受理人時回傳空陣列')
check(
  applyReportFilters(
    [{ ...mixed[0], officer: 'Alice Wang' }],
    { ...EMPTY_REPORT_FILTERS, officer: 'alice' }
  ).length === 1,
  '英文受理人不分大小寫'
)
check(describeFilters({ ...EMPTY_REPORT_FILTERS, officer: ' 王先生 ' }).includes('受理人：王先生'), '條件說明去除空白')
check(
  applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, stages: ['withdrawn'] }).length === 1,
  '流程階段篩選'
)
const ranged = applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, dateFrom: '2026-07-05', dateTo: '2026-07-10' })
check(ranged.every((c) => c.createdDate >= '2026-07-05' && c.createdDate <= '2026-07-10'), '日期區間篩選')
check(applyReportFilters(mixed, { ...EMPTY_REPORT_FILTERS, dateFrom: '2027-01-01' }).length === 0, '無符合時回傳空陣列')
check(describeFilters(EMPTY_REPORT_FILTERS).includes('全部'), '無條件時的說明文字')
check(describeFilters({ ...EMPTY_REPORT_FILTERS, officer: '王先生' }).includes('王先生'), '條件說明含受理人')

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

// 貸款金額：0 起跳，任何數字都能填
check(validateAmountWan('500') === '', '整數金額可用', validateAmountWan('500'))
check(validateAmountWan('555') === '', '不是 10 的倍數也可用', validateAmountWan('555'))
check(validateAmountWan('125') === '', '125 萬可用', validateAmountWan('125'))
check(validateAmountWan('1') === '', '1 萬可用', validateAmountWan('1'))
check(validateAmountWan('0.5') === '', '小數可用（0.5 萬＝5 千）', validateAmountWan('0.5'))
check(validateAmountWan('0') === '', '0 可用', validateAmountWan('0'))
check(validateAmountWan(' 320 ') === '', '前後空白不影響', validateAmountWan(' 320 '))
check(validateAmountWan('') !== '', '沒填要提醒')
check(validateAmountWan('   ') !== '', '只打空白要提醒')
check(validateAmountWan('-5') !== '', '負數要擋下')
check(validateAmountWan('abc') !== '', '不是數字要擋下')
check(/[一-龥]/.test(validateAmountWan('')), '錯誤訊息是中文', validateAmountWan(''))
check(wanToNt(0.5) === 5000, '0.5 萬換算為 5,000 元', String(wanToNt(0.5)))
check(wanToNt(125) === 1_250_000, '125 萬換算正確', String(wanToNt(125)))
check(formatWan(wanToNt(555)) === '555萬', '555 萬顯示正確', formatWan(wanToNt(555)))

console.log('=== 7. 刪除與復原（回收桶）===')
{
  const sample = mixed.slice(0, 5)
  const deletedAt = '2026-07-15T09:00:00.000Z'
  const removed: LoanCase = { ...sample[1], deletedAt, deletedBy: '王先生' }
  const withTrash = [sample[0], removed, sample[2], { ...sample[3], deletedAt: '2026-07-16T09:00:00.000Z' }]

  check(isDeleted(removed), '有 deletedAt 即視為已刪除')
  check(!isDeleted(sample[0]), '沒有 deletedAt 即為一般案件')

  const { active, deleted } = partitionCases(withTrash)
  check(active.length === 2, '已刪除案件不列入一般清單', String(active.length))
  check(deleted.length === 2, '已刪除案件進入回收桶', String(deleted.length))
  check(active.every((c) => !c.deletedAt), '一般清單不含刪除標記')
  check(deleted[0].deletedAt === '2026-07-16T09:00:00.000Z', '回收桶以最近刪除的排最前面', deleted[0].deletedAt ?? '')

  // 統計與報表都只吃 active，刪除的案件不能影響數字
  const before = getSummaryCounts(partitionCases(sample).active)
  const after = getSummaryCounts(partitionCases([...sample.slice(0, 1), removed, ...sample.slice(2)]).active)
  check(after.total === before.total - 1, '刪除後統計扣除該案件', `${before.total} → ${after.total}`)
  check(
    applyReportFilters(partitionCases(withTrash).active, EMPTY_REPORT_FILTERS).every((c) => !c.deletedAt),
    '報表不會印出已刪除案件'
  )

  // 復原＝清掉刪除標記，其餘欄位原封不動
  const { deletedAt: _a, deletedBy: _b, ...restored } = removed
  check(!isDeleted(restored as LoanCase), '復原後回到一般狀態')
  check(
    JSON.stringify({ ...(restored as LoanCase), timeline: [] }) === JSON.stringify({ ...sample[1], timeline: [] }),
    '復原後案件內容與刪除前一致'
  )
  const bad = findUndefinedPaths(restored)
  check(bad.length === 0, '復原後的案件可安全寫入 Firestore', bad.join(', '))

  const now = new Date('2026-07-15T09:30:00.000Z')
  check(describeDeletedAt(deletedAt, now) === '30 分鐘前', '刪除時間顯示', describeDeletedAt(deletedAt, now))
  check(describeDeletedAt(undefined, now) === '', '沒有刪除時間則不顯示')
  check(describeDeletedAt('2026-07-15T09:29:40.000Z', now) === '剛剛', '剛刪除的顯示為「剛剛」')
}

console.log('=== 8. 員編登入 ===')
{
  check(normalizeEmployeeId(' A1234 ') === 'a1234', '員編去除空白並轉小寫', normalizeEmployeeId(' A1234 '))
  check(normalizeEmployeeId('1234') === '1234', '純數字員編維持原樣（舊帳號相容）', normalizeEmployeeId('1234'))
  check(normalizeEmployeeId('a1234') === normalizeEmployeeId('A1234'), '大小寫視為同一人')
  check(validateEmployeeId('') === '請輸入員編', '空白時提示輸入')
  check(validateEmployeeId('12') !== '', '太短的員編不通過')
  check(validateEmployeeId('1234') === '', '4 碼數字員編通過（既有帳號）', validateEmployeeId('1234'))
  check(validateEmployeeId('A12345') === '', '英數員編通過', validateEmployeeId('A12345'))
  check(validateEmployeeId('A-1234') === '', '含連字號的員編通過', validateEmployeeId('A-1234'))
  check(validateEmployeeId('王小明') !== '', '中文員編不通過')
  check(validateEmployeeId('a b@c') !== '', '含特殊符號不通過')
}

console.log('=== 9. 補登舊案件：每一關可自己填日期 ===')
{
  const old = buildCase(
    {
      ...makeInput(0, 'contract'),
      createdDate: '2025-03-10',
      stageDates: {
        intake: '2025-03-10',
        appraisal: '2025-03-18',
        credit: '2025-04-02',
        approval: '2025-04-20',
        headOffice: '2025-05-06',
        creditReview: '2025-05-30',
      },
    },
    '7'
  )
  const byKey = new Map(old.timeline.map((s) => [s.key, s]))
  check(byKey.get('intake')?.completedDate === '2025-03-10', '受理日期依填寫值', byKey.get('intake')?.completedDate)
  check(byKey.get('credit')?.completedDate === '2025-04-02', '徵信日期依填寫值', byKey.get('credit')?.completedDate)
  check(
    byKey.get('creditReview')?.completedDate === '2025-05-30',
    '授管室書審日期依填寫值',
    byKey.get('creditReview')?.completedDate
  )
  check(byKey.get('contract')?.status === 'current', '選到的那一關為進行中')
  check(old.lastUpdated === '2025-05-30', '最後異動日取最後一關的日期', old.lastUpdated)

  const partial = buildCase({ ...makeInput(1, 'credit'), createdDate: '2025-01-05', stageDates: { appraisal: '2025-02-02' } }, '8')
  const partialByKey = new Map(partial.timeline.map((s) => [s.key, s]))
  check(partialByKey.get('intake')?.completedDate === '2025-01-05', '沒填的關卡沿用建立日期')
  check(partialByKey.get('appraisal')?.completedDate === '2025-02-02', '有填的關卡用填寫的日期')
  check(findUndefinedPaths(partial).length === 0, '補登的案件可安全寫入 Firestore')

  // 事後在時間軸上修正日期
  const fixed = updateTimelineStep(partial, 'appraisal', { completedDate: '2025-02-10' })
  check(
    fixed.timeline.find((s) => s.key === 'appraisal')?.completedDate === '2025-02-10',
    '事後可修改單一關卡的日期'
  )
  const cleared = updateTimelineStep(fixed, 'appraisal', { completedDate: '' })
  check(cleared.timeline.find((s) => s.key === 'appraisal')?.completedDate === undefined, '清空日期不會留下空字串')
  check(findUndefinedPaths(cleared).length === 0, '修改日期後可安全寫入 Firestore')

  // 先改日期再按「更新流程」：要沿用自己填的日期，不能被改成今天
  const today = getTodayIso()
  {
    let c = buildCase(makeInput(0, 'approval'), '81')
    c = updateTimelineStep(c, 'approval', { completedDate: '2026-08-13' })
    check(c.timeline.find((s) => s.key === 'approval')?.completedDate === '2026-08-13', '進行中的關卡也能先填日期')

    c = advanceStage(c)
    const approval = c.timeline.find((s) => s.key === 'approval')
    check(approval?.status === 'completed', '按更新後該關成為已完成')
    check(approval?.completedDate === '2026-08-13', '按更新後沿用自己填的日期', approval?.completedDate)
    check(c.currentStage === 'headOffice', '確實推進到下一關')
    check(c.timeline.find((s) => s.key === 'headOffice')?.completedDate === undefined, '新的進行中關卡還沒有日期')
    check(c.lastUpdated === today, '最後異動日仍記為今天', c.lastUpdated)
    check(findUndefinedPaths(c).length === 0, '沿用日期後可安全寫入 Firestore')
  }

  // 沒有自己填日期時，維持原本行為：填今天
  {
    let c = buildCase(makeInput(0, 'approval'), '82')
    c = advanceStage(c)
    check(
      c.timeline.find((s) => s.key === 'approval')?.completedDate === today,
      '沒填日期時仍自動填今天',
      c.timeline.find((s) => s.key === 'approval')?.completedDate
    )
  }

  // 最後一關（撥款）同樣沿用先填好的日期
  {
    let c = buildCase(makeInput(0, 'finalApproval'), '83')
    c = updateTimelineStep(c, 'disbursement', { completedDate: '2026-08-13' })
    c = advanceStage(c)
    check(c.currentStage === 'disbursement', '推進到撥款')
    check(
      c.timeline.find((s) => s.key === 'disbursement')?.completedDate === '2026-08-13',
      '撥款日期沿用先填好的',
      c.timeline.find((s) => s.key === 'disbursement')?.completedDate
    )
  }

  // 退回時日期會清掉，再按更新就回到「填今天」
  {
    let c = buildCase(makeInput(0, 'approval'), '84')
    c = updateTimelineStep(c, 'approval', { completedDate: '2026-08-13' })
    c = advanceStage(c)
    c = revertStage(c)
    check(c.currentStage === 'approval', '退回單位批示')
    check(c.timeline.find((s) => s.key === 'approval')?.completedDate === undefined, '退回會清掉日期')
    c = advanceStage(c)
    check(
      c.timeline.find((s) => s.key === 'approval')?.completedDate === today,
      '退回後再更新填今天',
      c.timeline.find((s) => s.key === 'approval')?.completedDate
    )
  }
}

console.log('=== 10. 流程備註：可累加、可個別刪除 ===')
{
  let c = buildCase(makeInput(2, 'credit'), '9')
  c = addStepNote(c, 'credit', '客戶補寄薪轉證明')
  check(c.timeline.find((s) => s.key === 'credit')?.notes?.length === 1, '新增第一則備註')

  c = addStepNote(c, 'credit', '聯徵已調閱')
  const notes = c.timeline.find((s) => s.key === 'credit')?.notes ?? []
  check(notes.length === 2, '再新增一則時保留原有備註', String(notes.length))
  check(notes[0] === '客戶補寄薪轉證明' && notes[1] === '聯徵已調閱', '備註依新增順序排列')

  c = addStepNote(c, 'intake', '臨櫃收件')
  check(c.timeline.find((s) => s.key === 'intake')?.notes?.length === 1, '不同關卡的備註各自獨立')
  check(c.timeline.find((s) => s.key === 'credit')?.notes?.length === 2, '新增別關備註不影響原本那關')

  c = addStepNote(c, 'credit', '   ')
  check(c.timeline.find((s) => s.key === 'credit')?.notes?.length === 2, '只打空白不會新增備註')

  c = roundTrip(c, '含備註的案件')
  check(c.timeline.find((s) => s.key === 'credit')?.notes?.length === 2, '存檔讀回後備註仍在')

  c = removeStepNote(c, 'credit', 0)
  const left = c.timeline.find((s) => s.key === 'credit')?.notes ?? []
  check(left.length === 1 && left[0] === '聯徵已調閱', '刪除指定的那一則，其餘保留')

  c = removeStepNote(c, 'credit', 0)
  check(c.timeline.find((s) => s.key === 'credit')?.notes === undefined, '刪光後不留下空陣列')
  check(findUndefinedPaths(c).length === 0, '刪除備註後可安全寫入 Firestore')

  // 舊資料的單則備註（note）要併進新的備註清單
  const legacyNote = normalizeCase({
    ...buildCase(makeInput(3, 'credit'), '10'),
    timeline: buildCase(makeInput(3, 'credit'), '10').timeline.map((s) =>
      s.key === 'credit' ? { ...s, note: '舊版留下的備註' } : s
    ),
  })
  check(
    legacyNote.timeline.find((s) => s.key === 'credit')?.notes?.[0] === '舊版留下的備註',
    '舊版的單則備註會併入新清單'
  )
  check(findUndefinedPaths(legacyNote).length === 0, '併入後可安全寫入 Firestore')
}

console.log('=== 11. 退回上一關（按錯時可還原）===')
{
  // 每一關推進後都要能退回
  for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
    let c = buildCase(makeInput(i, STAGE_ORDER[i]), `${100 + i}`)
    const before = c.currentStage
    c = advanceStage(c)
    c = roundTrip(c, `推進到${STAGE_CONFIG[c.currentStage].label}`)
    const advanced = c.currentStage
    c = revertStage(c)
    c = roundTrip(c, `從${STAGE_CONFIG[advanced].label}退回`)
    check(c.currentStage === before, `從${STAGE_CONFIG[advanced].label}退回${STAGE_CONFIG[before].label}`, c.currentStage)
    check(c.progress === stageProgress(before), '退回後進度跟著回復', String(c.progress))
    const backStep = c.timeline.find((s) => s.key === before)
    check(backStep?.status === 'current', '退回的那一關重新變成進行中', backStep?.status)
    check(backStep?.completedDate === undefined, '退回的那一關清掉完成日期')
    check(c.timeline.find((s) => s.key === advanced)?.status === 'pending', '被退回的關卡回到未開始')
    check(c.timeline.filter((s) => s.status === 'current').length === 1, '退回後只有一關進行中')
  }

  // 第一關沒有上一關
  const first = buildCase(makeInput(0, 'intake'), '200')
  check(revertStage(first).currentStage === 'intake', '第一關退回維持不變')

  // 撥款（結案）也要能退回
  let done = buildCase(makeInput(1, 'finalApproval'), '201')
  done = advanceStage(done)
  check(done.currentStage === 'disbursement', '先推進到撥款')
  done = roundTrip(revertStage(done), '從撥款退回')
  check(done.currentStage === 'finalApproval', '撥款可退回核定', done.currentStage)
  check(done.progress === stageProgress('finalApproval'), '退回後進度不再是 100%', String(done.progress))
  check(done.timeline.find((s) => s.key === 'disbursement')?.status === 'pending', '撥款回到未開始')

  // 撤件後退回＝把案件救回來
  let w = buildCase(makeInput(2, 'credit'), '202')
  w = withdrawCase(w)
  check(w.currentStage === 'withdrawn', '先撤件')
  w = roundTrip(revertStage(w), '撤件後退回')
  check(w.currentStage === 'credit', '撤件可退回原本那一關', w.currentStage)
  check(w.timeline.every((s) => s.key !== 'withdrawn'), '撤件紀錄已移除')
  check(w.timeline.filter((s) => s.status === 'current').length === 1, '救回後只有一關進行中')
  check(advanceStage(w).currentStage === 'approval', '救回後可以繼續往下走')

  // 退回不會動到備註
  let noted = addStepNote(buildCase(makeInput(3, 'credit'), '203'), 'credit', '客戶補件中')
  noted = revertStage(advanceStage(noted))
  check(
    noted.timeline.find((s) => s.key === 'credit')?.notes?.[0] === '客戶補件中',
    '退回後備註仍在'
  )
}

console.log('=== 12. 案件編號 1、2、3 ===')
{
  check(!isLegacyCaseId('1') && !isLegacyCaseId('42'), '純數字為新編號')
  check(isLegacyCaseId('LN-2026-1005'), '舊格式仍可辨識')

  const ids = ['LN-2026-1002', '2', 'LN-2026-1005', '10', '1']
  const sorted = [...ids].sort(compareCaseIdDesc)
  check(
    JSON.stringify(sorted) === JSON.stringify(['10', '2', '1', 'LN-2026-1005', 'LN-2026-1002']),
    '新編號由大到小在前，舊編號排在後面',
    sorted.join(', ')
  )
  check(compareCaseIdDesc('10', '9') < 0, '10 排在 9 前面（不是字串比大小）')
}

console.log('=== 13. 依建立時間重新編號 ===')
{
  const mk = (id: string, createdDate: string) => ({ ...buildCase(makeInput(0), id), createdDate })
  const before = [
    mk('LN-2026-1004', '2026-08-03'),
    mk('2', '2026-08-05'),
    mk('LN-2026-1002', '2026-04-15'),
    mk('1', '2026-08-04'),
    mk('LN-2026-1005', '2026-07-23'),
  ]
  check(needsRenumber(before), '有舊格式編號時需要重編')

  const { moves, nextCounter } = planRenumber(before)
  const mapping = Object.fromEntries(moves.map((m) => [m.from, m.to]))
  check(mapping['LN-2026-1002'] === '1', '最早建立的變成 1', mapping['LN-2026-1002'])
  check(mapping['LN-2026-1005'] === '2', '第二早的變成 2', mapping['LN-2026-1005'])
  check(mapping['LN-2026-1004'] === '3', '第三早的變成 3', mapping['LN-2026-1004'])
  check(mapping['1'] === '4', '之後建立的接在後面', mapping['1'])
  check(mapping['2'] === '5', '最新建立的排最後', mapping['2'])
  check(nextCounter === 5, '計數器對齊最大號碼', String(nextCounter))
  check(new Set(moves.map((m) => m.to)).size === moves.length, '新編號沒有重複')

  // 重編後就不該再重編（永久刪除造成的號碼空缺也不會觸發）
  const after = moves.map((m) => mk(m.to, before.find((c) => c.id === m.from)!.createdDate))
  check(!needsRenumber(after), '重編後不會再次觸發')
  check(!needsRenumber(after.filter((c) => c.id !== '3')), '有案件被永久刪除也不會重編')
  check(!needsRenumber([]), '沒有案件時不需要重編')

  // 排序仍然由新到舊
  const sorted = after.map((c) => c.id).sort(compareCaseIdDesc)
  check(sorted[0] === '5' && sorted[sorted.length - 1] === '1', '重編後排序仍是新到舊', sorted.join(','))
}

console.log('=== 14. 報表篩選：類別、種類、金額、天數 ===')
{
  const base = (i: number, over: Partial<LoanCase>) => ({ ...buildCase(makeInput(i), String(i + 1)), ...over })
  const pool: LoanCase[] = [
    base(0, { category: '新貸', loanType: '購置自用住宅', loanAmount: wanToNt(500), createdDate: '2026-08-01' }),
    base(1, { category: '展期', loanType: '理財週轉', loanAmount: wanToNt(1200), createdDate: '2026-06-01' }),
    base(2, { category: '新貸', loanType: '理財週轉', loanAmount: wanToNt(80), createdDate: '2026-01-01' }),
    base(3, { category: '追加', loanType: '土建融貸款', loanAmount: wanToNt(6000), createdDate: '2025-12-01' }),
  ]

  const byCategory = applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, categories: ['新貸'] })
  check(byCategory.length === 2 && byCategory.every((c) => c.category === '新貸'), '類別篩選', String(byCategory.length))
  check(
    applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, categories: ['新貸', '追加'] }).length === 3,
    '類別可複選'
  )

  const byType = applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, loanTypes: ['理財週轉'] })
  check(byType.length === 2 && byType.every((c) => c.loanType === '理財週轉'), '貸款種類篩選', String(byType.length))

  check(
    applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, amountFromWan: '500' }).length === 3,
    '金額下限篩選'
  )
  check(applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, amountToWan: '500' }).length === 2, '金額上限篩選')
  const range = applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, amountFromWan: '100', amountToWan: '1500' })
  check(range.length === 2, '金額區間篩選', String(range.length))
  check(
    applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, amountFromWan: '', amountToWan: '' }).length === pool.length,
    '金額留空代表不限'
  )

  // 條件可以疊加
  const combined = applyReportFilters(pool, {
    ...EMPTY_REPORT_FILTERS,
    categories: ['新貸'],
    loanTypes: ['理財週轉'],
    amountToWan: '100',
  })
  check(combined.length === 1 && combined[0].loanAmount === wanToNt(80), '多個條件同時成立才留下')

  // 最近 N 天
  const today = new Date('2026-08-05T10:00:00')
  const week = recentDaysRange(7, today)
  check(week.dateTo === '2026-08-05', '最近 7 天的結束日是今天', week.dateTo)
  check(week.dateFrom === '2026-07-30', '最近 7 天含今天共 7 天', week.dateFrom)
  check(recentDaysRange(30, today).dateFrom === '2026-07-07', '最近 30 天起日', recentDaysRange(30, today).dateFrom)
  check(applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, ...week }).length === 1, '套用最近 7 天')

  check(countActiveFilters(EMPTY_REPORT_FILTERS) === 0, '沒有條件時為 0 項')
  check(
    countActiveFilters({ ...EMPTY_REPORT_FILTERS, categories: ['新貸'], amountFromWan: '100', ...week }) === 3,
    '已套用條件計數'
  )
  const described = describeFilters({
    ...EMPTY_REPORT_FILTERS,
    categories: ['新貸'],
    loanTypes: ['理財週轉'],
    amountFromWan: '100',
    amountToWan: '1500',
  })
  check(described.includes('類別：新貸'), '說明文字含類別')
  check(described.includes('貸款種類：理財週轉'), '說明文字含貸款種類')
  check(described.includes('100萬') && described.includes('1,500萬'), '說明文字含金額區間', described)
}

console.log('=== 15. 報表排序 ===')
{
  const base = (i: number, over: Partial<LoanCase>) => ({ ...buildCase(makeInput(i), String(i + 1)), ...over })
  // 故意讓傳入順序與任何一種排序都不同，確保結果真的是排過的
  const pool: LoanCase[] = [
    base(2, {
      category: '新貸',
      loanType: '理財週轉',
      loanAmount: wanToNt(80),
      createdDate: '2026-01-01',
      officer: '盧小姐',
      currentStage: 'disbursement',
    }),
    base(0, {
      category: '追加',
      loanType: '購置自用住宅',
      loanAmount: wanToNt(6000),
      createdDate: '2026-08-01',
      officer: '王先生',
      currentStage: 'intake',
    }),
    base(3, {
      category: '展期',
      loanType: '土建融貸款',
      loanAmount: wanToNt(1200),
      createdDate: '2025-12-01',
      officer: '陳先生',
      currentStage: 'credit',
    }),
  ]
  pool[0].id = '3'
  pool[1].id = '1'
  pool[2].id = '4'
  const ids = (list: LoanCase[]) => list.map((c) => c.id).join(',')

  // 編號
  check(ids(sortReportCases(pool, 'id', 'asc')) === '1,3,4', '編號由小到大', ids(sortReportCases(pool, 'id', 'asc')))
  check(ids(sortReportCases(pool, 'id', 'desc')) === '4,3,1', '編號由大到小', ids(sortReportCases(pool, 'id', 'desc')))
  check(EMPTY_REPORT_FILTERS.sortKey === 'id' && EMPTY_REPORT_FILTERS.sortDir === 'asc', '預設照編號由小到大')

  // 金額
  const amountAsc = sortReportCases(pool, 'amount', 'asc')
  check(amountAsc.map((c) => c.loanAmount / 10000).join(',') === '80,1200,6000', '金額由少到多')
  check(
    sortReportCases(pool, 'amount', 'desc')
      .map((c) => c.loanAmount / 10000)
      .join(',') === '6000,1200,80',
    '金額由多到少'
  )

  // 日期
  check(
    sortReportCases(pool, 'createdDate', 'asc')
      .map((c) => c.createdDate)
      .join(',') === '2025-12-01,2026-01-01,2026-08-01',
    '建立日期由舊到新'
  )
  check(sortReportCases(pool, 'createdDate', 'desc')[0].createdDate === '2026-08-01', '建立日期由新到舊')

  // 流程階段照實際承作順序，不是照筆劃
  check(
    sortReportCases(pool, 'stage', 'asc')
      .map((c) => c.currentStage)
      .join(',') === 'intake,credit,disbursement',
    '流程由前段排到後段'
  )
  check(sortReportCases(pool, 'stage', 'desc')[0].currentStage === 'disbursement', '流程由後段排到前段')

  // 類別、種類、受理人：同一群會排在一起
  check(new Set(sortReportCases(pool, 'category', 'asc').map((c) => c.category)).size === 3, '類別排序不漏件')
  check(sortReportCases(pool, 'loanType', 'asc').length === pool.length, '貸款種類排序不漏件')
  check(sortReportCases(pool, 'officer', 'desc').length === pool.length, '受理人排序不漏件')

  // 同值時照編號由小到大，順序才會每次一致
  const tied: LoanCase[] = [
    { ...base(0, { loanAmount: wanToNt(500) }), id: '9' },
    { ...base(0, { loanAmount: wanToNt(500) }), id: '2' },
    { ...base(0, { loanAmount: wanToNt(500) }), id: '11' },
  ]
  check(ids(sortReportCases(tied, 'amount', 'asc')) === '2,9,11', '同金額時照編號由小到大', ids(sortReportCases(tied, 'amount', 'asc')))
  check(ids(sortReportCases(tied, 'amount', 'desc')) === '2,9,11', '反向排序時同值仍照編號排')

  // 不更動傳入的資料
  const original = ids(pool)
  sortReportCases(pool, 'amount', 'desc')
  check(ids(pool) === original, '排序不會動到原本的陣列')
  check(sortReportCases([], 'id', 'asc').length === 0, '沒有案件時回傳空陣列')

  // 說明文字
  check(describeSort(EMPTY_REPORT_FILTERS) === '案件編號（小到大）', '排序說明文字', describeSort(EMPTY_REPORT_FILTERS))
  check(
    describeSort({ ...EMPTY_REPORT_FILTERS, sortKey: 'amount', sortDir: 'desc' }) === '貸款金額（多到少）',
    '金額的方向用「多到少」'
  )
  check(
    describeSort({ ...EMPTY_REPORT_FILTERS, sortKey: 'createdDate', sortDir: 'desc' }) === '建立日期（新到舊）',
    '日期的方向用「新到舊」'
  )
  check(describeFilters(EMPTY_REPORT_FILTERS).includes('排序：案件編號（小到大）'), '報表表頭會印出排序方式')
  check(
    describeFilters({ ...EMPTY_REPORT_FILTERS, officer: '王先生', sortKey: 'amount', sortDir: 'desc' }).includes(
      '排序：貸款金額（多到少）'
    ),
    '有其他條件時也會印出排序'
  )
  check(countActiveFilters({ ...EMPTY_REPORT_FILTERS, sortKey: 'amount' }) === 0, '排序不算在「已套用條件」內')

  // 先篩選再排序，兩者互不干擾
  const filtered = sortReportCases(
    applyReportFilters(pool, { ...EMPTY_REPORT_FILTERS, amountFromWan: '100' }),
    'amount',
    'desc'
  )
  check(ids(filtered) === '1,4', '篩選後再排序', ids(filtered))
}

console.log('=== 16. 密碼 ===')
{
  // 沒設密碼＝沿用員編，先前建立的帳號驗證方式完全不變
  check(resolveSecret('A1234', '') === 'a1234', '密碼留空時沿用員編', resolveSecret('A1234', ''))
  check(resolveSecret('A1234', '   ') === 'a1234', '只打空白等同留空')
  check(resolveSecret('1234', '') === '1234', '舊的數字帳號驗證方式不變')
  check(resolveSecret('A1234', 'bank2026') === 'bank2026', '有設密碼時以密碼為準')
  check(resolveSecret('A1234', 'Bank2026') !== resolveSecret('A1234', 'bank2026'), '密碼區分大小寫')
  check(resolveSecret('A1234', ' pw12 ') === 'pw12', '密碼去除前後空白')

  check(validatePassword('') === '', '登入時密碼可留空（相容舊帳號）')
  check(validatePassword('   ') === '', '只打空白視為留空')
  check(validatePassword('', true) !== '', '建立帳號時一定要設密碼')
  check(validatePassword('   ', true) !== '', '建立帳號時只打空白不算數')
  check(validatePassword('abc') !== '', '密碼太短不通過')
  check(validatePassword('abcd') === '', '四個字的密碼通過', validatePassword('abcd'))
  check(validatePassword('abcd', true) === '', '建立帳號時四個字的密碼通過')
  check(validatePassword('銀行密碼') === '', '中文密碼可用', validatePassword('銀行密碼'))

  check(getEmployeeId({ email: 'ua1234@loan.local' } as never) === 'a1234', '可從帳號取回員編')
  check(getEmployeeId(null) === '', '未登入時取不到員編')
  // 重設過密碼的帳號信箱會多一段 .g2，員編要還原成原本的
  check(getEmployeeId({ email: 'ua1234.g2@loan.local' } as never) === 'a1234', '重設過密碼仍取得同一個員編')
  check(getEmployeeId({ email: 'u1234.g3@loan.local' } as never) === '1234', '數字員編重設後也一致')
  check(getEmployeeId({ email: 'ua-12.g2@loan.local' } as never) === 'a-12', '含連字號的員編不受影響')
  check(MAX_ACCOUNT_GENERATION >= 2, '至少允許重設一次密碼')
}

console.log(`\n${failures === 0 ? '✅ 全部通過' : '❌ 有失敗項目'}：${checks - failures}/${checks} 項檢查通過\n`)
process.exit(failures === 0 ? 0 : 1)
