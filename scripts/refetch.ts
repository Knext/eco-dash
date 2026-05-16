import './load-env'
import { INDICATORS } from '../src/lib/indicators/definitions'
import { fetchAndStore } from '../src/lib/sources'
import { getDb } from '../src/lib/db/client'

const ids = process.argv.slice(2)
if (ids.length === 0) {
  console.error('Usage: tsx scripts/refetch.ts <indicator_id> [<indicator_id> ...]')
  process.exit(1)
}

async function main() {
  getDb()
  for (const id of ids) {
    const def = INDICATORS.find((i) => i.id === id)
    if (!def) {
      console.log(`? unknown: ${id}`)
      continue
    }
    const r = await fetchAndStore(def)
    if (r.success) console.log(`OK ${id} (${r.source}): ${r.rows.length} rows`)
    else console.log(`FAIL ${id}: ${r.error}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
