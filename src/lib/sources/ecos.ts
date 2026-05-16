import { env } from '../env'
import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

const ECOS_BASE = 'https://ecos.bok.or.kr/api/StatisticSearch'

export const ecosFetcher: SourceFetcher = {
  name: 'ecos',
  async fetch(indicatorId, sourceId, startDate): Promise<FetchResult> {
    const start = Date.now()
    if (!env.ECOS_API_KEY) {
      return {
        indicatorId,
        source: 'ecos',
        rows: [],
        success: false,
        error: 'ECOS_API_KEY not set',
        durationMs: Date.now() - start,
      }
    }

    const today = new Date()
    const end = today.toISOString().slice(0, 10).replace(/-/g, '')
    const startStr = startDate
      ? startDate.replace(/-/g, '')
      : new Date(today.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '')

    const url = `${ECOS_BASE}/${env.ECOS_API_KEY}/json/kr/1/1000/${sourceId}/D/${startStr}/${end}`

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'economy-dashboard/0.1' } })
      if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`)
      const json = (await res.json()) as {
        StatisticSearch?: { row?: Array<{ TIME: string; DATA_VALUE: string }> }
        RESULT?: { CODE: string; MESSAGE: string }
      }
      if (json.RESULT && json.RESULT.CODE !== 'INFO-000') {
        throw new Error(`ECOS ${json.RESULT.CODE}: ${json.RESULT.MESSAGE}`)
      }
      const rawRows = json.StatisticSearch?.row ?? []
      const rows = rawRows
        .map((r) => {
          const asOf = parseEcosDate(r.TIME)
          const v = safeFinite(r.DATA_VALUE)
          if (!asOf || v === null) return null
          return { asOf, value: v }
        })
        .filter((r): r is { asOf: string; value: number } => r !== null)
      return { indicatorId, source: 'ecos', rows, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'ecos',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

function parseEcosDate(time: string): string {
  if (time.length === 8) return `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}`
  if (time.length === 6) return `${time.slice(0, 4)}-${time.slice(4, 6)}-01`
  if (time.length === 4) return `${time}-01-01`
  return ''
}
