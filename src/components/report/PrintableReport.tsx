import { STAGE_CONFIG } from '../../data/stages'
import { formatDate, formatWan } from '../../utils/format'
import { describeFilters, type ReportFilters } from '../../utils/reportFilters'
import { isOverdue } from '../table/LoanTable'
import type { LoanCase } from '../../types'

interface PrintableReportProps {
  cases: LoanCase[]
  filters: ReportFilters
}

const COLUMNS = ['案件編號', '客戶姓名', '貸款金額', '類別', '貸款種類', '受理人', '建立日期', '目前流程', '進度', '備註']

/** 每頁可容納的明細列數 */
const ROWS_PER_PAGE = 20

function paginate(cases: LoanCase[]): LoanCase[][] {
  if (cases.length === 0) return [[]]
  const pages = [cases.slice(0, ROWS_PER_PAGE)]
  for (let i = ROWS_PER_PAGE; i < cases.length; i += ROWS_PER_PAGE) {
    pages.push(cases.slice(i, i + ROWS_PER_PAGE))
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

/** 報表只印案件明細；統計摘要日後如有需要再加回來。 */
export default function PrintableReport({ cases, filters }: PrintableReportProps) {
  const pages = paginate(cases)

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

          <section className="flex-1">
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
