import { NextResponse } from 'next/server'
import { buildContext, evaluateAll } from '@/lib/signals/evaluator'
import { classifyRegime } from '@/lib/signals/regime'
import { checkBearer } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function handler(req: Request) {
  if (!checkBearer(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const ctx = await buildContext()
  const signals = await evaluateAll(ctx)
  const regime = await classifyRegime(ctx)
  return NextResponse.json({
    ts: new Date().toISOString(),
    firedSignals: signals.length,
    signals,
    regime,
  })
}

export async function POST(req: Request) {
  return handler(req)
}

export async function GET(req: Request) {
  return handler(req)
}
