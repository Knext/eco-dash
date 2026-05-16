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
  for (const def of INDICATORS) {
    try {
      const r = await fetchAndStore(def)
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
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  return NextResponse.json({
    ts: new Date().toISOString(),
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}
