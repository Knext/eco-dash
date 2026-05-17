'use client'

import { Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { RegimeBadge } from '@/components/widgets/RegimeBadge'
import { formatKstEt } from '@/lib/timezone'
import type { Regime } from '@/lib/signals/types'

interface RegimeResponse {
  current: Regime
  enteredAt: string
  previous: Regime | null
  triggerSummary: string
}

interface AlertsResponse {
  signals: Array<{ id: string; severity: string }>
}

export function Header() {
  const { data: regime } = useQuery<RegimeResponse>({
    queryKey: ['regime'],
    queryFn: async () => {
      const res = await fetch('/api/regime')
      return res.json()
    },
  })

  const { data: alerts } = useQuery<AlertsResponse>({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/alerts?mode=active')
      return res.json()
    },
  })

  const activeCount = alerts?.signals.length ?? 0

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/95 backdrop-blur dark:border-charcoal dark:bg-charcoal/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2 text-ink hover:opacity-90 dark:text-canvas">
            <span className="text-heading-lg font-bold text-brand">●</span>
            <span className="text-body-strong tracking-tight">EconDash</span>
          </a>
          {regime && (
            <RegimeBadge
              regime={regime.current}
              enteredAt={regime.enteredAt}
              previous={regime.previous}
              triggerSummary={regime.triggerSummary}
            />
          )}
        </div>
        <div className="flex items-center gap-3 text-caption-md text-mute">
          <span className="hidden tabular sm:inline">{formatKstEt(new Date())}</span>
          <a
            href="/alerts"
            className="relative inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1.5 text-caption-md font-semibold text-ink hover:bg-surface-card-deep dark:bg-charcoal dark:text-canvas"
            aria-label="알림 보기"
          >
            <Bell size={14} />
            <span className="tabular">{activeCount}</span>
          </a>
        </div>
      </div>
    </header>
  )
}
