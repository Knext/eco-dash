import { getDb, ensureSchema } from './client'
import type {
  TimeSeriesRow,
  SignalRow,
  CooldownRow,
  RegimeRow,
  FetchLogRow,
  ReleaseRow,
  RuleStateRow,
} from './types'

type Row = Record<string, unknown>

function asString(v: unknown): string {
  return v === null || v === undefined ? '' : String(v)
}

function asStringOrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v)
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'string') return parseFloat(v)
  return Number(v)
}

function asInt(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'string') return parseInt(v, 10)
  return Number(v)
}

function rowToTimeseries(r: Row): TimeSeriesRow {
  return {
    indicator_id: asString(r.indicator_id),
    as_of: asString(r.as_of),
    value: asNumber(r.value),
    source: asString(r.source),
    fetched_at: asString(r.fetched_at),
  }
}

function rowToSignal(r: Row): SignalRow {
  return {
    id: asString(r.id),
    rule_id: asString(r.rule_id),
    severity: asString(r.severity) as SignalRow['severity'],
    category: asString(r.category),
    type: asString(r.type) as SignalRow['type'],
    triggered_at: asString(r.triggered_at),
    resolved_at: asStringOrNull(r.resolved_at),
    dismissed_at: asStringOrNull(r.dismissed_at),
    message: asString(r.message),
    indicators: asString(r.indicators),
    action_hint: asStringOrNull(r.action_hint),
    current_value: asStringOrNull(r.current_value),
  }
}

/**
 * Bulk insert using libsql's batch() — sends N statements in a single HTTP
 * round-trip to Turso. Previously we tried multi-row INSERT ... VALUES (...),
 * (...) which is valid SQLite but appeared to silently succeed without
 * persisting rows on Turso (rowsAffected reported correctly only on per-row
 * statements). batch() is the documented Turso path for bulk writes.
 *
 * We chunk because a 5-year daily series is 1,255 rows and Turso's batch
 * size limit is 1,000 statements per HTTP request.
 */
const INSERT_BATCH = 500

export async function insertTimeseries(
  rows: Omit<TimeSeriesRow, 'fetched_at'>[],
): Promise<number> {
  if (rows.length === 0) return 0
  await ensureSchema()
  const db = getDb()
  const sql = `INSERT INTO timeseries (indicator_id, as_of, value, source, fetched_at)
               VALUES (?, ?, ?, ?, datetime('now'))
               ON CONFLICT(indicator_id, as_of, source) DO UPDATE SET
                 value = excluded.value,
                 fetched_at = excluded.fetched_at`
  let total = 0
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const slice = rows.slice(i, i + INSERT_BATCH)
    const stmts = slice.map((r) => ({
      sql,
      args: [r.indicator_id, r.as_of, r.value, r.source] as [string, string, number, string],
    }))
    const results = await db.batch(stmts, 'write')
    for (const r of results) {
      total += Number(r.rowsAffected ?? 0)
    }
  }
  return total
}

export async function getLatestValue(indicatorId: string): Promise<TimeSeriesRow | undefined> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM timeseries WHERE indicator_id = ? ORDER BY as_of DESC LIMIT 1`,
    args: [indicatorId],
  })
  const first = res.rows[0]
  return first ? rowToTimeseries(first as Row) : undefined
}

export async function getRecentValues(
  indicatorId: string,
  days: number = 90,
): Promise<TimeSeriesRow[]> {
  await ensureSchema()
  const db = getDb()
  // The PK is (indicator_id, as_of, source). When an indicator's primary
  // source has been swapped (e.g. DXY FRED → yfinance), the legacy series'
  // rows linger forever and have a different numeric scale. We MUST NOT
  // mix scales in one sparkline, so we lock the displayed history to a
  // single source: whichever produced the most recent row. Done as two
  // statements rather than a correlated subquery — the latter previously
  // returned 0 rows for some indicators under libsql, root cause never
  // isolated, and getRecentValues is hot enough that "two small queries"
  // is acceptable.
  const latest = await db.execute({
    sql: `SELECT source FROM timeseries
          WHERE indicator_id = ?
          ORDER BY as_of DESC, fetched_at DESC
          LIMIT 1`,
    args: [indicatorId],
  })
  const latestRow = latest.rows[0] as Row | undefined
  if (!latestRow) return []
  const source = asString(latestRow.source)
  if (!source) return []
  const res = await db.execute({
    sql: `SELECT * FROM timeseries
          WHERE indicator_id = ?
            AND source = ?
            AND as_of >= date('now', '-' || ? || ' days')
          ORDER BY as_of ASC`,
    args: [indicatorId, source, days],
  })
  return res.rows.map((r) => rowToTimeseries(r as Row))
}

/**
 * Batched latest-row lookup for the dashboard list view. Returns the most
 * recent row per indicator (absolute, ignoring any window) in a SINGLE
 * query, replacing N separate `getLatestValue` round-trips. Stale
 * indicators still resolve so the UI can show their last asOf/source.
 */
export async function getLatestValuesBatch(
  indicatorIds: readonly string[],
): Promise<Map<string, TimeSeriesRow>> {
  const out = new Map<string, TimeSeriesRow>()
  if (indicatorIds.length === 0) return out
  await ensureSchema()
  const db = getDb()
  const placeholders = indicatorIds.map(() => '?').join(', ')
  const res = await db.execute({
    sql: `SELECT indicator_id, as_of, value, source, fetched_at FROM (
            SELECT *, ROW_NUMBER() OVER (
                     PARTITION BY indicator_id
                     ORDER BY as_of DESC, fetched_at DESC
                   ) AS rn
            FROM timeseries
            WHERE indicator_id IN (${placeholders})
          ) WHERE rn = 1`,
    args: [...indicatorIds],
  })
  for (const r of res.rows) {
    const row = rowToTimeseries(r as Row)
    out.set(row.indicator_id, row)
  }
  return out
}

/**
 * Batched recent-history lookup for the dashboard list view. For each id,
 * returns rows within the window locked to the indicator's latest source
 * (same scale-mixing guard as `getRecentValues`), grouped by id and sorted
 * ascending — all in a SINGLE query instead of 2×N round-trips.
 */
export async function getRecentValuesBatch(
  indicatorIds: readonly string[],
  days: number,
): Promise<Map<string, TimeSeriesRow[]>> {
  const out = new Map<string, TimeSeriesRow[]>()
  if (indicatorIds.length === 0) return out
  await ensureSchema()
  const db = getDb()
  const placeholders = indicatorIds.map(() => '?').join(', ')
  // CTE `latest` resolves each indicator's most recent source; the join
  // then keeps only rows from that source within the window.
  const res = await db.execute({
    sql: `WITH latest AS (
            SELECT indicator_id, source FROM (
              SELECT indicator_id, source, ROW_NUMBER() OVER (
                       PARTITION BY indicator_id
                       ORDER BY as_of DESC, fetched_at DESC
                     ) AS rn
              FROM timeseries
              WHERE indicator_id IN (${placeholders})
            ) WHERE rn = 1
          )
          SELECT t.indicator_id, t.as_of, t.value, t.source, t.fetched_at
          FROM timeseries t
          JOIN latest l
            ON t.indicator_id = l.indicator_id AND t.source = l.source
          WHERE t.as_of >= date('now', '-' || ? || ' days')
          ORDER BY t.indicator_id ASC, t.as_of ASC`,
    args: [...indicatorIds, days],
  })
  for (const r of res.rows) {
    const row = rowToTimeseries(r as Row)
    const arr = out.get(row.indicator_id)
    if (arr) arr.push(row)
    else out.set(row.indicator_id, [row])
  }
  return out
}

export async function insertSignal(
  row: Omit<SignalRow, 'resolved_at' | 'dismissed_at'> & { resolved_at?: string | null },
): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT OR REPLACE INTO signals
      (id, rule_id, severity, category, type, triggered_at, resolved_at, dismissed_at, message, indicators, action_hint, current_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    args: [
      row.id,
      row.rule_id,
      row.severity,
      row.category,
      row.type,
      row.triggered_at,
      row.resolved_at ?? null,
      row.message,
      row.indicators,
      row.action_hint ?? null,
      row.current_value ?? null,
    ],
  })
}

export async function resolveSignal(ruleId: string, resolvedAt: string): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `UPDATE signals SET resolved_at = ?
          WHERE rule_id = ? AND resolved_at IS NULL AND dismissed_at IS NULL`,
    args: [resolvedAt, ruleId],
  })
}

export async function dismissSignal(signalId: string): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `UPDATE signals SET dismissed_at = datetime('now') WHERE id = ?`,
    args: [signalId],
  })
}

export async function getActiveSignals(): Promise<SignalRow[]> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute(
    `SELECT * FROM signals
     WHERE resolved_at IS NULL AND dismissed_at IS NULL
     ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       triggered_at DESC`,
  )
  return res.rows.map((r) => rowToSignal(r as Row))
}

export async function getRecentSignals(days: number = 30): Promise<SignalRow[]> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM signals
          WHERE triggered_at >= datetime('now', '-' || ? || ' days')
          ORDER BY triggered_at DESC`,
    args: [days],
  })
  return res.rows.map((r) => rowToSignal(r as Row))
}

export async function getCooldown(ruleId: string): Promise<CooldownRow | undefined> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM rule_cooldown WHERE rule_id = ?`,
    args: [ruleId],
  })
  const r = res.rows[0]
  if (!r) return undefined
  const row = r as Row
  return {
    rule_id: asString(row.rule_id),
    last_triggered_at: asString(row.last_triggered_at),
    last_severity: asString(row.last_severity),
  }
}

export async function upsertCooldown(
  ruleId: string,
  triggeredAt: string,
  severity: string,
): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO rule_cooldown (rule_id, last_triggered_at, last_severity)
          VALUES (?, ?, ?)
          ON CONFLICT(rule_id) DO UPDATE SET
            last_triggered_at = excluded.last_triggered_at,
            last_severity = excluded.last_severity`,
    args: [ruleId, triggeredAt, severity],
  })
}

export async function getRuleState(ruleId: string): Promise<RuleStateRow | undefined> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM rule_state WHERE rule_id = ?`,
    args: [ruleId],
  })
  const r = res.rows[0]
  if (!r) return undefined
  const row = r as Row
  return {
    rule_id: asString(row.rule_id),
    consecutive_false: asInt(row.consecutive_false),
    last_evaluated_at: asStringOrNull(row.last_evaluated_at),
  }
}

export async function bumpFalseStreak(ruleId: string, evaluatedAt: string): Promise<number> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO rule_state (rule_id, consecutive_false, last_evaluated_at)
          VALUES (?, 1, ?)
          ON CONFLICT(rule_id) DO UPDATE SET
            consecutive_false = consecutive_false + 1,
            last_evaluated_at = excluded.last_evaluated_at`,
    args: [ruleId, evaluatedAt],
  })
  const r = await db.execute({
    sql: `SELECT consecutive_false FROM rule_state WHERE rule_id = ?`,
    args: [ruleId],
  })
  const row = r.rows[0]
  return row ? asInt((row as Row).consecutive_false) : 0
}

export async function resetFalseStreak(ruleId: string, evaluatedAt: string): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO rule_state (rule_id, consecutive_false, last_evaluated_at)
          VALUES (?, 0, ?)
          ON CONFLICT(rule_id) DO UPDATE SET
            consecutive_false = 0,
            last_evaluated_at = excluded.last_evaluated_at`,
    args: [ruleId, evaluatedAt],
  })
}

export async function getCurrentRegime(): Promise<RegimeRow | undefined> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute(
    `SELECT * FROM regime_history ORDER BY entered_at DESC LIMIT 1`,
  )
  const r = res.rows[0]
  if (!r) return undefined
  const row = r as Row
  return {
    entered_at: asString(row.entered_at),
    regime: asString(row.regime) as RegimeRow['regime'],
    confidence: row.confidence !== null && row.confidence !== undefined ? asNumber(row.confidence) : null,
    trigger_summary: asStringOrNull(row.trigger_summary),
  }
}

export async function getPreviousRegime(): Promise<RegimeRow | undefined> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute(
    `SELECT * FROM regime_history ORDER BY entered_at DESC LIMIT 1 OFFSET 1`,
  )
  const r = res.rows[0]
  if (!r) return undefined
  const row = r as Row
  return {
    entered_at: asString(row.entered_at),
    regime: asString(row.regime) as RegimeRow['regime'],
    confidence: row.confidence !== null && row.confidence !== undefined ? asNumber(row.confidence) : null,
    trigger_summary: asStringOrNull(row.trigger_summary),
  }
}

export async function insertRegime(row: {
  entered_at: string
  regime: RegimeRow['regime']
  confidence?: number
  trigger_summary?: string
}): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT OR REPLACE INTO regime_history (entered_at, regime, confidence, trigger_summary)
          VALUES (?, ?, ?, ?)`,
    args: [row.entered_at, row.regime, row.confidence ?? null, row.trigger_summary ?? null],
  })
}

export async function logFetch(
  source: string,
  indicatorId: string | null,
  success: boolean,
  rowsInserted: number,
  error: string | null,
  durationMs: number,
): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO fetch_log (source, indicator_id, fetched_at, success, rows_inserted, error, duration_ms)
          VALUES (?, ?, datetime('now'), ?, ?, ?, ?)`,
    args: [source, indicatorId, success ? 1 : 0, rowsInserted, error, durationMs],
  })
}

export async function getRecentFetchLog(limit: number = 50): Promise<FetchLogRow[]> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM fetch_log ORDER BY fetched_at DESC LIMIT ?`,
    args: [limit],
  })
  return res.rows.map((r) => {
    const row = r as Row
    return {
      id: asInt(row.id),
      source: asString(row.source),
      indicator_id: asStringOrNull(row.indicator_id),
      fetched_at: asString(row.fetched_at),
      success: asInt(row.success) as 0 | 1,
      rows_inserted: asInt(row.rows_inserted),
      error: asStringOrNull(row.error),
      duration_ms: row.duration_ms !== null && row.duration_ms !== undefined ? asInt(row.duration_ms) : null,
    }
  })
}

export async function getUpcomingReleases(days: number = 7): Promise<ReleaseRow[]> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM release_schedule
          WHERE due_at_kst >= datetime('now')
            AND due_at_kst < datetime('now', '+' || ? || ' days')
          ORDER BY due_at_kst ASC`,
    args: [days],
  })
  return res.rows.map((r) => {
    const row = r as Row
    return {
      id: asString(row.id),
      event_name: asString(row.event_name),
      country: asString(row.country),
      due_at_et: asString(row.due_at_et),
      due_at_kst: asString(row.due_at_kst),
      importance: asInt(row.importance) as 1 | 2 | 3,
    }
  })
}

export async function upsertRelease(row: ReleaseRow): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT OR REPLACE INTO release_schedule (id, event_name, country, due_at_et, due_at_kst, importance)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [row.id, row.event_name, row.country, row.due_at_et, row.due_at_kst, row.importance],
  })
}

export interface ManualOverrideRow {
  indicator_id: string
  as_of: string
  value: number
  entered_at: string
  note: string | null
}

export async function getManualOverrides(indicatorId: string): Promise<ManualOverrideRow[]> {
  await ensureSchema()
  const db = getDb()
  const res = await db.execute({
    sql: `SELECT * FROM manual_overrides WHERE indicator_id = ? ORDER BY as_of ASC`,
    args: [indicatorId],
  })
  return res.rows.map((r) => {
    const row = r as Row
    return {
      indicator_id: asString(row.indicator_id),
      as_of: asString(row.as_of),
      value: asNumber(row.value),
      entered_at: asString(row.entered_at),
      note: asStringOrNull(row.note),
    }
  })
}

export async function upsertManualOverride(
  row: Omit<ManualOverrideRow, 'entered_at'>,
): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO manual_overrides (indicator_id, as_of, value, entered_at, note)
          VALUES (?, ?, ?, datetime('now'), ?)
          ON CONFLICT(indicator_id, as_of) DO UPDATE SET
            value = excluded.value,
            entered_at = excluded.entered_at,
            note = excluded.note`,
    args: [row.indicator_id, row.as_of, row.value, row.note],
  })
}

export async function deleteManualOverride(indicatorId: string, asOf: string): Promise<void> {
  await ensureSchema()
  const db = getDb()
  await db.execute({
    sql: `DELETE FROM manual_overrides WHERE indicator_id = ? AND as_of = ?`,
    args: [indicatorId, asOf],
  })
}
