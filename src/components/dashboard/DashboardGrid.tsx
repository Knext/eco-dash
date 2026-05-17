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

const ORDER_KEY_MAIN = 'econdash:cardOrder:main:v2'
const ORDER_KEY_TAB = 'econdash:tabSelected:v1'

interface TabSpec {
  id: string
  label: string
  categories: string[]
}

const TABS: readonly TabSpec[] = [
  { id: 'rates', label: '금리', categories: ['rates'] },
  { id: 'inflation', label: '인플레이션', categories: ['inflation'] },
  { id: 'fx', label: '외환', categories: ['fx'] },
  { id: 'commodity', label: '상품·주식', categories: ['commodity'] },
  { id: 'korea', label: '한국', categories: ['korea'] },
  { id: 'other', label: '기타', categories: ['volatility', 'credit'] },
]

function tabForCategory(category: string): string {
  for (const tab of TABS) {
    if (tab.categories.includes(category)) return tab.id
  }
  return 'other'
}

export function DashboardGrid() {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return TABS[0]!.id
    return window.localStorage.getItem(ORDER_KEY_TAB) ?? TABS[0]!.id
  })

  const selectTab = (id: string) => {
    setActiveTab(id)
    try {
      window.localStorage.setItem(ORDER_KEY_TAB, id)
    } catch {
      // ignore
    }
  }

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

  // Group auxiliary indicators by tab. Preserve definition order within each tab.
  const auxByTab = useMemo(() => {
    const map = new Map<string, IndicatorRow[]>()
    for (const tab of TABS) map.set(tab.id, [])
    for (const i of indicators) {
      if (i.mainView) continue
      const tabId = tabForCategory(i.category)
      map.get(tabId)?.push(i)
    }
    return map
  }, [indicators])

  // Hide tabs that have no indicators (e.g. when all "other" cards are main)
  const visibleTabs = useMemo(
    () => TABS.filter((t) => (auxByTab.get(t.id)?.length ?? 0) > 0),
    [auxByTab],
  )

  // If currently selected tab becomes empty, fall back to the first visible.
  const currentTabId =
    visibleTabs.find((t) => t.id === activeTab)?.id ?? visibleTabs[0]?.id ?? TABS[0]!.id
  const currentTabIndicators = auxByTab.get(currentTabId) ?? []

  const main = useCardOrder(ORDER_KEY_MAIN, defaultMainIds)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleMainDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = main.order.indexOf(String(active.id))
    const newIndex = main.order.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    main.setOrder(arrayMove(main.order, oldIndex, newIndex))
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
                    onClick={() => main.reset()}
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

            {indLoading && <SkeletonGrid count={4} />}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleMainDragEnd}
            >
              <SortableContext items={main.order} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {main.order.map((id) => {
                    const i = indexById.get(id)
                    if (!i) return null
                    return (
                      <SortableIndicatorCard key={i.id} {...toCardProps(i)} isEditing={isEditing} />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-8">
              <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                보조 지표
              </h2>
              <div
                role="tablist"
                aria-label="보조 지표 카테고리"
                className="-mx-1 mb-3 flex flex-wrap gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 px-1"
              >
                {visibleTabs.map((t) => {
                  const count = auxByTab.get(t.id)?.length ?? 0
                  const active = t.id === currentTabId
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      onClick={() => selectTab(t.id)}
                      className={cn(
                        'whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                        active
                          ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
                      )}
                    >
                      {t.label}
                      <span
                        className={cn(
                          'ml-1 rounded-full px-1.5 py-0.5 text-[10px] tabular',
                          active
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {currentTabIndicators.length === 0 && !indLoading && (
                <p className="text-xs text-gray-400 italic py-4">이 탭에는 표시할 지표가 없습니다.</p>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {currentTabIndicators.map((i) => (
                  <IndicatorCard key={i.id} {...toCardProps(i)} />
                ))}
              </div>
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

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  )
}
