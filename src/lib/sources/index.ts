import type { IndicatorDef } from '../indicators/types'
import { insertTimeseries, logFetch } from '../db/queries'
import { fredFetcher } from './fred'
import { ecosFetcher } from './ecos'
import { kitaFetcher } from './kita'
import { yfinanceFetcher } from './yfinance'
import { stooqFetcher } from './stooq'
import { manualFetcher } from './manual'
import type { SourceFetcher, FetchResult } from './types'

const FETCHERS: Record<string, SourceFetcher> = {
  fred: fredFetcher,
  ecos: ecosFetcher,
  kita: kitaFetcher,
  yfinance: yfinanceFetcher,
  stooq: stooqFetcher,
  manual: manualFetcher,
}

export async function fetchIndicator(def: IndicatorDef, startDate?: string): Promise<FetchResult> {
  const primary = FETCHERS[def.source]
  if (!primary) {
    const r: FetchResult = {
      indicatorId: def.id,
      source: def.source,
      rows: [],
      success: false,
      error: `Unknown source: ${def.source}`,
      durationMs: 0,
    }
    return r
  }
  const result = await primary.fetch(def.id, def.sourceId, startDate)
  if (result.success && result.rows.length > 0) {
    return result
  }

  if (def.fallbackSource && def.fallbackSourceId) {
    const fb = FETCHERS[def.fallbackSource]
    if (fb) {
      const fbResult = await fb.fetch(def.id, def.fallbackSourceId, startDate)
      // Surface both errors when neither source produced data so production
      // logs reveal why the primary fetcher failed, not just the fallback.
      if (!fbResult.success && result.error) {
        return {
          ...fbResult,
          error: `primary(${primary.name}): ${result.error} | fallback(${fb.name}): ${fbResult.error ?? 'unknown'}`,
        }
      }
      return fbResult
    }
  }
  return result
}

export async function fetchAndStore(def: IndicatorDef, startDate?: string): Promise<FetchResult> {
  const result = await fetchIndicator(def, startDate)
  let inserted = 0
  if (result.success && result.rows.length > 0) {
    inserted = await insertTimeseries(
      result.rows.map((r) => ({
        indicator_id: def.id,
        as_of: r.asOf,
        value: r.value,
        source: result.source,
      })),
    )
  }
  await logFetch(result.source, def.id, result.success, inserted, result.error ?? null, result.durationMs)
  return result
}

export { fredFetcher, ecosFetcher, kitaFetcher, yfinanceFetcher, stooqFetcher, manualFetcher }
