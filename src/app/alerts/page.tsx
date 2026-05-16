import { Header } from '@/components/dashboard/Header'
import { getRecentSignals } from '@/lib/db/queries'
import { formatKst } from '@/lib/timezone'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function AlertsPage() {
  const signals = getRecentSignals(60)
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <main className="mx-auto max-w-4xl px-3 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">알림 히스토리 (60일)</h1>
          <a href="/" className="text-xs text-blue-500 hover:underline">← 메인으로</a>
        </div>

        <ul className="space-y-2">
          {signals.length === 0 && <li className="text-sm text-gray-400 italic">최근 알림 없음</li>}
          {signals.map((s) => {
            const isOpp = s.type === 'opportunity'
            return (
              <li
                key={s.id}
                className={cn(
                  'rounded-md border-l-4 bg-white dark:bg-gray-900 p-3 shadow-sm',
                  s.severity === 'critical' && isOpp ? 'border-purple-500' :
                  s.severity === 'critical' ? 'border-red-500' :
                  s.severity === 'warning' ? 'border-amber-500' :
                  'border-gray-400',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{s.message}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      [{s.category}] · {s.rule_id} · {s.resolved_at ? `해소됨 (${formatKst(s.resolved_at, 'MM-dd HH:mm')})` : '활성'}
                    </div>
                    {s.action_hint && (
                      <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                        💡 {s.action_hint}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 tabular">
                    {formatKst(s.triggered_at, 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
