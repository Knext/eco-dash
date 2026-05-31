import { coerceOptions } from './options'
import { redact, safeFinite } from './redact'
import { getKrxCookie, KrxAuthError, KRX_USER_AGENT } from './krx-auth'
import type { KrxOptions } from './options'
import type { FetchResult, SourceFetcher } from './types'

/**
 * KRX Market Data 소스 — 개별지수 PER/PBR/배당수익률 시계열.
 *
 * pykrx의 `PER_PBR_배당수익률_개별지수`(bld=MDCSTAT00702)와 동일한 엔드포인트를
 * 사용한다. MDCSTAT* 통계 API는 로그인을 요구하므로 인증 쿠키를 붙인다
 * (./krx-auth.ts). 실패는 throw하지 않고 빈 rows + error로 graceful degrade.
 *
 * KRX는 단일 요청에서 약 730일까지만 안정적으로 반환하므로(=pykrx와 동일),
 * 조회 구간을 ≤2년 윈도로 잘라 순회한 뒤 합친다.
 */
const KRX_URL = 'https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'
const KRX_BLD = 'dbms/MDC/STAT/standard/MDCSTAT00702'
const KRX_REFERER = 'https://data.krx.co.kr/contents/MDC/MDI/outerLoader/index.cmd'

const DEFAULT_LOOKBACK_YEARS = 5
const CHUNK_DAYS = 720 // < 730일 한도
const DAY_MS = 24 * 60 * 60 * 1000

/** 친화적 valueKey → KRX 응답 필드명 매핑. */
const FIELD_BY_VALUE_KEY: Record<KrxOptions['valueKey'], string> = {
  PBR: 'WT_STKPRC_NETASST_RTO',
  PER: 'WT_PER',
  DVD_YLD: 'DIV_YD',
}

interface KrxRow {
  TRD_DD?: string
  [key: string]: string | undefined
}

interface KrxResponse {
  output?: KrxRow[]
  OutBlock_1?: KrxRow[]
}

export const krxFetcher: SourceFetcher<'krx'> = {
  name: 'krx',
  async fetch(indicatorId, optionsOrSourceId, startDate): Promise<FetchResult> {
    const start = Date.now()
    const options =
      typeof optionsOrSourceId === 'string'
        ? coerceOptions('krx', optionsOrSourceId)
        : optionsOrSourceId

    const field = FIELD_BY_VALUE_KEY[options.valueKey]

    try {
      const cookie = await getKrxCookie()

      const today = new Date()
      const startMs = startDate
        ? new Date(startDate).getTime()
        : today.getTime() - DEFAULT_LOOKBACK_YEARS * 365 * DAY_MS

      const byDate = new Map<string, number>()
      for (const [chunkStart, chunkEnd] of dateChunks(startMs, today.getTime())) {
        const json = await fetchChunk(options, chunkStart, chunkEnd, cookie)
        for (const { asOf, value } of parseKrxRows(json, field)) {
          byDate.set(asOf, value) // 중복 날짜는 마지막 값으로 덮어씀
        }
      }

      const rows = Array.from(byDate.entries())
        .map(([asOf, value]) => ({ asOf, value }))
        .sort((a, b) => a.asOf.localeCompare(b.asOf))

      if (rows.length === 0) {
        return {
          indicatorId,
          source: 'krx',
          rows: [],
          success: false,
          error: `no rows parsed for ${options.indTpCd}/${options.indTpCd2}/${options.valueKey} (KRX empty or schema changed)`,
          durationMs: Date.now() - start,
        }
      }
      return { indicatorId, source: 'krx', rows, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw =
        e instanceof KrxAuthError
          ? `auth: ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e)
      return {
        indicatorId,
        source: 'krx',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

async function fetchChunk(
  options: KrxOptions,
  strtDd: string,
  endDd: string,
  cookie: string,
): Promise<KrxResponse> {
  const body = new URLSearchParams({
    bld: KRX_BLD,
    indTpCd: options.indTpCd,
    indTpCd2: options.indTpCd2,
    strtDd,
    endDd,
  })
  const res = await fetch(KRX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': KRX_USER_AGENT,
      Referer: KRX_REFERER,
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookie,
    },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`KRX HTTP ${res.status}`)
  const text = await res.text()
  // 비인증/차단 시 KRX는 본문 "LOGOUT"을 200/400으로 반환하기도 한다.
  if (text.trim() === 'LOGOUT') throw new Error('KRX returned LOGOUT (session expired or login required)')
  return JSON.parse(text) as KrxResponse
}

/** [startMs, endMs]를 ≤CHUNK_DAYS 윈도(YYYYMMDD 문자열 쌍)로 분할. */
function dateChunks(startMs: number, endMs: number): Array<[string, string]> {
  const chunks: Array<[string, string]> = []
  let cursor = startMs
  while (cursor <= endMs) {
    const chunkEnd = Math.min(cursor + CHUNK_DAYS * DAY_MS, endMs)
    chunks.push([toYmd(cursor), toYmd(chunkEnd)])
    cursor = chunkEnd + DAY_MS
  }
  return chunks
}

function toYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10).replace(/-/g, '')
}

/**
 * KRX getJsonData 응답에서 (날짜, 값) 추출. 라이브 호출 없이 단위 테스트
 * 가능하도록 순수 함수로 분리. `field`는 KRX 응답 필드명
 * (예: PBR='WT_STKPRC_NETASST_RTO'). 날짜는 "YYYY/MM/DD"로 오며 숫자는
 * 콤마 그룹 문자열("1,234.56")이라 콤마를 제거 후 파싱한다.
 */
export function parseKrxRows(
  json: KrxResponse,
  field: string,
): Array<{ asOf: string; value: number }> {
  const rawRows = json.output ?? json.OutBlock_1 ?? []
  const out: Array<{ asOf: string; value: number }> = []
  for (const r of rawRows) {
    const asOf = parseKrxDate(r.TRD_DD)
    if (!asOf) continue
    const raw = r[field]
    if (raw === undefined) continue
    const v = safeFinite(raw.replace(/,/g, ''))
    if (v === null) continue
    out.push({ asOf, value: v })
  }
  out.sort((a, b) => a.asOf.localeCompare(b.asOf))
  return out
}

function parseKrxDate(time: string | undefined): string {
  if (!time) return ''
  // "2024/01/02" -> "2024-01-02"; 이미 대시 형식이어도 허용.
  const m = time.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}
