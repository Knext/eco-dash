import { getDb } from './client'
import type { TimeSeriesRow, SignalRow, CooldownRow, RegimeRow, FetchLogRow, ReleaseRow, RuleStateRow } from './types'

export function insertTimeseries(rows: Omit<TimeSeriesRow, 'fetched_at'>[]): number {
  if (rows.length === 0) return 0
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO timeseries (indicator_id, as_of, value, source, fetched_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(indicator_id, as_of, source) DO UPDATE SET
      value = excluded.value,
      fetched_at = excluded.fetched_at
  `)
  const tx = db.transaction((items: Omit<TimeSeriesRow, 'fetched_at'>[]) => {
    let n = 0
    for (const r of items) {
      stmt.run(r.indicator_id, r.as_of, r.value, r.source)
      n++
    }
    return n
  })
  return tx(rows)
}

export function getLatestValue(indicatorId: string): TimeSeriesRow | undefined {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM timeseries
    WHERE indicator_id = ?
    ORDER BY as_of DESC
    LIMIT 1
  `).get(indicatorId) as TimeSeriesRow | undefined
}

export function getRecentValues(indicatorId: string, days: number = 90): TimeSeriesRow[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM timeseries
    WHERE indicator_id = ?
      AND as_of >= date('now', '-' || ? || ' days')
    ORDER BY as_of ASC
  `).all(indicatorId, days) as TimeSeriesRow[]
}

export function getAllLatest(indicatorIds: string[]): Map<string, TimeSeriesRow> {
  const db = getDb()
  const map = new Map<string, TimeSeriesRow>()
  const stmt = db.prepare(`
    SELECT t.* FROM timeseries t
    WHERE t.indicator_id = ?
    ORDER BY t.as_of DESC
    LIMIT 1
  `)
  for (const id of indicatorIds) {
    const row = stmt.get(id) as TimeSeriesRow | undefined
    if (row) map.set(id, row)
  }
  return map
}

export function insertSignal(row: Omit<SignalRow, 'resolved_at' | 'dismissed_at'> & { resolved_at?: string | null }): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO signals
      (id, rule_id, severity, category, type, triggered_at, resolved_at, dismissed_at, message, indicators, action_hint, current_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
  `).run(
    row.id, row.rule_id, row.severity, row.category, row.type,
    row.triggered_at, row.resolved_at ?? null, row.message, row.indicators,
    row.action_hint ?? null, row.current_value ?? null,
  )
}

export function resolveSignal(ruleId: string, resolvedAt: string): void {
  const db = getDb()
  db.prepare(`
    UPDATE signals SET resolved_at = ?
    WHERE rule_id = ? AND resolved_at IS NULL AND dismissed_at IS NULL
  `).run(resolvedAt, ruleId)
}

export function getRuleState(ruleId: string): RuleStateRow | undefined {
  const db = getDb()
  return db.prepare(`SELECT * FROM rule_state WHERE rule_id = ?`).get(ruleId) as RuleStateRow | undefined
}

export function bumpFalseStreak(ruleId: string, evaluatedAt: string): number {
  const db = getDb()
  db.prepare(`
    INSERT INTO rule_state (rule_id, consecutive_false, last_evaluated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(rule_id) DO UPDATE SET
      consecutive_false = consecutive_false + 1,
      last_evaluated_at = excluded.last_evaluated_at
  `).run(ruleId, evaluatedAt)
  const row = db.prepare(`SELECT consecutive_false FROM rule_state WHERE rule_id = ?`).get(ruleId) as { consecutive_false: number } | undefined
  return row?.consecutive_false ?? 0
}

export function resetFalseStreak(ruleId: string, evaluatedAt: string): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO rule_state (rule_id, consecutive_false, last_evaluated_at)
    VALUES (?, 0, ?)
    ON CONFLICT(rule_id) DO UPDATE SET
      consecutive_false = 0,
      last_evaluated_at = excluded.last_evaluated_at
  `).run(ruleId, evaluatedAt)
}

export function dismissSignal(signalId: string): void {
  const db = getDb()
  db.prepare(`UPDATE signals SET dismissed_at = datetime('now') WHERE id = ?`).run(signalId)
}

export function getActiveSignals(): SignalRow[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM signals
    WHERE resolved_at IS NULL AND dismissed_at IS NULL
    ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      triggered_at DESC
  `).all() as SignalRow[]
}

export function getRecentSignals(days: number = 30): SignalRow[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM signals
    WHERE triggered_at >= datetime('now', '-' || ? || ' days')
    ORDER BY triggered_at DESC
  `).all(days) as SignalRow[]
}

export function getCooldown(ruleId: string): CooldownRow | undefined {
  const db = getDb()
  return db.prepare(`SELECT * FROM rule_cooldown WHERE rule_id = ?`).get(ruleId) as CooldownRow | undefined
}

export function upsertCooldown(ruleId: string, triggeredAt: string, severity: string): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO rule_cooldown (rule_id, last_triggered_at, last_severity)
    VALUES (?, ?, ?)
    ON CONFLICT(rule_id) DO UPDATE SET
      last_triggered_at = excluded.last_triggered_at,
      last_severity = excluded.last_severity
  `).run(ruleId, triggeredAt, severity)
}

export function getCurrentRegime(): RegimeRow | undefined {
  const db = getDb()
  return db.prepare(`SELECT * FROM regime_history ORDER BY entered_at DESC LIMIT 1`).get() as RegimeRow | undefined
}

export function getPreviousRegime(): RegimeRow | undefined {
  const db = getDb()
  return db.prepare(`SELECT * FROM regime_history ORDER BY entered_at DESC LIMIT 1 OFFSET 1`).get() as RegimeRow | undefined
}

export function insertRegime(row: Omit<RegimeRow, 'confidence' | 'trigger_summary'> & { confidence?: number; trigger_summary?: string }): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO regime_history (entered_at, regime, confidence, trigger_summary)
    VALUES (?, ?, ?, ?)
  `).run(row.entered_at, row.regime, row.confidence ?? null, row.trigger_summary ?? null)
}

export function logFetch(
  source: string,
  indicatorId: string | null,
  success: boolean,
  rowsInserted: number,
  error: string | null,
  durationMs: number,
): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO fetch_log (source, indicator_id, fetched_at, success, rows_inserted, error, duration_ms)
    VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
  `).run(source, indicatorId, success ? 1 : 0, rowsInserted, error, durationMs)
}

export function getRecentFetchLog(limit: number = 50): FetchLogRow[] {
  const db = getDb()
  return db.prepare(`SELECT * FROM fetch_log ORDER BY fetched_at DESC LIMIT ?`).all(limit) as FetchLogRow[]
}

export function getUpcomingReleases(days: number = 7): ReleaseRow[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM release_schedule
    WHERE due_at_kst >= datetime('now')
      AND due_at_kst < datetime('now', '+' || ? || ' days')
    ORDER BY due_at_kst ASC
  `).all(days) as ReleaseRow[]
}

export interface ManualOverrideRow {
  indicator_id: string
  as_of: string
  value: number
  entered_at: string
  note: string | null
}

export function getManualOverrides(indicatorId: string): ManualOverrideRow[] {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM manual_overrides
    WHERE indicator_id = ?
    ORDER BY as_of ASC
  `).all(indicatorId) as ManualOverrideRow[]
}

export function upsertManualOverride(row: Omit<ManualOverrideRow, 'entered_at'>): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO manual_overrides (indicator_id, as_of, value, entered_at, note)
    VALUES (?, ?, ?, datetime('now'), ?)
    ON CONFLICT(indicator_id, as_of) DO UPDATE SET
      value = excluded.value,
      entered_at = excluded.entered_at,
      note = excluded.note
  `).run(row.indicator_id, row.as_of, row.value, row.note)
}

export function deleteManualOverride(indicatorId: string, asOf: string): void {
  const db = getDb()
  db.prepare(`DELETE FROM manual_overrides WHERE indicator_id = ? AND as_of = ?`).run(indicatorId, asOf)
}

export function upsertRelease(row: ReleaseRow): void {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO release_schedule (id, event_name, country, due_at_et, due_at_kst, importance)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(row.id, row.event_name, row.country, row.due_at_et, row.due_at_kst, row.importance)
}
