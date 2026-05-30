import { notFound } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'
import { getIndicator, getPlugin } from '@/lib/indicators/registry'
import { getRecentValues, getRecentSignals, getLatestValue } from '@/lib/db/queries'
import { toPoints, yoy, lastValue } from '@/lib/indicators/normalize'
import { statusFor, isStale } from '@/lib/indicators/thresholds'
import { formatNumber } from '@/lib/utils'
import { DefaultDetail } from '@/components/indicators/_default/Detail'
import type { IndicatorDef, IndicatorSnapshot } from '@/lib/indicators/types'

export const dynamic = 'force-dynamic'

async function snapshotFor(def: IndicatorDef): Promise<IndicatorSnapshot> {
  const window = def.transform === 'yoy' ? 800 : 800
  const rows = await getRecentValues(def.id, window)
  const points = toPoints(rows)
  const transformed = def.transform === 'yoy' ? yoy(points) : points
  const latest = lastValue(transformed)
  const prev =
    transformed.length > 1 ? transformed[transformed.length - 2]?.value ?? null : null
  const last = await getLatestValue(def.id)
  const asOf = last?.as_of ?? null
  const stale = asOf ? isStale(def, asOf) : true
  const status = stale ? 'stale' : latest !== null ? statusFor(def, latest) : 'stale'
  return {
    id: def.id,
    nameKr: def.nameKr,
    category: def.category,
    unit: def.unit,
    precision: def.precision,
    value: latest,
    previousValue: prev,
    asOf,
    status,
    history: transformed,
  }
}

export default async function IndicatorPage({ params }: { params: { id: string } }) {
  const def = getIndicator(params.id)
  if (!def) notFound()

  const snapshot = await snapshotFor(def)
  const transformed = snapshot.history
  const latest = snapshot.value

  // Plugin-declared companions for the detail view.
  const plugin = getPlugin(def.id)
  const companionIds = plugin?.detail?.dependsOn ?? []
  const related: Record<string, IndicatorSnapshot> = {}
  for (const cid of companionIds) {
    const cdef = getIndicator(cid)
    if (cdef) related[cid] = await snapshotFor(cdef)
  }

  const Render = (plugin?.detail?.render ?? DefaultDetail) as typeof DefaultDetail

  const allSignals = await getRecentSignals(180)
  const ruleSignals = allSignals.filter((s) => {
    try {
      const inds = JSON.parse(s.indicators) as string[]
      return inds.includes(def.id)
    } catch {
      return false
    }
  })

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6">
        <div className="mb-6">
          <a href="/" className="text-xs text-blue-500 hover:underline">← 메인으로</a>
          <h1 className="mt-2 text-2xl font-bold">{def.nameKr}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{def.description ?? '—'}</p>
        </div>

        <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-baseline gap-4">
            <span className="text-4xl font-bold tabular">
              {latest === null ? '—' : formatNumber(latest, def.precision)}
            </span>
            <span className="text-sm text-gray-500">
              {def.unit === 'pct' ? '%' : def.unit === 'bp' ? 'bp' : def.unit === 'krw' ? '원' : def.unit === 'usd' ? '$' : ''}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            기준일: {transformed[transformed.length - 1]?.asOf ?? '—'} · 갱신 주기: {def.updateCadence}
          </div>

          <div className="mt-6">
            <Render def={def} snapshot={snapshot} related={related} />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="text-sm font-semibold mb-3">임계치</h2>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-emerald-600 font-medium">정상</div>
              <div className="tabular">{def.thresholds.normal[0]} ~ {def.thresholds.normal[1]}</div>
            </div>
            <div>
              <div className="text-amber-600 font-medium">경계</div>
              <div className="tabular">{def.thresholds.watch[0]} ~ {def.thresholds.watch[1]}</div>
            </div>
            <div>
              <div className="text-red-600 font-medium">위험</div>
              <div className="tabular">{def.thresholds.alert[0]} ~ {def.thresholds.alert[1]}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <h2 className="text-sm font-semibold mb-3">관련 알림 이력 ({ruleSignals.length})</h2>
          {ruleSignals.length === 0 ? (
            <p className="text-xs text-gray-400 italic">최근 180일간 알림 없음</p>
          ) : (
            <ul className="space-y-2">
              {ruleSignals.slice(0, 20).map((s) => (
                <li key={s.id} className="text-xs border-l-2 border-gray-300 pl-2">
                  <span className="font-medium">{s.message}</span>
                  <span className="ml-2 text-gray-500">{s.triggered_at}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
