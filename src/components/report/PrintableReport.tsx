import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import { formatDate, formatWan } from '../../utils/format'
import { getSummaryCounts } from '../../utils/metrics'
import { describeFilters, type ReportFilters } from '../../utils/reportFilters'
import { isOverdue } from '../table/LoanTable'
import type { LoanCase } from '../../types'

interface PrintableReportProps {
  cases: LoanCase[]
  filters: ReportFilters
}

const COLUMNS = ['案件編號', '客戶姓名', '貸款金額', '類別', '貸款種類', '承辦人', '建立日期', '目前流程', '進度', '備註']

/** 首頁需容納統計摘要，可放的明細列數較少。 */
const FIRST_PAGE_ROWS = 12
const OTHER_PAGE_ROWS = 20

function paginate(cases: LoanCase[]): LoanCase[][] {
  if (cases.length === 0) return [[]]
  const pages = [cases.slice(0, FIRST_PAGE_ROWS)]
  for (let i = FIRST_PAGE_ROWS; i < cases.length; i += OTHER_PAGE_ROWS) {
    pages.push(cases.slice(i, i + OTHER_PAGE_ROWS))
  }
  return pages
}

function generatedAtLabel(): string {
  return new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CELL = 'border border-[#cbd5e1] px-2 py-1.5'
const HEAD_CELL = `${CELL} bg-[#f1f5f9] text-left font-semibold whitespace-nowrap`

function DetailTable({ rows }: { rows: LoanCase[] }) {
  return (
    <table className="w-full border-collapse text-[10.5px]">
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th key={col} className={HEAD_CELL}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className={`${CELL} whitespace-nowrap tabular-nums`}>{c.id}</td>
            <td className={`${CELL} font-medium whitespace-nowrap`}>
              {c.customerName}
              {isOverdue(c) && <span className="ml-1 font-bold text-[#dc2626]">⚠逾期</span>}
            </td>
            <td className={`${CELL} text-right whitespace-nowrap tabular-nums`}>{formatWan(c.loanAmount)}</td>
            <td className={`${CELL} whitespace-nowrap`}>{c.category || '—'}</td>
            <td className={`${CELL} whitespace-nowrap`}>{c.loanType}</td>
            <td className={`${CELL} whitespace-nowrap`}>{c.officer}</td>
            <td className={`${CELL} whitespace-nowrap tabular-nums`}>{formatDate(c.createdDate)}</td>
            <td className={`${CELL} whitespace-nowrap`}>{STAGE_CONFIG[c.currentStage].label}</td>
            <td className={`${CELL} text-center whitespace-nowrap tabular-nums`}>{c.progress}%</td>
            <td className={CELL}>{c.remarks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function PrintableReport({ cases, filters }: PrintableReportProps) {
  const summary = getSummaryCounts(cases)
  const totalAmount = cases.reduce((sum, c) => sum + c.loanAmount, 0)
  const overdueCount = cases.filter(isOverdue).length
  const pages = paginate(cases)

  const stageCounts = ALL_FILTER_STAGES.map((stage) => ({
    stage,
    label: STAGE_CONFIG[stage].label,
    count: cases.filter((c) => c.currentStage === stage).length,
  }))

  const summaryTiles = [
    { label: '案件總數', value: `${summary.total} 件` },
    { label: '處理中', value: `${summary.processing} 件` },
    { label: '已完成', value: `${summary.completed} 件` },
    { label: '撤件', value: `${summary.withdrawn} 件` },
    { label: '逾期未更新', value: `${overdueCount} 件` },
    { label: '貸款總金額', value: formatWan(totalAmount) },
  ]

  return (
    <div className="print-doc">
      {pages.map((rows, pageIndex) => (
        <div key={pageIndex} data-report-page className="print-sheet flex flex-col bg-white text-[#1e293b]">
          {/* 表頭：每頁都印，方便逐頁查閱 */}
          <header className="mb-4 border-b-2 border-[#1e293b] pb-2.5">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-[18px] font-bold tracking-tight">銀行放款案件報表</h1>
                <p className="mt-0.5 text-[10.5px] text-[#475569]">銀行放款流程管理系統</p>
              </div>
              <div className="text-right text-[10.5px] text-[#475569]">
                <p>列印日期：{generatedAtLabel()}</p>
                <p className="mt-0.5">案件筆數：{cases.length} 件</p>
              </div>
            </div>
            <p className="mt-1.5 text-[10.5px] font-medium text-[#334155]">{describeFilters(filters)}</p>
          </header>

          {pageIndex === 0 && (
            <section className="mb-4">
              <h2 className="mb-2 text-[12.5px] font-bold">一、統計摘要</h2>
              <div className="grid grid-cols-6 gap-2">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className="rounded border border-[#cbd5e1] px-2.5 py-1.5">
                    <p className="text-[9.5px] text-[#64748b]">{tile.label}</p>
                    <p className="mt-0.5 text-[14px] font-bold tabular-nums">{tile.value}</p>
                  </div>
                ))}
              </div>

              <table className="mt-2.5 w-full border-collapse text-[10.5px]">
                <thead>
                  <tr>
                    <th className={HEAD_CELL}>流程階段</th>
                    {stageCounts.map((s) => (
                      <th key={s.stage} className={`${HEAD_CELL} text-center`}>
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${CELL} font-medium`}>案件數</td>
                    {stageCounts.map((s) => (
                      <td key={s.stage} className={`${CELL} text-center tabular-nums`}>
                        {s.count}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          <section className="flex-1">
            {pageIndex === 0 && <h2 className="mb-2 text-[12.5px] font-bold">二、案件明細</h2>}
            {cases.length === 0 ? (
              <p className="rounded border border-dashed border-[#cbd5e1] py-8 text-center text-[10.5px] text-[#64748b]">
                查無符合篩選條件的案件
              </p>
            ) : (
              <DetailTable rows={rows} />
            )}
          </section>

          <footer className="mt-3 flex items-center justify-between border-t border-[#cbd5e1] pt-1.5 text-[9.5px] text-[#94a3b8]">
            <span>本報表由銀行放款流程管理系統產生，內容以系統當下資料為準。</span>
            <span className="tabular-nums">
              第 {pageIndex + 1} / {pages.length} 頁
            </span>
          </footer>
        </div>
      ))}
    </div>
  )
}
