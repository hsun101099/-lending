import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface DailyCompletionChartProps {
  data: { label: string; count: number }[]
}

export default function DailyCompletionChart({ data }: DailyCompletionChartProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-card p-6 shadow-card">
      <h3 className="text-base font-bold text-ink">每日完成案件</h3>
      <p className="mt-0.5 text-xs text-ink-faint">近 14 日撥款完成趨勢</p>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -20, right: 8 }}>
            <defs>
              <linearGradient id="completionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${value} 件`, '完成案件']}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="count" stroke="#16A34A" strokeWidth={2.5} fill="url(#completionFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
