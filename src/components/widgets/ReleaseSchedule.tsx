'use client'

import { Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatKst } from '@/lib/timezone'
import { differenceInDays } from 'date-fns'

interface Release {
  id: string
  event_name: string
  country: string
  due_at_et: string
  due_at_kst: string
  importance: 1 | 2 | 3
}

export function ReleaseSchedule() {
  const { data } = useQuery<{ releases: Release[] }>({
    queryKey: ['releases'],
    queryFn: async () => {
      const res = await fetch('/api/releases?days=14')
      return res.json()
    },
  })
  const releases = data?.releases ?? []
  return (
    <div className="rounded-md bg-canvas p-4 dark:bg-charcoal/60">
      <div className="mb-3 flex items-center gap-2 text-body-strong text-ink dark:text-canvas">
        <Calendar size={14} />
        <span>발표 일정 (14일)</span>
      </div>
      {releases.length === 0 ? (
        <p className="text-caption-md italic text-ash">예정 이벤트 없음</p>
      ) : (
        <ul className="space-y-2 text-caption-md">
          {releases.map((r) => {
            const d = differenceInDays(new Date(r.due_at_kst), new Date())
            return (
              <li key={r.id} className="border-l-2 border-brand pl-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-ink dark:text-canvas">
                    {r.event_name}
                  </span>
                  <span className="shrink-0 font-bold text-brand tabular">D-{d}</span>
                </div>
                <div className="mt-0.5 text-caption-sm text-mute">
                  {formatKst(r.due_at_et, 'HH:mm')} ET / {formatKst(r.due_at_kst, 'MM-dd HH:mm')}{' '}
                  KST
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
