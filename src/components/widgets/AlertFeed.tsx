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
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">알림 피드</h3>
        <span className="text-xs text-gray-500">{signals.length}건</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1 text-xs">
        {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded px-2 py-0.5 transition-colors',
              filter === f
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
          >
            {f === 'all' ? '전체' : f}
          </button>
        ))}
      </div>

      <ul className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="text-xs text-gray-400 italic py-4 text-center">활성 알림 없음</li>
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
    <li className={cn('rounded-md border-l-4 bg-gray-50 dark:bg-gray-800/50 p-2', cfg.border)}>
      <div className="flex items-start gap-2">
        <Icon size={14} style={{ color: cfg.color, marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
              {signal.message}
            </span>
            <span className="text-[10px] text-gray-400 shrink-0">
              {formatKst(signal.triggeredAt, 'MM-dd HH:mm')}
            </span>
          </div>
          {signal.currentValue && (
            <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {signal.currentValue}
            </div>
          )}
          <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
            💡 {signal.actionHint}
          </div>
        </div>
      </div>
    </li>
  )
}

function severityConfig(s: { severity: string; type: string }) {
  if (s.severity === 'critical' && s.type === 'opportunity') {
    return { color: '#a855f7', border: 'border-purple-500', Icon: Sparkles }
  }
  if (s.severity === 'critical') {
    return { color: '#ef4444', border: 'border-red-500', Icon: AlertOctagon }
  }
  if (s.severity === 'warning') {
    return { color: '#f59e0b', border: 'border-amber-500', Icon: AlertTriangle }
  }
  return { color: '#6b7280', border: 'border-gray-400', Icon: Info }
}
