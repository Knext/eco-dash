export type Severity = 'info' | 'warning' | 'critical'
export type SignalCategory = 'recession' | 'inflation' | 'volatility' | 'korea' | 'opportunity'
export type SignalType = 'risk' | 'opportunity' | 'conflict'
export type Regime = 'goldilocks' | 'risk_on' | 'risk_off' | 'stagflation' | 'recession'

export interface SignalRule {
  readonly id: string
  readonly name: string
  readonly severity: Severity
  readonly category: SignalCategory
  readonly type: SignalType
  readonly indicators: readonly string[]
  readonly condition: string
  readonly cooldownHours: number
  readonly rationale: string
  readonly historicalTriggers?: string
  readonly falsePositiveNote?: string
  readonly actionHint: string
}

export interface ActiveSignal {
  readonly id: string
  readonly ruleId: string
  readonly severity: Severity
  readonly category: SignalCategory
  readonly type: SignalType
  readonly triggeredAt: string
  readonly message: string
  readonly indicators: readonly string[]
  readonly actionHint: string
  readonly currentValue?: string
}

export interface RegimeAssessment {
  readonly current: Regime
  readonly enteredAt: string
  readonly previous: Regime | null
  readonly confidence: number
  readonly triggerSummary: string
}
