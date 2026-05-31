/**
 * Inlined schema so the application does not depend on reading
 * schema.sql from the filesystem (Vercel functions have a read-only
 * /var/task and we cannot bundle arbitrary .sql files without extra
 * config).
 */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS timeseries (
    indicator_id TEXT NOT NULL,
    as_of TEXT NOT NULL,
    value REAL NOT NULL,
    source TEXT NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (indicator_id, as_of, source)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ts_indicator_asof ON timeseries(indicator_id, as_of DESC)`,
  `CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('risk','opportunity','conflict')),
    triggered_at TEXT NOT NULL,
    resolved_at TEXT,
    dismissed_at TEXT,
    message TEXT NOT NULL,
    indicators TEXT NOT NULL,
    action_hint TEXT,
    current_value TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_signals_active ON signals(triggered_at DESC) WHERE resolved_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_signals_rule ON signals(rule_id, triggered_at DESC)`,
  `CREATE TABLE IF NOT EXISTS rule_cooldown (
    rule_id TEXT PRIMARY KEY,
    last_triggered_at TEXT NOT NULL,
    last_severity TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rule_state (
    rule_id TEXT PRIMARY KEY,
    consecutive_false INTEGER NOT NULL DEFAULT 0,
    last_evaluated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS regime_history (
    entered_at TEXT NOT NULL PRIMARY KEY,
    regime TEXT NOT NULL CHECK(regime IN ('goldilocks','risk_on','risk_off','stagflation','recession')),
    confidence REAL,
    trigger_summary TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS fetch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    indicator_id TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    success INTEGER NOT NULL CHECK(success IN (0,1)),
    rows_inserted INTEGER DEFAULT 0,
    error TEXT,
    duration_ms INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_fetch_log_recent ON fetch_log(fetched_at DESC)`,
  `CREATE TABLE IF NOT EXISTS manual_overrides (
    indicator_id TEXT NOT NULL,
    as_of TEXT NOT NULL,
    value REAL NOT NULL,
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    note TEXT,
    PRIMARY KEY (indicator_id, as_of)
  )`,
]
