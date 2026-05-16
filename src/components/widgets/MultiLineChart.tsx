'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, Tooltip } from 'recharts'

interface Series {
  id: string
  label: string
  color: string
  points: Array<{ asOf: string; value: number }>
}

interface Props {
  series: Series[]
  height?: number
}

export function MultiLineChart({ series, height = 200 }: Props) {
  if (series.length === 0) return <div className="text-xs text-gray-400" style={{ height }}>—</div>

  const dateSet = new Set<string>()
  series.forEach((s) => s.points.forEach((p) => dateSet.add(p.asOf)))
  const dates = Array.from(dateSet).sort()

  const data = dates.map((d) => {
    const row: Record<string, string | number | null> = { x: d }
    for (const s of series) {
      const p = s.points.find((pp) => pp.asOf === d)
      row[s.id] = p ? p.value : null
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
        <XAxis dataKey="x" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.label}
            stroke={s.color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
