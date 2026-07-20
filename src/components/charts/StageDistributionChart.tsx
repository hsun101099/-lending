import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ALL_FILTER_STAGES, STAGE_CONFIG } from '../../data/stages'
import type { LoanCase } from '../../types'

interface StageDistributionChartProps {
  cases: LoanCase[]
}

export default function StageDistributionChart({ cases }: StageDistributionChartProps) {
  const data = ALL_FILTER_STAGES.map((stage) => ({
    name: STAGE_CONFIG[stage].label,
    value: cases.filter((c) => c.currentStage === stage).length,
    color: STAGE_CONFIG[stage].color,
  })).filter((d) => d.value > 0)

  return (
    <div className="rounded-2xl border border-slate-100 bg-card p-6 shadow-card">
      <h3 className="text-base font-bold text-ink">案件流程分布</h3>
      <p className="mt-0.5 text-xs text-ink-faint">目前所有案件所在流程階段占比</p>

      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-56 w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                cornerRadius={6}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} 件`, name]}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full space-y-2 sm:w-1/2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-ink-soft">{d.name}</span>
              </div>
              <span className="font-semibold text-ink tabular-nums">{d.value} 件</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
