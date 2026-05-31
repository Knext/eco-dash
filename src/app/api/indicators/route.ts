import { NextResponse } from 'next/server'
import {
  INDICATORS,
  INDICATOR_PLUGINS,
  getPlugin,
} from '@/lib/indicators/registry'
import { isStale, statusFor } from '@/lib/indicators/thresholds'
import { getLatestValuesBatch, getRecentValuesBatch } from '@/lib/db/queries'
import { toPoints, yoy, lastValue } from '@/lib/indicators/normalize'

export const dynamic = 'force-dynamic'

// History window (days) sized so the 90-pt sparkline fills out per data
// frequency: daily series need only ~400d (~280 trading pts), but low-freq
// monthly/quarterly series (e.g. S&P 500 PER monthly, PBR quarterly) need a
// far wider window or the sparkline collapses to a handful of points.
// YoY transforms separately need >=13 months for the ±15-day prior match.
function windowDaysFor(def: { transform?: string; updateCadence: string }): number {
  if (def.transform === 'yoy') return 800
  if (def.updateCadence === 'monthly') return 2800 // ~90 monthly / ~30 quarterly pts
  return 400
}

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

  // Batch all DB access into a constant number of round-trips instead of
  // 3×N (getRecentValues issues 2, plus getLatestValue) — the dominant cost
  // on a remote (Turso/HTTP) DB. One latest-row batch + one recent-history
  // batch per distinct window, all issued in parallel.
  const allIds = targets.map((d) => d.id)
  const windowGroups = new Map<number, string[]>()
  for (const def of targets) {
    const days = windowDaysFor(def)
    const ids = windowGroups.get(days)
    if (ids) ids.push(def.id)
    else windowGroups.set(days, [def.id])
  }

  const [latestMap, ...recentMapsByWindow] = await Promise.all([
    getLatestValuesBatch(allIds),
    ...[...windowGroups.entries()].map(([days, ids]) => getRecentValuesBatch(ids, days)),
  ])
  const recentMap = new Map(recentMapsByWindow.flatMap((m) => [...m]))

  const rows = targets.map((def) => {
      const recent = recentMap.get(def.id) ?? []
      const points = toPoints(recent)
      const transformed = def.transform === 'yoy' ? yoy(points) : points
      const latest = lastValue(transformed)
      const prev = transformed.length > 1 ? transformed[transformed.length - 2]?.value ?? null : null

      const last = latestMap.get(def.id)
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
    })
  return NextResponse.json({ indicators: rows, ts: new Date().toISOString() })
}
