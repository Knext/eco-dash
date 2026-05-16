import { NextResponse } from 'next/server'
import { getCurrentRegime, getPreviousRegime } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const current = await getCurrentRegime()
  const previous = await getPreviousRegime()
  if (!current) {
    return NextResponse.json({
      current: 'risk_on',
      enteredAt: new Date().toISOString(),
      previous: null,
      triggerSummary: '데이터 없음',
    })
  }
  return NextResponse.json({
    current: current.regime,
    enteredAt: current.entered_at,
    previous: previous?.regime ?? null,
    triggerSummary: current.trigger_summary ?? '',
  })
}
