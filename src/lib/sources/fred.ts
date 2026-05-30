import { z } from 'zod'
import { env } from '../env'
import { coerceOptions } from './options'
import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations'

const ObservationSchema = z.object({
  date: z.string(),
  value: z.string(),
})

const ResponseSchema = z.object({
  observations: z.array(ObservationSchema),
})

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const fredFetcher: SourceFetcher<'fred'> = {
  name: 'fred',
  async fetch(indicatorId, optionsOrSourceId, startDate): Promise<FetchResult> {
    const start = Date.now()
    if (!env.FRED_API_KEY) {
      return {
        indicatorId,
        source: 'fred',
        rows: [],
        success: false,
        error: 'FRED_API_KEY not set',
        durationMs: Date.now() - start,
      }
    }

    const options =
      typeof optionsOrSourceId === 'string'
        ? coerceOptions('fred', optionsOrSourceId)
        : optionsOrSourceId

    const url = new URL(FRED_BASE)
    url.searchParams.set('series_id', options.series)
    url.searchParams.set('api_key', env.FRED_API_KEY)
    url.searchParams.set('file_type', 'json')
    if (startDate) url.searchParams.set('observation_start', startDate)

    try {
      const res = await fetchWithRetry(url.toString())
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`FRED HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const json = await res.json()
      const parsed = ResponseSchema.parse(json)
      const rows = parsed.observations
        .map((o) => {
          if (!DATE_RE.test(o.date)) return null
          const v = safeFinite(o.value)
          return v === null ? null : { asOf: o.date, value: v }
        })
        .filter((r): r is { asOf: string; value: number } => r !== null)
      return {
        indicatorId,
        source: 'fred',
        rows,
        success: true,
        durationMs: Date.now() - start,
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'fred',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'economy-dashboard/0.1' } })
      if (res.ok || res.status === 404) return res
      if (res.status >= 500) {
        await sleep(Math.pow(2, i) * 1000)
        continue
      }
      return res
    } catch (e) {
      lastErr = e
      await sleep(Math.pow(2, i) * 1000)
    }
  }
  throw lastErr ?? new Error('fetch failed after retries')
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
