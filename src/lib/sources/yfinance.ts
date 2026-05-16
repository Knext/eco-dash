import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

/**
 * Yahoo Finance v8 chart API (JSON). Unofficial but widely used.
 * The v7 download endpoint requires crumb/cookies since 2024; v8 chart
 * endpoint still works without authentication for historical OHLC.
 */
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

export const yfinanceFetcher: SourceFetcher = {
  name: 'yfinance',
  async fetch(indicatorId, sourceId, startDate): Promise<FetchResult> {
    const start = Date.now()
    const period1 = Math.floor(
      startDate
        ? new Date(startDate).getTime() / 1000
        : (Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) / 1000,
    )
    const period2 = Math.floor(Date.now() / 1000)

    const url = new URL(`${YF_BASE}/${encodeURIComponent(sourceId)}`)
    url.searchParams.set('period1', period1.toString())
    url.searchParams.set('period2', period2.toString())
    url.searchParams.set('interval', '1d')

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; economy-dashboard/0.1)',
          Accept: 'application/json',
        },
      })
      if (!res.ok) throw new Error(`yfinance HTTP ${res.status}`)

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('json')) {
        throw new Error(`unexpected content-type: ${contentType}`)
      }

      const json = (await res.json()) as YfChartResponse
      const rows = extractRows(json)
      if (rows.length === 0) {
        return {
          indicatorId,
          source: 'yfinance',
          rows: [],
          success: false,
          error: 'no rows parsed (yfinance empty response)',
          durationMs: Date.now() - start,
        }
      }
      return { indicatorId, source: 'yfinance', rows, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'yfinance',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

interface YfChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>
        adjclose?: Array<{ adjclose?: Array<number | null> }>
      }
    }>
    error?: { code: string; description: string }
  }
}

function extractRows(json: YfChartResponse): Array<{ asOf: string; value: number }> {
  if (json.chart?.error) throw new Error(`yfinance error: ${json.chart.error.description}`)
  const result = json.chart?.result?.[0]
  if (!result) return []
  const timestamps = result.timestamp ?? []
  const closes =
    result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close ?? []
  const out: Array<{ asOf: string; value: number }> = []
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i]
    const c = closes[i]
    if (ts === undefined || c === null || c === undefined) continue
    if (!Number.isFinite(c)) continue
    const asOf = new Date(ts * 1000).toISOString().slice(0, 10)
    const v = safeFinite(c.toString())
    if (v === null) continue
    out.push({ asOf, value: v })
  }
  return out
}
