'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Check, RotateCcw } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { IndicatorCard } from '@/components/widgets/IndicatorCard'
import { SortableIndicatorCard } from '@/components/widgets/SortableIndicatorCard'
import { AlertBanner } from '@/components/widgets/AlertBanner'
import { AlertFeed } from '@/components/widgets/AlertFeed'
import { ReleaseSchedule } from '@/components/widgets/ReleaseSchedule'
import { useCardOrder } from '@/lib/useCardOrder'
import { cn } from '@/lib/utils'
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

const ORDER_KEY_MAIN = 'econdash:cardOrder:main:v1'
const ORDER_KEY_AUX = 'econdash:cardOrder:aux:v1'

export function DashboardGrid() {
  const [isEditing, setIsEditing] = useState(false)

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

  const indicators = indicatorsResp?.indicators ?? []
  const indexById = useMemo(() => new Map(indicators.map((i) => [i.id, i])), [indicators])

  const defaultMainIds = useMemo(
    () => indicators.filter((i) => i.mainView).map((i) => i.id),
    [indicators],
  )
  const defaultAuxIds = useMemo(
    () => indicators.filter((i) => !i.mainView).map((i) => i.id),
    [indicators],
  )

  const main = useCardOrder(ORDER_KEY_MAIN, defaultMainIds)
  const aux = useCardOrder(ORDER_KEY_AUX, defaultAuxIds)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (
    event: DragEndEvent,
    list: { order: string[]; setOrder: (n: string[]) => void },
  ) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = list.order.indexOf(String(active.id))
    const newIndex = list.order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    list.setOrder(arrayMove(list.order, oldIndex, newIndex))
  }

  const dismiss = async (id: string) => {
    await fetch('/api/alerts', { method: 'POST', body: JSON.stringify({ id }) })
  }

  const signals = alertsResp?.signals ?? []

  return (
    <>
      <AlertBanner signals={signals} onDismiss={dismiss} />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                메인 지표 ({main.order.length}/{defaultMainIds.length})
              </h2>
              <div className="flex items-center gap-1">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      main.reset()
                      aux.reset()
                    }}
                    className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                    title="기본 순서로 되돌리기"
                  >
                    <RotateCcw size={12} />
                    초기화
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing((p) => !p)}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                    isEditing
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                  aria-pressed={isEditing}
                >
                  {isEditing ? <Check size={12} /> : <Pencil size={12} />}
                  {isEditing ? '완료' : '순서 편집'}
                </button>
              </div>
            </div>

            {indLoading && <SkeletonGrid />}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, main)}
            >
              <SortableContext items={main.order} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {main.order.map((id) => {
                    const i = indexById.get(id)
                    if (!i) return null
                    return <SortableIndicatorCard key={i.id} {...toCardProps(i)} isEditing={isEditing} />
                  })}
                </div>
              </SortableContext>
            </DndContext>

            <h2 className="mt-6 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              보조 지표
            </h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, aux)}
            >
              <SortableContext items={aux.order} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {aux.order.map((id) => {
                    const i = indexById.get(id)
                    if (!i) return null
                    return <SortableIndicatorCard key={i.id} {...toCardProps(i)} isEditing={isEditing} />
                  })}
                </div>
              </SortableContext>
            </DndContext>
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

function toCardProps(i: IndicatorRow) {
  return {
    id: i.id,
    nameKr: i.nameKr,
    unit: i.unit,
    precision: i.precision,
    value: i.value,
    previousValue: i.previousValue,
    asOf: i.asOf,
    status: i.status,
    history: i.history,
  }
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
