import { env } from '../env'
import { coerceOptions } from './options'
import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

const ECOS_BASE = 'https://ecos.bok.or.kr/api/StatisticSearch'
const PAGE_SIZE = 1000

interface EcosRow {
  TIME: string
  DATA_VALUE: string
}

interface EcosResponse {
  StatisticSearch?: { list_total_count?: number; row?: EcosRow[] }
  RESULT?: { CODE: string; MESSAGE: string }
}

export const ecosFetcher: SourceFetcher<'ecos'> = {
  name: 'ecos',
  async fetch(indicatorId, optionsOrSourceId, startDate): Promise<FetchResult> {
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

    const options =
      typeof optionsOrSourceId === 'string'
        ? coerceOptions('ecos', optionsOrSourceId)
        : optionsOrSourceId
    const statCode = options.stat
    const itemCode = options.item
    if (!statCode) {
      return {
        indicatorId,
        source: 'ecos',
        rows: [],
        success: false,
        error: 'ecos options.stat is required',
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

    try {
      const collected: Array<{ asOf: string; value: number }> = []

      // ECOS caps a single request at 1,000 rows. Iterate pages until we
      // either receive a short page (last page) or hit a safety bound.
      // 5 years of daily data ≈ 1,300 trading rows, so 5 pages is plenty.
      const MAX_PAGES = 10
      for (let page = 1; page <= MAX_PAGES; page++) {
        const startIdx = (page - 1) * PAGE_SIZE + 1
        const endIdx = page * PAGE_SIZE
        const path = itemCode
          ? `${statCode}/D/${startStr}/${end}/${itemCode}`
          : `${statCode}/D/${startStr}/${end}`
        const url = `${ECOS_BASE}/${env.ECOS_API_KEY}/json/kr/${startIdx}/${endIdx}/${path}`

        const res = await fetch(url, { headers: { 'User-Agent': 'economy-dashboard/0.1' } })
        if (!res.ok) throw new Error(`ECOS HTTP ${res.status} (page=${page})`)
        const json = (await res.json()) as EcosResponse
        if (json.RESULT && json.RESULT.CODE !== 'INFO-000') {
          // INFO-200 = "no result". For pagination this just means we're past the end.
          if (json.RESULT.CODE === 'INFO-200') break
          throw new Error(`ECOS ${json.RESULT.CODE}: ${json.RESULT.MESSAGE}`)
        }
        const rawRows = json.StatisticSearch?.row ?? []
        if (rawRows.length === 0) break

        for (const r of rawRows) {
          const asOf = parseEcosDate(r.TIME)
          const v = safeFinite(r.DATA_VALUE)
          if (!asOf || v === null) continue
          collected.push({ asOf, value: v })
        }

        if (rawRows.length < PAGE_SIZE) break // last page reached
      }

      return {
        indicatorId,
        source: 'ecos',
        rows: collected,
        success: true,
        durationMs: Date.now() - start,
      }
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
