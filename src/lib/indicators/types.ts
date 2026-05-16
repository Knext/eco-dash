export type Category =
  | 'volatility'
  | 'inflation'
  | 'rates'
  | 'credit'
  | 'korea'
  | 'fx'
  | 'commodity'

export type SourceType = 'fred' | 'ecos' | 'kita' | 'yfinance' | 'stooq' | 'manual'

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
