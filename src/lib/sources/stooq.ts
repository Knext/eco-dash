import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

const STOOQ_BASE = 'https://stooq.com/q/d/l'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const stooqFetcher: SourceFetcher = {
  name: 'stooq',
  async fetch(indicatorId, sourceId): Promise<FetchResult> {
    const start = Date.now()
    const url = `${STOOQ_BASE}/?s=${encodeURIComponent(sourceId)}&i=d`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'economy-dashboard/0.1' } })
      if (!res.ok) throw new Error(`stooq HTTP ${res.status}`)
      const csv = await res.text()
      const rows = parseStooqCsv(csv)
      if (rows.length === 0) {
        return {
          indicatorId,
          source: 'stooq',
          rows: [],
          success: false,
          error: 'no rows parsed (stooq empty or blocked)',
          durationMs: Date.now() - start,
        }
      }
      return { indicatorId, source: 'stooq', rows, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'stooq',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

function parseStooqCsv(csv: string): Array<{ asOf: string; value: number }> {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const header = lines[0]?.toLowerCase() ?? ''
  if (!header.includes('date') || !header.includes('close')) return []
  const out: Array<{ asOf: string; value: number }> = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const cols = line.split(',')
    if (cols.length < 5) continue
    const date = cols[0]
    const close = cols[4]
    if (!date || !close) continue
    if (!DATE_RE.test(date)) continue
    const v = safeFinite(close)
    if (v === null) continue
    out.push({ asOf: date, value: v })
  }
  return out
}
