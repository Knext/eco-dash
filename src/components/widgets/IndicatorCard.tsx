'use client'

import { AlertOctagon, AlertTriangle, CircleDot, Info, Minus } from 'lucide-react'
import type { IndicatorStatus } from '@/lib/indicators/types'
import type { Point } from '@/lib/indicators/normalize'
import { formatNumber, formatPct, cn } from '@/lib/utils'
import { Sparkline } from './Sparkline'

interface Props {
  id: string
  nameKr: string
  unit: string
  precision: number
  value: number | null
  previousValue: number | null
  asOf: string | null
  status: IndicatorStatus | 'stale'
  history: Point[]
  thresholds?: { watch: number; alert: number; direction: 'above' | 'below' }
}

const statusConfig = {
  normal: { color: '#10b981', border: 'border-emerald-200 dark:border-emerald-800', Icon: CircleDot, label: '정상' },
  watch: { color: '#f59e0b', border: 'border-amber-300 dark:border-amber-700', Icon: AlertTriangle, label: '경계' },
  alert: { color: '#ef4444', border: 'border-red-400 dark:border-red-700', Icon: AlertOctagon, label: '위험' },
  stale: { color: '#9ca3af', border: 'border-gray-200 dark:border-gray-800', Icon: Minus, label: '갱신 지연' },
} as const

export function IndicatorCard({
  id, nameKr, unit, precision, value, previousValue, asOf, status, history,
}: Props) {
  const cfg = statusConfig[status] ?? statusConfig.normal
  const Icon = cfg.Icon

  const change = value !== null && previousValue !== null ? value - previousValue : null
  const changePct = value !== null && previousValue !== null && previousValue !== 0
    ? ((value - previousValue) / Math.abs(previousValue)) * 100
    : null

  return (
    <a
      href={`/indicator/${id}`}
      className={cn(
        'block rounded-lg border bg-white dark:bg-gray-900 p-3 transition-shadow hover:shadow-md',
        cfg.border,
        'border-2',
      )}
      data-status={status}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
          <Icon size={14} style={{ color: cfg.color }} />
          <span>{nameKr}</span>
        </div>
        <span className="text-[10px] text-gray-400">{asOf ? asOf.slice(5) : '—'}</span>
      </div>

      <div className="mt-1 tabular font-semibold text-2xl text-gray-900 dark:text-gray-100">
        {value === null ? '—' : formatNumber(value, precision)}
        <span className="ml-1 text-xs text-gray-500">
          {unit === 'pct' ? '%' : unit === 'bp' ? 'bp' : unit === 'krw' ? '원' : unit === 'usd' ? '$' : ''}
        </span>
      </div>

      <div className="mt-0.5 text-xs tabular text-gray-500">
        {change !== null ? (
          <>
            <span className={change >= 0 ? 'text-red-500' : 'text-blue-500'}>
              {change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change), precision)}
            </span>
            {changePct !== null && <span className="ml-1">({formatPct(changePct, 1)})</span>}
          </>
        ) : (
          <span>—</span>
        )}
      </div>

      <div className="mt-2">
        <Sparkline points={history} color={cfg.color} />
      </div>
    </a>
  )
}
