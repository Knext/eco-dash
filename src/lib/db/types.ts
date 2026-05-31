export interface TimeSeriesRow {
  indicator_id: string
  as_of: string
  value: number
  source: string
  fetched_at: string
}

export interface SignalRow {
  id: string
  rule_id: string
  severity: 'info' | 'warning' | 'critical'
  category: string
  type: 'risk' | 'opportunity' | 'conflict'
  triggered_at: string
  resolved_at: string | null
  dismissed_at: string | null
  message: string
  indicators: string
  action_hint: string | null
  current_value: string | null
}

export interface CooldownRow {
  rule_id: string
  last_triggered_at: string
  last_severity: string
}

export interface RuleStateRow {
  rule_id: string
  consecutive_false: number
  last_evaluated_at: string | null
}

export interface RegimeRow {
  entered_at: string
  regime: 'goldilocks' | 'risk_on' | 'risk_off' | 'stagflation' | 'recession'
  confidence: number | null
  trigger_summary: string | null
}

export interface FetchLogRow {
  id: number
  source: string
  indicator_id: string | null
  fetched_at: string
  success: 0 | 1
  rows_inserted: number
  error: string | null
  duration_ms: number | null
}
