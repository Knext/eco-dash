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
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-3 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <a href="/" className="text-base font-bold text-gray-900 dark:text-gray-100">
            📊 EconDash
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
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="hidden sm:inline tabular">{formatKstEt(new Date())}</span>
          <a
            href="/alerts"
            className="relative flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-label="알림 보기"
          >
            <Bell size={14} />
            <span>{activeCount}</span>
          </a>
        </div>
      </div>
    </header>
  )
}
