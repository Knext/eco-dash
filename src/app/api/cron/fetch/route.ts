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
  const results: Array<{ id: string; success: boolean; rows: number; error?: string }> = []

  // Pull a 5-year window so FRED does not have to serialize the entire series
  // history on every cron call. Without observation_start, FRED returns full
  // history (decades for some series) and rejects large requests with HTTP 400
  // under burst conditions.
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  for (const def of INDICATORS) {
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
    // 400ms × 24 indicators = ~10s of sleep budget, leaves time for HTTP
    // round-trips inside Vercel Hobby's 60s maxDuration. Stays well below
    // FRED 120 req/min even with retries.
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return NextResponse.json({
    ts: new Date().toISOString(),
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}
