import { NextResponse } from 'next/server'
import { INDICATORS } from '@/lib/indicators/definitions'
import { fetchAndStore } from '@/lib/sources'
import { checkBearer } from '@/lib/auth'
import { getDb, ensureSchema } from '@/lib/db/client'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handler(req: Request) {
  if (!checkBearer(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return await runFetch()
}

export async function POST(req: Request) {
  return handler(req)
}

export async function GET(req: Request) {
  return handler(req)
}

async function runFetch() {
  // Pull a 5-year window so FRED does not return decades of history on every
  // cron call (large responses sometimes return 400 under burst conditions).
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  // Serial execution times out on Vercel Hobby (60s). Run 3 workers in
  // parallel — FRED has been observed to return HTTP 400 for some series
  // when 5+ concurrent requests hit it from Vercel data centers, so we
  // stay conservative.
  const CONCURRENCY = 3
  const queue = [...INDICATORS]
  const results: Array<{ id: string; success: boolean; rows: number; error?: string }> = []

  async function worker() {
    while (queue.length > 0) {
      const def = queue.shift()
      if (!def) break
      try {
        const r = await fetchAndStore(def, fiveYearsAgo)
        results.push({
          id: def.id,
          success: r.success,
          rows: r.rows.length,
          ...(r.error ? { error: r.error } : {}),
        })
      } catch (e: unknown) {
        results.push({
          id: def.id,
          success: false,
          rows: 0,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  // Diagnostic: verify rows actually landed and inspect their shape.
  await ensureSchema()
  const db = getDb()
  const countRes = await db.execute(`SELECT COUNT(*) AS c FROM timeseries`)
  const dbRowCount = Number(
    (countRes.rows[0] as unknown as { c: number | bigint } | undefined)?.c ?? 0,
  )

  const sampleRes = await db.execute(
    `SELECT indicator_id, as_of, value, source FROM timeseries ORDER BY as_of DESC LIMIT 5`,
  )
  const sample = sampleRes.rows.map((r) => {
    const row = r as unknown as Record<string, unknown>
    return {
      indicator_id: row.indicator_id,
      as_of: row.as_of,
      value: row.value,
      source: row.source,
    }
  })

  // Try the exact same query getRecentValues uses, for VIXCLS specifically.
  const vixRes = await db.execute({
    sql: `SELECT COUNT(*) AS c FROM timeseries
          WHERE indicator_id = ?
            AND as_of >= date('now', '-' || ? || ' days')`,
    args: ['VIXCLS', 400],
  })
  const vixCount = Number(
    (vixRes.rows[0] as unknown as { c: number | bigint } | undefined)?.c ?? 0,
  )

  return NextResponse.json({
    dbRowCount,
    sample,
    vixCount,
    envDebug: {
      tursoUrlPresent: !!env.TURSO_DATABASE_URL,
      tursoUrlPrefix: env.TURSO_DATABASE_URL?.slice(0, 40) ?? null,
      tursoTokenLength: env.TURSO_AUTH_TOKEN?.length ?? 0,
      dbPath: env.DB_PATH,
    },
    ts: new Date().toISOString(),
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}
