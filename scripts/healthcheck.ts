import './load-env'
import { env, hasFred, hasEcos } from '../src/lib/env'
import { getDb, ensureSchema } from '../src/lib/db/client'
import { getRecentFetchLog } from '../src/lib/db/queries'

function checkApiKeys() {
  console.log('\n=== API Keys ===')
  console.log(`FRED_API_KEY: ${hasFred ? 'set' : 'missing'}`)
  console.log(`ECOS_API_KEY: ${hasEcos ? 'set' : 'missing'}`)
}

async function checkDb() {
  console.log('\n=== Database ===')
  try {
    await ensureSchema()
    const db = getDb()
    const r = await db.execute(`SELECT COUNT(*) AS c FROM timeseries`)
    const count = r.rows[0]?.c ?? 0
    const target = env.TURSO_DATABASE_URL ?? `file:${env.DB_PATH}`
    console.log(`open at ${target}`)
    console.log(`  timeseries rows: ${count}`)

    const recent = await getRecentFetchLog(20)
    const failed = recent.filter((row) => row.success === 0)
    console.log(`  recent fetch_log (last 20): ${recent.length - failed.length} ok, ${failed.length} failed`)
    if (failed.length > 0) {
      console.log('  recent failures:')
      for (const f of failed.slice(0, 5)) {
        console.log(`    - ${f.source}/${f.indicator_id ?? ''}: ${f.error ?? ''}`)
      }
    }
  } catch (e) {
    console.log(`DB error: ${(e as Error).message}`)
  }
}

function checkEnv() {
  console.log('\n=== Env ===')
  console.log(`DB_PATH: ${env.DB_PATH}`)
  console.log(`TURSO_DATABASE_URL: ${env.TURSO_DATABASE_URL ?? '(none — using local)'}`)
  console.log(`TZ: ${env.TZ}`)
}

async function main() {
  checkApiKeys()
  await checkDb()
  checkEnv()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
