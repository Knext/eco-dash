import type { IndicatorDef } from '../indicators/types'
import { getPlugin } from '../indicators/registry'
import { insertTimeseries, logFetch } from '../db/queries'
import { fredFetcher } from './fred'
import { ecosFetcher } from './ecos'
import { kitaFetcher } from './kita'
import { kosisFetcher } from './kosis'
import { yfinanceFetcher } from './yfinance'
import { stooqFetcher } from './stooq'
import { krxFetcher } from './krx'
import { manualFetcher } from './manual'
import type { FetcherSpec, OptionsBySource, SourceName } from './options'
import type { SourceFetcher, FetchResult } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FETCHERS: Record<SourceName, SourceFetcher<any>> = {
  fred: fredFetcher,
  ecos: ecosFetcher,
  kita: kitaFetcher,
  kosis: kosisFetcher,
  yfinance: yfinanceFetcher,
  stooq: stooqFetcher,
  krx: krxFetcher,
  manual: manualFetcher,
}

async function runSpec(
  indicatorId: string,
  spec: FetcherSpec,
  startDate?: string,
): Promise<FetchResult> {
  const fetcher = FETCHERS[spec.source]
  if (!fetcher) {
    return {
      indicatorId,
      source: spec.source,
      rows: [],
      success: false,
      error: `Unknown source: ${spec.source}`,
      durationMs: 0,
    }
  }
  return fetcher.fetch(indicatorId, spec.options as OptionsBySource[typeof spec.source], startDate)
}

export async function fetchIndicator(
  def: IndicatorDef,
  startDate?: string,
): Promise<FetchResult> {
  const plugin = getPlugin(def.id)
  if (!plugin) {
    return {
      indicatorId: def.id,
      source: 'unknown',
      rows: [],
      success: false,
      error: `No plugin registered for indicator ${def.id}`,
      durationMs: 0,
    }
  }
  const spec = plugin.fetcher

  const result = await runSpec(def.id, spec, startDate)
  if (result.success && result.rows.length > 0) return result

  if (spec.fallback) {
    const fbResult = await runSpec(def.id, spec.fallback, startDate)
    if (!fbResult.success && result.error) {
      // Surface both errors so production logs reveal why the primary
      // fetcher failed, not just the fallback.
      return {
        ...fbResult,
        error: `primary(${spec.source}): ${result.error} | fallback(${spec.fallback.source}): ${fbResult.error ?? 'unknown'}`,
      }
    }
    return fbResult
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

export { fredFetcher, ecosFetcher, kitaFetcher, kosisFetcher, yfinanceFetcher, stooqFetcher, krxFetcher, manualFetcher }
