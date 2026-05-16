'use client'

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip } from 'recharts'
import type { Point } from '@/lib/indicators/normalize'

interface Props {
  points: Point[]
  height?: number
}

export function SpreadChart({ points, height = 120 }: Props) {
  if (points.length < 2) return <div className="text-xs text-gray-400" style={{ height }}>—</div>

  const data = points.map((p) => ({
    x: p.asOf,
    positive: p.value > 0 ? p.value : 0,
    negative: p.value < 0 ? p.value : 0,
    raw: p.value,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <XAxis dataKey="x" hide />
        <YAxis hide domain={['auto', 'auto']} />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: '4px 8px' }}
          formatter={(v: number) => `${v.toFixed(2)}%`}
          labelFormatter={(label: string) => label}
        />
        <Area type="monotone" dataKey="positive" stroke="#10b981" fill="#10b981" fillOpacity={0.3} isAnimationActive={false} />
        <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
