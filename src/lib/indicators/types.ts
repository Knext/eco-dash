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

// The typed FetcherSpec lives in `src/lib/sources/options.ts` (next to
// the per-source Option shapes). Re-exported here so plugin authors
// only import from `@/lib/indicators/types`.
import type { FetcherSpec as _FetcherSpec } from '../sources/options'
export type { FetcherSpec, SourceName } from '../sources/options'

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
  readonly fetcher?: _FetcherSpec
  readonly card?: CardPlugin
  readonly detail?: DetailPlugin
}
