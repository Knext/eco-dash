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
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        <Calendar size={14} />
        <span>발표 일정 (14일)</span>
      </div>
      {releases.length === 0 ? (
        <p className="text-xs text-gray-400 italic">예정 이벤트 없음</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {releases.map((r) => {
            const d = differenceInDays(new Date(r.due_at_kst), new Date())
            return (
              <li key={r.id} className="border-l-2 border-blue-400 pl-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{r.event_name}</span>
                  <span className="shrink-0 text-blue-500 font-medium">D-{d}</span>
                </div>
                <div className="mt-0.5 text-gray-500">
                  {formatKst(r.due_at_et, 'HH:mm')} ET / {formatKst(r.due_at_kst, 'MM-dd HH:mm')} KST
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
