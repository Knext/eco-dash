import { createClient, type Client } from '@libsql/client'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from '../env'
import { SCHEMA_STATEMENTS } from './schema'

let _client: Client | null = null
let _schemaApplied = false

/**
 * Lazily build a single libsql client. Uses Turso when TURSO_DATABASE_URL is
 * set, otherwise opens a local file. The schema is applied once per process.
 */
export function getDb(): Client {
  if (_client) return _client

  if (env.TURSO_DATABASE_URL) {
    _client = createClient({
      url: env.TURSO_DATABASE_URL,
      ...(env.TURSO_AUTH_TOKEN ? { authToken: env.TURSO_AUTH_TOKEN } : {}),
    })
  } else {
    const dbPath = resolve(process.cwd(), env.DB_PATH)
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    _client = createClient({ url: `file:${dbPath}` })
  }

  return _client
}

export async function ensureSchema(): Promise<void> {
  if (_schemaApplied) return
  const db = getDb()
  // One batched round-trip instead of N sequential CREATEs. On a remote
  // (Turso/HTTP) DB this turns ~12 cold-start round-trips into 1, which
  // directly cuts first-request latency. The statements are idempotent
  // (IF NOT EXISTS), so the implicit transaction is safe to re-run.
  await db.batch([...SCHEMA_STATEMENTS], 'write')
  _schemaApplied = true
}

export async function closeDb(): Promise<void> {
  if (_client) {
    _client.close()
    _client = null
    _schemaApplied = false
  }
}
