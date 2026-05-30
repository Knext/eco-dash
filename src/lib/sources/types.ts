import type { OptionsBySource, SourceName } from './options'

export interface FetchResult {
  indicatorId: string
  source: string
  rows: Array<{ asOf: string; value: number }>
  success: boolean
  error?: string
  durationMs: number
}

/**
 * A fetcher accepts either typed Options (preferred — used by indicator
 * plugins with a `FetcherSpec`) or a legacy `sourceId` string (used by
 * IndicatorDefs that haven't migrated yet). Each implementation calls
 * `coerceOptions` from ./options.ts to normalize.
 */
export interface SourceFetcher<S extends SourceName = SourceName> {
  readonly name: S
  fetch(
    indicatorId: string,
    optionsOrSourceId: OptionsBySource[S] | string,
    startDate?: string,
  ): Promise<FetchResult>
}
