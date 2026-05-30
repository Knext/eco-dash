import { NextResponse } from 'next/server'
import {
  INDICATORS,
  INDICATOR_PLUGINS,
  getPlugin,
} from '@/lib/indicators/registry'
import { isStale, statusFor } from '@/lib/indicators/thresholds'
import { getLatestValue, getRecentValues } from '@/lib/db/queries'
import { toPoints, yoy, lastValue } from '@/lib/indicators/normalize'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Collect every indicator id needed to render the list view — visible
  // indicators plus any hidden ones declared as companions by a card
  // plugin (CardPlugin.dependsOn). Companions are fetched server-side so
  // the dashboard can render multi-indicator cards without N+1 client
  // round-trips.
  const visible = INDICATORS.filter((def) => !def.hidden)
  const companionIds = new Set<string>()
  for (const plugin of INDICATOR_PLUGINS) {
    const deps = plugin.card?.dependsOn
    if (!deps) continue
    for (const id of deps) companionIds.add(id)
  }
  const targets = [...visible]
  for (const id of companionIds) {
    if (targets.find((d) => d.id === id)) continue
    const def = INDICATORS.find((d) => d.id === id)
    if (def) targets.push(def)
  }

  const rows = await Promise.all(
    targets.map(async (def) => {
      // YoY transforms need >=13 months of history; pull a wider window so the
      // ±15-day match can find a prior point. Sparkline only displays the tail.
      const window = def.transform === 'yoy' ? 800 : 400
      const recent = await getRecentValues(def.id, window)
      const points = toPoints(recent)
      const transformed = def.transform === 'yoy' ? yoy(points) : points
      const latest = lastValue(transformed)
      const prev = transformed.length > 1 ? transformed[transformed.length - 2]?.value ?? null : null

      const last = await getLatestValue(def.id)
      const asOf = last?.as_of ?? null
      // `def.source` is gone in Phase 5; fall back to the plugin's
      // primary fetcher source for display when no rows exist yet.
      const source = last?.source ?? getPlugin(def.id)?.fetcher.source ?? 'unknown'
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
        // Hidden flag tells the client whether to render this row as a
        // standalone card or only as a companion to another card.
        companion: !visible.find((v) => v.id === def.id),
      }
    }),
  )
  return NextResponse.json({ indicators: rows, ts: new Date().toISOString() })
}
