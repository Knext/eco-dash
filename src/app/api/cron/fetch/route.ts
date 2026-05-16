import { NextResponse } from 'next/server'
import { INDICATORS } from '@/lib/indicators/definitions'
import { fetchAndStore } from '@/lib/sources'
import { checkBearer } from '@/lib/auth'

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

  // Serial execution times out on Vercel Hobby (60s maxDuration) because
  // 24 indicators × ~2s per request exceeds the budget. Run 5 fetchers in
  // parallel — well within FRED's 120 req/min and yfinance's tolerance —
  // and the whole batch finishes in ~10s.
  const CONCURRENCY = 5
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
  return NextResponse.json({
    ts: new Date().toISOString(),
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}
