import { coerceOptions } from './options'
import { redact, safeFinite } from './redact'
import type { MultplOptions } from './options'
import type { FetchResult, SourceFetcher } from './types'

/**
 * multpl.com 소스 — S&P 500 밸류에이션 시계열(PER/PBR).
 *
 * FRED/yfinance에는 S&P 500의 PER/PBR 시계열이 없어 multpl.com의 공개
 * HTML 표를 파싱한다. 키·로그인 불필요. 표 구조가 바뀌면 빈 rows + error로
 * graceful degrade(throw 안 함). PER은 월간, PBR은 분기 데이터.
 */
const URLS: Record<MultplOptions['metric'], string> = {
  pe: 'https://www.multpl.com/s-p-500-pe-ratio/table/by-month',
  pb: 'https://www.multpl.com/s-p-500-price-to-book/table/by-quarter',
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

export const multplFetcher: SourceFetcher<'multpl'> = {
  name: 'multpl',
  async fetch(indicatorId, optionsOrSourceId): Promise<FetchResult> {
    const start = Date.now()
    const options =
      typeof optionsOrSourceId === 'string'
        ? coerceOptions('multpl', optionsOrSourceId)
        : optionsOrSourceId
    const url = URLS[options.metric]

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) throw new Error(`multpl HTTP ${res.status}`)
      const html = await res.text()
      const rows = parseMultplTable(html)
      if (rows.length === 0) {
        return {
          indicatorId,
          source: 'multpl',
          rows: [],
          success: false,
          error: `no rows parsed for metric=${options.metric} (multpl empty or markup changed)`,
          durationMs: Date.now() - start,
        }
      }
      return { indicatorId, source: 'multpl', rows, success: true, durationMs: Date.now() - start }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      return {
        indicatorId,
        source: 'multpl',
        rows: [],
        success: false,
        error: redact(raw),
        durationMs: Date.now() - start,
      }
    }
  },
}

/**
 * multpl.com `<table id="datatable">`에서 (날짜, 값) 추출. 라이브 호출 없이
 * 단위 테스트 가능하도록 순수 함수로 분리.
 *
 * 행 형태: `<tr class="odd"><td>May 29, 2026</td><td><abbr ...>†</abbr>32.67</td></tr>`
 * 값 셀의 추정치 마커(†)와 태그를 제거하고, 날짜 "Mon D, YYYY"를 ISO로 변환한다.
 * 결과는 오름차순 정렬.
 */
export function parseMultplTable(html: string): Array<{ asOf: string; value: number }> {
  const tableStart = html.indexOf('id="datatable"')
  if (tableStart < 0) return []
  const tableEnd = html.indexOf('</table>', tableStart)
  const table = tableEnd > 0 ? html.slice(tableStart, tableEnd) : html.slice(tableStart)

  const out: Array<{ asOf: string; value: number }> = []
  const rowRe = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(table)) !== null) {
    const asOf = parseMultplDate((m[1] ?? '').trim())
    if (!asOf) continue // skips the header row ("Date") too
    // Value cells carry noise: an <abbr>†</abbr> estimate marker on recent
    // rows, an &#x2002; (en-space) entity on historical rows, and comma
    // grouping on large values. Strip tags + entities, then pull the number.
    const cleaned = stripTags(m[2] ?? '')
      .replace(/&[#a-z0-9]+;/gi, '')
      .replace(/,/g, '')
    const num = cleaned.match(/-?\d+(?:\.\d+)?/)
    const v = num ? safeFinite(num[0]) : null
    if (v === null) continue
    out.push({ asOf, value: v })
  }
  out.sort((a, b) => a.asOf.localeCompare(b.asOf))
  return out
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '')
}

function parseMultplDate(text: string): string {
  // "May 29, 2026" / "Dec 31, 2025"
  const m = text.match(/^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/)
  if (!m) return ''
  const mm = MONTHS[m[1] as string]
  if (!mm) return ''
  return `${m[3]}-${mm}-${String(m[2]).padStart(2, '0')}`
}
