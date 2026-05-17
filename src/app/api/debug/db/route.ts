import { NextResponse } from 'next/server'
import { getDb, ensureSchema } from '@/lib/db/client'
import { getRecentValues, getLatestValue } from '@/lib/db/queries'
import { checkBearer } from '@/lib/auth'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!checkBearer(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  await ensureSchema()
  const db = getDb()

  // Raw count
  const countRes = await db.execute(`SELECT COUNT(*) AS c FROM timeseries`)
  const total = Number(
    (countRes.rows[0] as unknown as { c: number | bigint } | undefined)?.c ?? 0,
  )

  // Three distinct call paths against the same DB
  const inlineCountRes = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM timeseries WHERE indicator_id = ? AND as_of >= date('now', '-' || ? || ' days')`,
    args: ['VIXCLS', 400],
  })
  const inlineCount = Number(
    (inlineCountRes.rows[0] as unknown as { c: number | bigint } | undefined)?.c ?? 0,
  )

  const helperRows = await getRecentValues('VIXCLS', 400)
  const helperRowCount = helperRows.length
  const helperFirstRow = helperRows[0] ?? null

  const latest = await getLatestValue('VIXCLS')

  // Distinct indicator_ids
  const distinctRes = await db.execute(
    `SELECT indicator_id, COUNT(*) AS c FROM timeseries GROUP BY indicator_id ORDER BY indicator_id`,
  )
  const perIndicator = distinctRes.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>
    return { id: row.indicator_id, count: Number(row.c) }
  })

  return NextResponse.json({
    total,
    inlineCount,
    helperRowCount,
    helperFirstRow,
    latest,
    perIndicator,
    envDebug: {
      tursoUrlPresent: !!env.TURSO_DATABASE_URL,
      tursoUrlPrefix: env.TURSO_DATABASE_URL?.slice(0, 40) ?? null,
      tursoTokenLength: env.TURSO_AUTH_TOKEN?.length ?? 0,
      dbPath: env.DB_PATH,
    },
  })
}
