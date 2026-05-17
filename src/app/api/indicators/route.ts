import { NextResponse } from 'next/server'
import { INDICATORS } from '@/lib/indicators/definitions'
import { isStale, statusFor } from '@/lib/indicators/thresholds'
import { getLatestValue, getRecentValues } from '@/lib/db/queries'
import { toPoints, yoy, lastValue } from '@/lib/indicators/normalize'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await Promise.all(
    INDICATORS.filter((def) => !def.hidden).map(async (def) => {
      // YoY transforms need >=13 months of history; pull a wider window so the
      // ±15-day match can find a prior point. Sparkline only displays the tail.
      const window = def.transform === 'yoy' ? 800 : 400
      const rows = await getRecentValues(def.id, window)
      const points = toPoints(rows)
      const transformed = def.transform === 'yoy' ? yoy(points) : points
      const latest = lastValue(transformed)
      const prev = transformed.length > 1 ? transformed[transformed.length - 2]?.value ?? null : null

      const last = await getLatestValue(def.id)
      const asOf = last?.as_of ?? null
      const source = last?.source ?? def.source
      const stale = asOf ? isStale(def, asOf) : true
      const status = stale ? 'stale' : latest !== null ? statusFor(def, latest) : 'stale'

      return {
        id: def.id,
        name: def.name,
        nameKr: def.nameKr,
        category: def.category,
        unit: def.unit,
        precision: def.precision,
        mainView: def.mainView ?? false,
        value: latest,
        previousValue: prev,
        asOf,
        source,
        status,
        stale,
        history: transformed.slice(-90),
        thresholds: def.thresholds,
        releaseTimeET: def.releaseTimeET ?? null,
      }
    }),
  )
  return NextResponse.json({ indicators: result, ts: new Date().toISOString() })
}
