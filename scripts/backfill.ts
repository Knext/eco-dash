import './load-env'
import { INDICATORS } from '../src/lib/indicators/definitions'
import { fetchAndStore } from '../src/lib/sources'
import { getDb } from '../src/lib/db/client'

const FIVE_YEARS_AGO = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10)

async function main() {
  getDb()
  console.log(`Backfilling ${INDICATORS.length} indicators from ${FIVE_YEARS_AGO}...`)
  let ok = 0
  let fail = 0
  for (const def of INDICATORS) {
    const r = await fetchAndStore(def, FIVE_YEARS_AGO)
    if (r.success) {
      ok++
      console.log(`✓ ${def.id} (${r.source}): ${r.rows.length} rows`)
    } else {
      fail++
      console.log(`✗ ${def.id}: ${r.error}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
  console.log(`\nDone. ${ok} success, ${fail} failed.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
