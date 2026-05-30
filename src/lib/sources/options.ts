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

/** Manual fetcher keys on indicatorId; no source-specific options. */
export type ManualOptions = Record<string, never>

export interface OptionsBySource {
  fred: FredOptions
  ecos: EcosOptions
  kita: KitaOptions
  kosis: KosisOptions
  yfinance: YFinanceOptions
  stooq: StooqOptions
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
    case 'kita':
      return { kind: legacy as KitaOptions['kind'] } as OptionsBySource[S]
    case 'manual':
      return {} as OptionsBySource[S]
  }
  // Exhaustiveness — unreachable.
  const _exhaustive: never = source
  return _exhaustive
}
