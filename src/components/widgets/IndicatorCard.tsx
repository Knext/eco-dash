'use client'

import { AlertOctagon, AlertTriangle, CircleDot, Minus } from 'lucide-react'
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
  normal: {
    color: '#10b981',
    accent: 'text-emerald-600 dark:text-emerald-400',
    Icon: CircleDot,
    label: '정상',
  },
  watch: {
    color: '#f59e0b',
    accent: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
    label: '경계',
  },
  alert: {
    color: '#ef4444',
    accent: 'text-red-600 dark:text-red-400',
    Icon: AlertOctagon,
    label: '위험',
  },
  stale: {
    color: '#9ca3af',
    accent: 'text-mute',
    Icon: Minus,
    label: '갱신 지연',
  },
} as const

export function IndicatorCard({
  id,
  nameKr,
  unit,
  precision,
  value,
  previousValue,
  asOf,
  status,
  history,
}: Props) {
  const cfg = statusConfig[status] ?? statusConfig.normal
  const Icon = cfg.Icon

  const change = value !== null && previousValue !== null ? value - previousValue : null
  const changePct =
    value !== null && previousValue !== null && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null

  const unitLabel =
    unit === 'pct' ? '%' : unit === 'bp' ? 'bp' : unit === 'krw' ? '원' : unit === 'usd' ? '$' : ''

  // Chart line color matches the ▲/▼ indicator displayed below the value
  // (latest vs previous), not the long-term window trend, so the line
  // color and the change badge always agree. Korean stock convention:
  // 상승=빨강, 하락=파랑, 동일=회색.
  const trendColor = trendLineColor(change)

  return (
    <a
      href={`/indicator/${id}`}
      className={cn(
        'group block rounded-md bg-canvas p-4 transition-colors',
        'border border-hairline hover:border-stone',
        'dark:border-charcoal dark:bg-charcoal/60 dark:hover:bg-charcoal',
      )}
      data-status={status}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-caption-md text-mute">
          <Icon size={12} style={{ color: cfg.color }} />
          <span className="font-semibold text-ink dark:text-canvas">{nameKr}</span>
        </div>
        <span className="text-caption-sm text-ash">{asOf ? asOf.slice(5) : '—'}</span>
      </div>

      <div className="mt-2 flex items-baseline gap-1 tabular">
        <span className="text-heading-lg font-semibold text-ink dark:text-canvas">
          {value === null ? '—' : formatNumber(value, precision)}
        </span>
        {unitLabel && <span className="text-caption-md text-mute">{unitLabel}</span>}
      </div>

      <div className="mt-0.5 text-caption-sm tabular text-mute">
        {change !== null ? (
          <>
            <span className={cn('font-semibold', cfg.accent)}>
              {change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change), precision)}
            </span>
            {changePct !== null && <span className="ml-1">({formatPct(changePct, 1)})</span>}
          </>
        ) : (
          <span>—</span>
        )}
      </div>

      <div className="mt-3">
        <Sparkline points={history} color={trendColor} height={36} />
      </div>
    </a>
  )
}

const TREND_UP = '#ef4444'
const TREND_DOWN = '#3b82f6'
const TREND_FLAT = '#9ca3af'

function trendLineColor(change: number | null): string {
  if (change === null || change === 0) return TREND_FLAT
  return change > 0 ? TREND_UP : TREND_DOWN
}
