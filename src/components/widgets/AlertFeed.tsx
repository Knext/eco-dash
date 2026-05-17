'use client'

import { AlertOctagon, AlertTriangle, Info, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatKst } from '@/lib/timezone'
import type { ActiveSignal } from '@/lib/signals/types'

type Filter = 'all' | 'critical' | 'warning' | 'info'

interface Props {
  signals: ActiveSignal[]
}

export function AlertFeed({ signals }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const filtered = filter === 'all' ? signals : signals.filter((s) => s.severity === filter)

  return (
    <div className="rounded-md bg-canvas p-4 dark:bg-charcoal/60">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-body-strong text-ink dark:text-canvas">알림 피드</h3>
        <span className="text-caption-sm text-mute tabular">{signals.length}건</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-caption-sm font-semibold transition-colors',
              filter === f
                ? 'bg-ink text-canvas dark:bg-canvas dark:text-ink'
                : 'bg-surface-card text-ink hover:bg-surface-card-deep dark:bg-charcoal dark:text-canvas',
            )}
          >
            {f === 'all' ? '전체' : f}
          </button>
        ))}
      </div>

      <ul className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="py-4 text-center text-caption-md italic text-ash">활성 알림 없음</li>
        )}
        {filtered.map((s) => (
          <AlertItem key={s.id} signal={s} />
        ))}
      </ul>
    </div>
  )
}

function AlertItem({ signal }: { signal: ActiveSignal }) {
  const cfg = severityConfig(signal)
  const Icon = cfg.Icon
  return (
    <li className={cn('rounded-md border-l-4 bg-surface-soft p-3 dark:bg-charcoal/40', cfg.border)}>
      <div className="flex items-start gap-2">
        <Icon size={14} style={{ color: cfg.color, marginTop: 2 }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-caption-md font-semibold text-ink dark:text-canvas">
              {signal.message}
            </span>
            <span className="shrink-0 text-caption-sm text-ash tabular">
              {formatKst(signal.triggeredAt, 'MM-dd HH:mm')}
            </span>
          </div>
          {signal.currentValue && (
            <div className="mt-0.5 truncate text-caption-sm text-mute">{signal.currentValue}</div>
          )}
          <div className="mt-1 text-caption-sm text-body dark:text-stone">{signal.actionHint}</div>
        </div>
      </div>
    </li>
  )
}

function severityConfig(s: { severity: string; type: string }) {
  if (s.severity === 'critical' && s.type === 'opportunity') {
    return { color: '#a855f7', border: 'border-severity-critical-buy', Icon: Sparkles }
  }
  if (s.severity === 'critical') {
    return { color: '#ef4444', border: 'border-severity-critical-sell', Icon: AlertOctagon }
  }
  if (s.severity === 'warning') {
    return { color: '#f59e0b', border: 'border-severity-warning', Icon: AlertTriangle }
  }
  return { color: '#6b7280', border: 'border-ash', Icon: Info }
}
