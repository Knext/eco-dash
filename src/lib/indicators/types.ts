export type Category =
  | 'volatility'
  | 'inflation'
  | 'rates'
  | 'credit'
  | 'korea'
  | 'fx'
  | 'commodity'
  | 'equity'

export type SourceType = 'fred' | 'ecos' | 'kita' | 'kosis' | 'yfinance' | 'stooq' | 'manual'

export type Cadence = 'daily' | 'weekly' | 'monthly'

export type Unit = 'index' | 'pct' | 'bp' | 'usd' | 'krw' | 'ratio' | 'kbusd'

export type Direction = 'above' | 'below'

export interface ThresholdConfig {
  readonly normal: readonly [number, number]
  readonly watch: readonly [number, number]
  readonly alert: readonly [number, number]
  readonly direction: Direction
}

export interface IndicatorDef {
  readonly id: string
  readonly name: string
  readonly nameKr: string
  readonly category: Category
  readonly source: SourceType
  readonly sourceId: string
  readonly fallbackSource?: SourceType
  readonly fallbackSourceId?: string
  readonly unit: Unit
  readonly precision: number
  readonly thresholds: ThresholdConfig
  readonly inverted?: boolean
  readonly updateCadence: Cadence
  readonly releaseTimeET?: string
  readonly transform?: 'yoy' | 'mom' | 'pct_below_200dma' | 'spread_calc'
  readonly description?: string
  readonly mainView?: boolean
  /** When true, the indicator is fetched for signal evaluation but not rendered. */
  readonly hidden?: boolean
}

export type IndicatorStatus = 'normal' | 'watch' | 'alert' | 'stale'

export interface IndicatorValue {
  readonly id: string
  readonly value: number
  readonly previousValue: number | null
  readonly changeAbs: number | null
  readonly changePct: number | null
  readonly asOf: string
  readonly source: string
  readonly status: IndicatorStatus
  readonly stale: boolean
}

/**
 * Plugin architecture (introduced incrementally in 5 phases — see
 * docs or commit log for the roadmap). An IndicatorPlugin bundles up to
 * three orthogonal pieces — fetcher, card renderer, detail renderer —
 * around a base IndicatorDef. Each piece is optional; absent ones fall
 * back to the framework defaults.
 *
 * Phase 1 introduces only the contracts and a registry adapter; the
 * fetcher/card/detail fields remain unused at runtime until later
 * phases wire them up. Existing IndicatorDef.source/sourceId still
 * drive data collection.
 */

// Re-exported here so source modules can avoid a circular dep via
// pulling the existing FetchResult type — but the actual contract
// lives in src/lib/sources/types.ts and we keep that as the source
// of truth.
export type FetcherSourceName =
  | 'fred'
  | 'ecos'
  | 'kita'
  | 'kosis'
  | 'yfinance'
  | 'stooq'
  | 'manual'

/**
 * Typed fetcher specification. The `options` shape is per-source —
 * Phase 2 will define `YFinanceOptions`, `EcosOptions`, etc. and
 * narrow this. For now `unknown` keeps the contract present without
 * forcing any caller to commit.
 */
export interface FetcherSpec<O = unknown> {
  readonly source: FetcherSourceName
  readonly options: O
  readonly fallback?: FetcherSpec
}

/** Card renderer plugin. */
export interface CardPlugin {
  readonly render: (props: unknown) => unknown
  /** IDs of additional indicators needed to render the card. */
  readonly dependsOn?: readonly string[]
}

/** Detail-page chart renderer plugin. */
export interface DetailPlugin {
  readonly render: (props: unknown) => unknown
  /** IDs of additional indicators needed to render the detail view. */
  readonly dependsOn?: readonly string[]
}

/**
 * Bundle that lives alongside an indicator. All three plugins are
 * optional; the framework falls back to defaults when absent.
 */
export interface IndicatorPlugin {
  readonly def: IndicatorDef
  readonly fetcher?: FetcherSpec
  readonly card?: CardPlugin
  readonly detail?: DetailPlugin
}
