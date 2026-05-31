/**
 * Typed option shapes per data source. Phase 2 of the plugin refactor —
 * lets indicator plugins express their fetcher configuration as a
 * discriminated union instead of free-form `sourceId` strings.
 *
 *   { source: 'yfinance', options: { ticker: 'DX-Y.NYB' } }
 *   { source: 'ecos',     options: { stat: '731Y001', item: '0000001' } }
 *
 * Each fetcher accepts either the typed Options OR a legacy string
 * `sourceId` (handled by `coerceOptions` below) so this phase ships
 * without forcing the 30+ existing definitions to migrate.
 */

export interface YFinanceOptions {
  readonly ticker: string
}

export interface FredOptions {
  readonly series: string
}

export interface EcosOptions {
  readonly stat: string
  readonly item?: string
}

export interface KosisOptions {
  readonly paramKey: 'EXPORT_TOTAL_YOY' | 'EXPORT_SEMICONDUCTOR_YOY' | 'TRADE_BALANCE'
}

export interface StooqOptions {
  readonly symbol: string
}

export interface KitaOptions {
  readonly kind: 'EXPORT_TOTAL_YOY' | 'EXPORT_SEMICONDUCTOR_YOY' | 'TRADE_BALANCE'
}

/**
 * KRX Market Data (data.krx.co.kr) 개별지수 PER/PBR/배당수익률 시계열 —
 * `MDCSTAT00702` 엔드포인트 (pykrx의 `PER_PBR_배당수익률_개별지수`와 동일).
 * KOSPI PBR은 FRED/ECOS/yfinance에 없어 이 소스로 수집한다. 단 MDCSTAT*
 * 통계 API는 KRX 로그인을 요구한다(KRX_ID/KRX_PW). [[krx-requires-login]]
 *   indTpCd  — 지수 그룹 id (KRX 내부 티커 1번째 자리): '1'=KOSPI계열, '2'=KOSDAQ계열
 *   indTpCd2 — 그룹 내 지수 id (티커 마지막 3자리): '001'=코스피 종합
 *   valueKey — 읽을 값: 'PBR' | 'PER' | 'DVD_YLD' (내부에서 KRX 필드명으로 매핑)
 * 예) KOSPI(티커 1001) PBR → { indTpCd: '1', indTpCd2: '001', valueKey: 'PBR' }
 */
export interface KrxOptions {
  readonly indTpCd: string
  readonly indTpCd2: string
  readonly valueKey: 'PBR' | 'PER' | 'DVD_YLD'
}

/**
 * multpl.com S&P 500 밸류에이션 시계열. FRED/yfinance에는 S&P 500의
 * PER/PBR 시계열이 없어 이 소스로 수집한다(로그인·키 불필요, HTML 표 파싱).
 *   pe — S&P 500 PE Ratio (월간)
 *   pb — S&P 500 Price to Book (분기)
 */
export interface MultplOptions {
  readonly metric: 'pe' | 'pb'
}

/** Manual fetcher keys on indicatorId; no source-specific options. */
export type ManualOptions = Record<string, never>

export interface OptionsBySource {
  fred: FredOptions
  ecos: EcosOptions
  kita: KitaOptions
  kosis: KosisOptions
  yfinance: YFinanceOptions
  stooq: StooqOptions
  krx: KrxOptions
  multpl: MultplOptions
  manual: ManualOptions
}

export type SourceName = keyof OptionsBySource

/**
 * Discriminated union of fetcher specs. Indicator plugins build this:
 *   const fetcher: FetcherSpec = {
 *     source: 'yfinance', options: { ticker: 'DX-Y.NYB' },
 *     fallback: { source: 'fred', options: { series: 'DTWEXBGS' } },
 *   }
 */
export type FetcherSpec = {
  [K in SourceName]: {
    readonly source: K
    readonly options: OptionsBySource[K]
    readonly fallback?: FetcherSpec
  }
}[SourceName]

/**
 * Adapter that converts legacy `sourceId` strings into typed Options.
 * Each fetcher calls this when it receives a string instead of an
 * Options object, so the implementations can branch on Options shape
 * alone.
 */
export function coerceOptions<S extends SourceName>(
  source: S,
  legacy: string,
): OptionsBySource[S] {
  switch (source) {
    case 'yfinance':
      return { ticker: legacy } as OptionsBySource[S]
    case 'fred':
      return { series: legacy } as OptionsBySource[S]
    case 'ecos': {
      const [stat, item] = legacy.split('/')
      return { stat: stat ?? legacy, ...(item ? { item } : {}) } as OptionsBySource[S]
    }
    case 'kosis':
      return { paramKey: legacy as KosisOptions['paramKey'] } as OptionsBySource[S]
    case 'stooq':
      return { symbol: legacy } as OptionsBySource[S]
    case 'krx': {
      // legacy form: "indTpCd/indTpCd2/valueKey" e.g. "1/001/PBR"
      const [indTpCd, indTpCd2, valueKey] = legacy.split('/')
      return {
        indTpCd: indTpCd ?? '1',
        indTpCd2: indTpCd2 ?? '001',
        valueKey: (valueKey ?? 'PBR') as KrxOptions['valueKey'],
      } as OptionsBySource[S]
    }
    case 'kita':
      return { kind: legacy as KitaOptions['kind'] } as OptionsBySource[S]
    case 'multpl':
      return { metric: (legacy === 'pb' ? 'pb' : 'pe') } as OptionsBySource[S]
    case 'manual':
      return {} as OptionsBySource[S]
  }
  // Exhaustiveness — unreachable.
  const _exhaustive: never = source
  return _exhaustive
}
