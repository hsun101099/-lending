import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface MonthlyVolumeChartProps {
  data: { day: string; count: number }[]
}

export default function MonthlyVolumeChart({ data }: MonthlyVolumeChartProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-card p-6 shadow-card">
      <h3 className="text-base font-bold text-ink">本月案件數</h3>
      <p className="mt-0.5 text-xs text-ink-faint">每日新增案件受理量</p>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(value) => [`${value} 件`, '新增案件']}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
