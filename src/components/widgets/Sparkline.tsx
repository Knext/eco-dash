'use client'

import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'
import type { Point } from '@/lib/indicators/normalize'

interface Props {
  points: Point[]
  color?: string
  height?: number
}

export function Sparkline({ points, color = '#3b82f6', height = 40 }: Props) {
  if (points.length < 2) {
    return <div className="text-xs text-gray-400" style={{ height }}>—</div>
  }
  const data = points.map((p) => ({ x: p.asOf, y: p.value }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis hide domain={['auto', 'auto']} />
        <Line type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
