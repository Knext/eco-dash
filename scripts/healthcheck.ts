import './load-env'
import { env, hasFred, hasEcos } from '../src/lib/env'
import { getDb } from '../src/lib/db/client'
import { getRecentFetchLog } from '../src/lib/db/queries'

function checkApiKeys() {
  console.log('\n=== API Keys ===')
  console.log(`FRED_API_KEY: ${hasFred ? '✓ set' : '✗ missing'}`)
  console.log(`ECOS_API_KEY: ${hasEcos ? '✓ set' : '✗ missing'}`)
}

function checkDb() {
  console.log('\n=== Database ===')
  try {
    const db = getDb()
    const r = db.prepare(`SELECT COUNT(*) AS c FROM timeseries`).get() as { c: number }
    console.log(`✓ SQLite open at ${env.DB_PATH}`)
    console.log(`  timeseries rows: ${r.c}`)

    const recent = getRecentFetchLog(20)
    const failed = recent.filter((r) => r.success === 0)
    console.log(`  recent fetch_log (last 20): ${recent.length - failed.length} ok, ${failed.length} failed`)
    if (failed.length > 0) {
      console.log('  recent failures:')
      for (const f of failed.slice(0, 5)) {
        console.log(`    - ${f.source}/${f.indicator_id}: ${f.error}`)
      }
    }
  } catch (e) {
    console.log(`✗ DB error: ${(e as Error).message}`)
  }
}

function checkEnv() {
  console.log('\n=== Env ===')
  console.log(`DB_PATH: ${env.DB_PATH}`)
  console.log(`TZ: ${env.TZ}`)
  console.log(`CRON_SECRET: ${env.CRON_SECRET === 'change-me-please-32-chars-minimum' ? '✗ default (insecure)' : '✓ custom'}`)
}

checkApiKeys()
checkDb()
checkEnv()
