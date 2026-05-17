import { env } from '../env'
import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

/**
 * KOSIS (Korean Statistical Information Service) OpenAPI.
 *
 * Each indicator's KOSIS table parameters live in a per-indicator env var
 * (KOSIS_KR_EXPORT_PARAMS, etc) so users can plug in the exact statistical
 * table they want without code changes. The expected format is a URL query
 * string carrying orgId/tblId/itmId/objL1/prdSe plus optional flags:
 *
 *   "orgId=360&tblId=DT_1R11001_FRM101&itmId=T01&objL1=ALL&prdSe=M&yoy=true"
 *
 * Custom flags:
 *   yoy=true       - convert raw monthly values to YoY % via 12-month lookback
 *   scale=1e9      - divide raw value by 1,000,000,000 (USD → billion USD)
 *   sign=-1        - flip sign (rare)
 */
const KOSIS_BASE = 'https://kosis.kr/openapi/Param/statisticsParameterData.do'

const PARAM_ENV: Record<string, string | undefined> = {
  EXPORT_TOTAL_YOY: env.KOSIS_KR_EXPORT_PARAMS,
  EXPORT_SEMICONDUCTOR_YOY: env.KOSIS_KR_EXPORT_SEMI_PARAMS,
  TRADE_BALANCE: env.KOSIS_KR_TB_PARAMS,
}

interface KosisRow {
  PRD_DE?: string
  DT?: string
  ITM_NM?: string
  C1?: string
  C1_NM?: string
}

export const kosisFetcher: SourceFetcher = {
  name: 'kosis',
  async fetch(indicatorId, sourceId): Promise<FetchResult> {
    const start = Date.now()
    if (!env.KOSIS_API_KEY) {
      return {
        indicatorId,
        source: 'kosis',
        rows: [],
        success: false,
        error: 'KOSIS_API_KEY not set — falling back to manual_overrides',
        durationMs: Date.now() - start,
      }
    }

    const paramsRaw = PARAM_ENV[sourceId]
    if (!paramsRaw) {
      return {
        indicatorId,
        source: 'kosis',
        rows: [],
        success: false,
        error: `KOSIS_${sourceId}_PARAMS env var not set — see docs/DEPLOY_VERCEL.md for KOSIS setup`,
        durationMs: Date.now() - start,
      }
    }

    try {
      const overrides = new URLSearchParams(paramsRaw)
      const yoy = overrides.get('yoy') === 'true'
      const scale = parseFloat(overrides.get('scale') ?? '1') || 1
      const sign = parseFloat(overrides.get('sign') ?? '1') || 1
      // Strip our custom flags before forwarding to KOSIS
      overrides.delete('yoy')
      overrides.delete('scale')
      overrides.delete('sign')

      // Date window — 26 months back so YoY can match
      const window = recentMonths(26)
      if (!overrides.has('startPrdDe')) overrides.set('startPrdDe', window[0]!)
      if (!overrides.has('endPrdDe')) overrides.set('endPrdDe', window[window.length - 1]!)
      if (!overrides.has('prdSe')) overrides.set('prdSe', 'M')
      if (!overrides.has('itmId')) overrides.set('itmId', 'ALL')
      if (!overrides.has('objL1')) overrides.set('objL1', 'ALL')

      // Required fixed params
      overrides.set('method', 'getList')
      overrides.set('apiKey', env.KOSIS_API_KEY)
      overrides.set('format', 'json')
      overrides.set('jsonVD', 'Y')

      const url = `${KOSIS_BASE}?${overrides.toString()}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'economy-dashboard/0.1', Accept: '*/*' },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`kosis HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const text = await res.text()
      const trimmed = text.trimStart()
      if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
        throw new Error(`kosis non-JSON response: ${text.slice(0, 200)}`)
      }
      const parsed = JSON.parse(text) as KosisRow[] | { err?: string; errMsg?: string }

      if (!Array.isArray(parsed)) {
        const msg = parsed.errMsg ?? parsed.err ?? JSON.stringify(parsed)
        throw new Error(`kosis error: ${msg.slice(0, 200)}`)
      }
      if (parsed.length === 0) {
        return {
          indicatorId,
          source: 'kosis',
          rows: [],
          success: false,
          error: 'kosis returned 0 rows — verify orgId/tblId/itmId/objL1 in env var',
          durationMs: Date.now() - start,
        }
      }

      const monthly = new Map<string, number>()
      for (const r of parsed) {
        const prd = r.PRD_DE
        const dt = r.DT
        if (!prd || !dt) continue
        if (!/^\d{6}$/.test(prd)) continue
        const v = safeFinite(String(dt).replace(/,/g, ''))
        if (v === null) continue
        // Sum if multiple rows per PRD_DE (e.g. when objL1=ALL returns subtotals)
        monthly.set(prd, (monthly.get(prd) ?? 0) + v)
      }

      const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      const out: Array<{ asOf: string; value: number }> = []
      if (yoy) {
        const map = new Map(sorted)
        for (const [ym, cur] of sorted) {
          const prevYm = priorYear(ym)
          const prev = map.get(prevYm)
          if (prev === undefined || prev === 0) continue
          const pct = ((cur - prev) / Math.abs(prev)) * 100 * sign
          out.push({ asOf: ymToIso(ym), value: pct })
        }
      } else {
        for (const [ym, v] of sorted) {
          out.push({ asOf: ymToIso(ym), value: (v / scale) * sign })
        }
      }

      if (out.length === 0) {
        return {
          indicatorId,
          source: 'kosis',
          rows: [],
          success: false,
          error: 'kosis parsed 0 usable rows (yoy lookback may have failed)',
          durationMs: Date.now() - start,
        }
      }
      return { indicatorId, source: 'kosis', rows: out, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'kosis',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

function recentMonths(count: number): string[] {
  const out: string[] = []
  const now = new Date()
  let y = now.getFullYear()
  let m = now.getMonth() + 1
  for (let i = 0; i < count; i++) {
    out.push(`${y}${String(m).padStart(2, '0')}`)
    m--
    if (m === 0) {
      m = 12
      y--
    }
  }
  return out.reverse()
}

function priorYear(ym: string): string {
  const y = parseInt(ym.slice(0, 4), 10) - 1
  const m = ym.slice(4, 6)
  return `${y}${m}`
}

function ymToIso(ym: string): string {
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`
}
