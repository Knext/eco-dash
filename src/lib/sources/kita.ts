import { env } from '../env'
import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

/**
 * Korea Customs Service via data.go.kr 공공데이터포털.
 *
 * The `nitemtrade` endpoint exposes monthly item × country export/import
 * amounts. cntyCd is mandatory so there is no single-call "world total" —
 * we sum the top 5 trading partners (≈70% of Korean export value) and
 * derive YoY by comparing to the same calendar month one year ago.
 *
 * sourceId encodes what we want:
 *   "EXPORT_TOTAL_YOY"          – aggregate export YoY (HS empty → all goods)
 *   "EXPORT_SEMICONDUCTOR_YOY"  – semiconductor export YoY (HS 854)
 *   "TRADE_BALANCE"             – aggregate trade balance, billion USD
 */
const ENDPOINT = 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList'

// CN, US, JP, VN, HK — five biggest export destinations for Korea
const TOP_PARTNERS = ['CN', 'US', 'JP', 'VN', 'HK'] as const

interface NitemTradeRow {
  expDlr?: string | number
  impDlr?: string | number
  balPayments?: string | number
  year?: string
  statCd?: string
  statCdCntnKor1?: string
}

interface NitemTradeResponse {
  response?: {
    body?: {
      items?: { item?: NitemTradeRow | NitemTradeRow[] }
      totalCount?: number
    }
    header?: { resultCode?: string; resultMsg?: string }
  }
}

type Metric = 'expDlr' | 'impDlr' | 'balPayments'

export const kitaFetcher: SourceFetcher = {
  name: 'kita',
  async fetch(indicatorId, sourceId): Promise<FetchResult> {
    const start = Date.now()
    if (!env.PUBLIC_DATA_API_KEY) {
      return {
        indicatorId,
        source: 'kita',
        rows: [],
        success: false,
        error: 'PUBLIC_DATA_API_KEY not set — falling back to manual_overrides',
        durationMs: Date.now() - start,
      }
    }

    try {
      const { hsSgn, kind } = parseSourceId(sourceId)
      const monthlyTotals = await fetchTopPartnerMonths(env.PUBLIC_DATA_API_KEY, hsSgn)
      const rows = projectMetric(monthlyTotals, kind)
      if (rows.length === 0) {
        return {
          indicatorId,
          source: 'kita',
          rows: [],
          success: false,
          error: 'no rows from nitemtrade — falling back to manual_overrides',
          durationMs: Date.now() - start,
        }
      }
      return { indicatorId, source: 'kita', rows, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'kita',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

function parseSourceId(sourceId: string): { hsSgn: string; kind: 'yoy' | 'balance' } {
  switch (sourceId) {
    case 'EXPORT_TOTAL_YOY':
      return { hsSgn: '', kind: 'yoy' }
    case 'EXPORT_SEMICONDUCTOR_YOY':
      return { hsSgn: '854', kind: 'yoy' }
    case 'TRADE_BALANCE':
      return { hsSgn: '', kind: 'balance' }
    default:
      throw new Error(`unknown KITA sourceId: ${sourceId}`)
  }
}

/**
 * Build YYYYMM strings for the last 26 months so YoY can compare each of
 * the most recent 14 months against the same month a year ago.
 */
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

interface MonthlyTotals {
  /** key = YYYYMM, value = sum across top partners */
  exports: Map<string, number>
  imports: Map<string, number>
  balance: Map<string, number>
}

async function fetchTopPartnerMonths(apiKey: string, hsSgn: string): Promise<MonthlyTotals> {
  const months = recentMonths(26)
  const strt = months[0]!
  const end = months[months.length - 1]!

  const totals: MonthlyTotals = {
    exports: new Map(),
    imports: new Map(),
    balance: new Map(),
  }

  for (const cnty of TOP_PARTNERS) {
    const url = new URL(ENDPOINT)
    url.searchParams.set('serviceKey', apiKey)
    url.searchParams.set('strtYymm', strt)
    url.searchParams.set('endYymm', end)
    url.searchParams.set('cntyCd', cnty)
    if (hsSgn) url.searchParams.set('hsSgn', hsSgn)
    url.searchParams.set('numOfRows', '500')
    url.searchParams.set('pageNo', '1')
    // data.go.kr APIs vary on parameter name. Set both forms.
    url.searchParams.set('type', 'json')
    url.searchParams.set('_type', 'json')

    // Some Korean gov APIs return HTTP 406 when Accept is too strict.
    // Sending Accept: */* matches their content negotiation expectations.
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'economy-dashboard/0.1', Accept: '*/*' },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`kita HTTP ${res.status} (cnty=${cnty}): ${body.slice(0, 200)}`)
    }

    const text = await res.text()
    const ct = res.headers.get('content-type') ?? ''
    let data: NitemTradeResponse
    if (ct.includes('json') || text.trimStart().startsWith('{')) {
      try {
        data = JSON.parse(text) as NitemTradeResponse
      } catch (e) {
        throw new Error(`kita JSON parse error (cnty=${cnty}): ${text.slice(0, 200)}`)
      }
    } else {
      throw new Error(`kita non-JSON response (cnty=${cnty}, ct=${ct}): ${text.slice(0, 200)}`)
    }

    // data.go.kr sometimes returns OpenAPI_ServiceResponse with a reasonCode
    // even when HTTP 200. Surface that explicitly.
    const headerCode = data.response?.header?.resultCode
    if (headerCode && headerCode !== '00') {
      throw new Error(`kita result ${headerCode} (cnty=${cnty}): ${data.response?.header?.resultMsg ?? ''}`)
    }

    const itemRaw = data.response?.body?.items?.item
    const items: NitemTradeRow[] = Array.isArray(itemRaw) ? itemRaw : itemRaw ? [itemRaw] : []
    for (const it of items) {
      const ym = (it.year ?? '').toString().slice(0, 6)
      if (!/^\d{6}$/.test(ym)) continue
      const exp = numberOf(it.expDlr)
      const imp = numberOf(it.impDlr)
      const bal = numberOf(it.balPayments)
      if (exp !== null) totals.exports.set(ym, (totals.exports.get(ym) ?? 0) + exp)
      if (imp !== null) totals.imports.set(ym, (totals.imports.get(ym) ?? 0) + imp)
      if (bal !== null) totals.balance.set(ym, (totals.balance.get(ym) ?? 0) + bal)
    }
  }

  return totals
}

function numberOf(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = typeof v === 'number' ? v.toString() : String(v)
  return safeFinite(s.replace(/,/g, ''))
}

function projectMetric(
  totals: MonthlyTotals,
  kind: 'yoy' | 'balance',
): Array<{ asOf: string; value: number }> {
  if (kind === 'balance') {
    const out: Array<{ asOf: string; value: number }> = []
    for (const [ym, bal] of totals.balance) {
      out.push({ asOf: ymToIso(ym), value: bal / 1_000_000_000 }) // → billion USD
    }
    return out.sort((a, b) => a.asOf.localeCompare(b.asOf))
  }
  // yoy on exports
  const sorted = [...totals.exports.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const map = new Map(sorted)
  const out: Array<{ asOf: string; value: number }> = []
  for (const [ym, cur] of sorted) {
    const prevYm = priorYear(ym)
    const prev = map.get(prevYm)
    if (prev === undefined || prev === 0) continue
    const pct = ((cur - prev) / Math.abs(prev)) * 100
    out.push({ asOf: ymToIso(ym), value: pct })
  }
  return out
}

function priorYear(ym: string): string {
  const y = parseInt(ym.slice(0, 4), 10) - 1
  const m = ym.slice(4, 6)
  return `${y}${m}`
}

function ymToIso(ym: string): string {
  return `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`
}

/** Five biggest export destinations sampled by KITA fetcher (CN, US, JP, VN, HK). */
export const KITA_TOP_PARTNERS = TOP_PARTNERS
