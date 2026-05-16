'use client'

import { useQuery } from '@tanstack/react-query'
import { IndicatorCard } from '@/components/widgets/IndicatorCard'
import { AlertBanner } from '@/components/widgets/AlertBanner'
import { AlertFeed } from '@/components/widgets/AlertFeed'
import { ReleaseSchedule } from '@/components/widgets/ReleaseSchedule'
import type { IndicatorStatus, Unit } from '@/lib/indicators/types'
import type { ActiveSignal } from '@/lib/signals/types'
import type { Point } from '@/lib/indicators/normalize'

interface IndicatorRow {
  id: string
  nameKr: string
  category: string
  unit: Unit
  precision: number
  mainView: boolean
  value: number | null
  previousValue: number | null
  asOf: string | null
  status: IndicatorStatus | 'stale'
  history: Point[]
}

interface IndicatorsResponse {
  indicators: IndicatorRow[]
  ts: string
}

interface AlertsResponse {
  signals: ActiveSignal[]
}

export function DashboardGrid() {
  const { data: indicatorsResp, isLoading: indLoading } = useQuery<IndicatorsResponse>({
    queryKey: ['indicators'],
    queryFn: async () => {
      const res = await fetch('/api/indicators')
      return res.json()
    },
  })

  const { data: alertsResp } = useQuery<AlertsResponse>({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/alerts?mode=active')
      return res.json()
    },
  })

  const dismiss = async (id: string) => {
    await fetch('/api/alerts', { method: 'POST', body: JSON.stringify({ id }) })
  }

  const indicators = indicatorsResp?.indicators ?? []
  const signals = alertsResp?.signals ?? []
  const main = indicators.filter((i) => i.mainView)
  const aux = indicators.filter((i) => !i.mainView)

  return (
    <>
      <AlertBanner signals={signals} onDismiss={dismiss} />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              메인 지표 ({main.length}/8)
            </h2>
            {indLoading && <SkeletonGrid />}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {main.map((i) => (
                <IndicatorCard
                  key={i.id}
                  id={i.id}
                  nameKr={i.nameKr}
                  unit={i.unit}
                  precision={i.precision}
                  value={i.value}
                  previousValue={i.previousValue}
                  asOf={i.asOf}
                  status={i.status}
                  history={i.history}
                />
              ))}
            </div>

            <h2 className="mt-6 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              보조 지표
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {aux.map((i) => (
                <IndicatorCard
                  key={i.id}
                  id={i.id}
                  nameKr={i.nameKr}
                  unit={i.unit}
                  precision={i.precision}
                  value={i.value}
                  previousValue={i.previousValue}
                  asOf={i.asOf}
                  status={i.status}
                  history={i.history}
                />
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <AlertFeed signals={signals} />
            <ReleaseSchedule />
          </aside>
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          {indicatorsResp?.ts && (
            <>마지막 갱신: {new Date(indicatorsResp.ts).toLocaleString('ko-KR')}</>
          )}
        </footer>
      </main>
    </>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  )
}
