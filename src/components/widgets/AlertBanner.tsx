'use client'

import { AlertOctagon, Sparkles, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ActiveSignal } from '@/lib/signals/types'

interface Props {
  signals: ActiveSignal[]
  onDismiss?: (id: string) => void
}

export function AlertBanner({ signals, onDismiss }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const visible = signals.filter((s) => s.severity === 'critical' && !dismissedIds.has(s.id))
  if (visible.length === 0) return null

  // 매수+매도 동시 critical: CONFLICT 표시
  const hasOpportunity = visible.some((s) => s.type === 'opportunity')
  const hasRisk = visible.some((s) => s.type === 'risk')
  const isConflict = hasOpportunity && hasRisk

  const handleDismiss = (id: string) => {
    setDismissedIds((p) => new Set([...p, id]))
    onDismiss?.(id)
  }

  return (
    <div className="sticky top-0 z-50 w-full space-y-1 px-3 py-1 sm:px-6">
      {isConflict && (
        <div className="flex items-center gap-2 rounded-md bg-conflict-stripe px-3 py-2 text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
          <Zap size={16} />
          CONFLICT — 매수와 매도 시그널이 동시에 발화. 자동 결론 없이 양쪽 모두 검토 필요.
        </div>
      )}
      {visible.slice(0, 3).map((s) => (
        <BannerRow key={s.id} signal={s} onDismiss={() => handleDismiss(s.id)} />
      ))}
      {visible.length > 3 && (
        <div className="rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-600 dark:text-gray-400">
          + {visible.length - 3}개 활성 critical 알림 추가
        </div>
      )}
    </div>
  )
}

function BannerRow({ signal, onDismiss }: { signal: ActiveSignal; onDismiss: () => void }) {
  const isOpportunity = signal.type === 'opportunity'
  const Icon = isOpportunity ? Sparkles : AlertOctagon
  const bg = isOpportunity
    ? 'bg-purple-500 text-white animate-pulse-severity'
    : 'bg-red-500 text-white animate-pulse-severity'
  return (
    <div className={cn('flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs sm:text-sm', bg)}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className="shrink-0" />
        <span className="font-semibold">{isOpportunity ? '★' : '⚠'} CRITICAL</span>
        <span className="truncate">{signal.message}</span>
        {signal.currentValue && (
          <span className="hidden md:inline opacity-80 truncate">({signal.currentValue})</span>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-1 hover:bg-white/20"
        aria-label="알림 닫기"
      >
        <X size={14} />
      </button>
    </div>
  )
}
