import { NextResponse } from 'next/server'
import { z } from 'zod'
import { dismissSignal, getActiveSignals, getRecentSignals } from '@/lib/db/queries'
import { checkOrigin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DaysSchema = z.coerce.number().int().min(1).max(365).default(30)
const ModeSchema = z.enum(['active', 'history']).default('active')
const DismissSchema = z.object({
  id: z.string().min(1).max(200).regex(/^[\w.:-]+$/, 'invalid id format'),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = ModeSchema.parse(url.searchParams.get('mode') ?? undefined)
  const days = DaysSchema.parse(url.searchParams.get('days') ?? undefined)

  const rows = mode === 'history' ? await getRecentSignals(days) : await getActiveSignals()
  const signals = rows.map((r) => {
    let indicators: string[] = []
    try {
      const parsed = JSON.parse(r.indicators)
      if (Array.isArray(parsed)) indicators = parsed.filter((v): v is string => typeof v === 'string')
    } catch {
      indicators = []
    }
    return {
      id: r.id,
      ruleId: r.rule_id,
      severity: r.severity,
      category: r.category,
      type: r.type,
      triggeredAt: r.triggered_at,
      resolvedAt: r.resolved_at,
      message: r.message,
      indicators,
      actionHint: r.action_hint ?? '',
      currentValue: r.current_value ?? undefined,
    }
  })
  return NextResponse.json({ signals })
}

export async function POST(req: Request) {
  if (!checkOrigin(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'bad origin' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const parsed = DismissSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  await dismissSignal(parsed.data.id)
  return NextResponse.json({ ok: true })
}
