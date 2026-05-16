import { env } from '../env'
import { redact, safeFinite } from './redact'
import type { FetchResult, SourceFetcher } from './types'

/**
 * Korea Customs Service (관세청) 무역통계 via data.go.kr (공공데이터포털).
 * Requires PUBLIC_DATA_API_KEY (free, application via data.go.kr).
 *
 * The 관세청 service exposes monthly export/import statistics. Without
 * an API key (the common case), this fetcher fails fast so the
 * manual fallback can take over.
 *
 * Endpoint: https://apis.data.go.kr/1220000/Itstatistic03Service
 * (subject to change — verify with data.go.kr if it stops working)
 */
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
      const rows = await fetchKitaSeries(sourceId)
      if (rows.length === 0) {
        return {
          indicatorId,
          source: 'kita',
          rows: [],
          success: false,
          error: 'kita returned 0 rows — falling back to manual_overrides',
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

interface KitaItem {
  statKor?: string
  expDlr?: string
  impDlr?: string
  balPayments?: string
  year?: string
  month?: string
}

async function fetchKitaSeries(sourceId: string): Promise<Array<{ asOf: string; value: number }>> {
  // 관세청 OpenAPI는 sourceId마다 엔드포인트가 다름.
  // EXPORT_TOTAL_YOY, EXPORT_SEMICONDUCTOR_YOY, TRADE_BALANCE를 매핑.
  // 실제 API 응답이 다양할 수 있으므로 베스트 노력.
  const path = sourceId === 'TRADE_BALANCE' ? 'getCtyNCntyList' : 'getExpStaticsList'
  const url = new URL(`https://apis.data.go.kr/1220000/Itstatistic03Service/${path}`)
  url.searchParams.set('serviceKey', env.PUBLIC_DATA_API_KEY ?? '')
  url.searchParams.set('resultType', 'json')
  url.searchParams.set('numOfRows', '60')
  url.searchParams.set('pageNo', '1')

  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'economy-dashboard/0.1' } })
  if (!res.ok) throw new Error(`kita HTTP ${res.status}`)

  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('json')) throw new Error(`kita unexpected content-type: ${ct}`)

  const data = (await res.json()) as {
    response?: { body?: { items?: { item?: KitaItem[] | KitaItem } } }
  }
  const itemRaw = data.response?.body?.items?.item
  const items: KitaItem[] = Array.isArray(itemRaw) ? itemRaw : itemRaw ? [itemRaw] : []

  return items
    .map((it) => {
      const y = it.year
      const m = it.month
      if (!y || !m) return null
      const asOf = `${y}-${m.padStart(2, '0')}-01`
      const rawValue =
        sourceId === 'TRADE_BALANCE'
          ? it.balPayments
          : sourceId === 'EXPORT_SEMICONDUCTOR_YOY'
            ? it.expDlr
            : it.expDlr
      if (!rawValue) return null
      const v = safeFinite(rawValue)
      return v === null ? null : { asOf, value: v }
    })
    .filter((r): r is { asOf: string; value: number } => r !== null)
}
