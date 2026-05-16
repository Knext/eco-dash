import './load-env'
import { ensureSchema } from '../src/lib/db/client'
import { upsertManualOverride, deleteManualOverride, getManualOverrides } from '../src/lib/db/queries'
import { getIndicator, INDICATORS } from '../src/lib/indicators/definitions'

const USAGE = `Usage:
  npm run manual-entry -- <indicator_id> <YYYY-MM-DD> <value> [note]
  npm run manual-entry -- --list <indicator_id>
  npm run manual-entry -- --delete <indicator_id> <YYYY-MM-DD>
  npm run manual-entry -- --help

Indicators with manual fallback:
${INDICATORS.filter((i) => i.fallbackSource === 'manual' || i.source === 'manual')
  .map((i) => `  ${i.id.padEnd(20)} ${i.nameKr} (${i.unit})`)
  .join('\n')}

Examples:
  npm run manual-entry -- KR_EXPORT 2026-04-01 -7.3 "산자부 발표"
  npm run manual-entry -- --list KR_EXPORT
  npm run manual-entry -- --delete KR_EXPORT 2026-04-01
`

async function main() {
  await ensureSchema()
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE)
    process.exit(0)
  }

  if (args[0] === '--list') {
    const id = args[1]
    if (!id) {
      console.error('--list requires <indicator_id>')
      process.exit(1)
    }
    const rows = await getManualOverrides(id)
    if (rows.length === 0) {
      console.log(`(empty) no entries for ${id}`)
      return
    }
    console.log(`${rows.length} entries for ${id}:`)
    for (const r of rows) {
      console.log(`  ${r.as_of}  ${r.value.toFixed(2).padStart(8)}  ${r.note ?? ''}`)
    }
    return
  }

  if (args[0] === '--delete') {
    const [, id, asOf] = args
    if (!id || !asOf) {
      console.error('--delete requires <indicator_id> <YYYY-MM-DD>')
      process.exit(1)
    }
    await deleteManualOverride(id, asOf)
    console.log(`deleted ${id} @ ${asOf}`)
    return
  }

  const [id, asOf, valueStr, ...noteParts] = args
  if (!id || !asOf || !valueStr) {
    console.error('missing arguments\n')
    console.log(USAGE)
    process.exit(1)
  }

  const def = getIndicator(id)
  if (!def) {
    console.error(`unknown indicator: ${id}`)
    console.error(`run with --help to see available indicators`)
    process.exit(1)
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    console.error(`invalid date format: ${asOf} (expected YYYY-MM-DD)`)
    process.exit(1)
  }

  const value = parseFloat(valueStr)
  if (!Number.isFinite(value)) {
    console.error(`invalid value: ${valueStr}`)
    process.exit(1)
  }

  const note = noteParts.length > 0 ? noteParts.join(' ') : null
  await upsertManualOverride({ indicator_id: id, as_of: asOf, value, note })
  console.log(`${id} @ ${asOf} = ${value} ${note ? `(${note})` : ''}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
