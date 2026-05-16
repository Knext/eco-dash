import './load-env'
import { getDb, ensureSchema } from '../src/lib/db/client'

async function main() {
  await ensureSchema()
  const db = getDb()
  const r = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  console.log('Tables:')
  for (const row of r.rows) {
    console.log(`  ${(row as Record<string, unknown>).name}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
