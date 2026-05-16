'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid } from 'recharts'
import type { Point } from '@/lib/indicators/normalize'
import type { ThresholdConfig } from '@/lib/indicators/types'

interface Props {
  points: Point[]
  thresholds?: ThresholdConfig
  height?: number
}

export function IndicatorHistoryChart({ points, thresholds, height = 320 }: Props) {
  if (points.length < 2) return <div className="text-xs text-gray-400" style={{ height }}>데이터 없음</div>

  const data = points.map((p) => ({ x: p.asOf, y: p.value }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
        <XAxis dataKey="x" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
        <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => v.toFixed(2)} />
        {thresholds && (
          <>
            <ReferenceLine y={thresholds.watch[0]} stroke="#f59e0b" strokeDasharray="4 4" />
            <ReferenceLine y={thresholds.alert[0]} stroke="#ef4444" strokeDasharray="4 4" />
          </>
        )}
        <Line type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
