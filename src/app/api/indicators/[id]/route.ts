import { NextResponse } from 'next/server'
import { getIndicator } from '@/lib/indicators/registry'
import { getRecentValues } from '@/lib/db/queries'
import { toPoints, yoy } from '@/lib/indicators/normalize'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const def = getIndicator(params.id)
  if (!def) return NextResponse.json({ error: 'Unknown indicator' }, { status: 404 })
  const rows = await getRecentValues(def.id, 800)
  const points = toPoints(rows)
  const transformed = def.transform === 'yoy' ? yoy(points) : points
  return NextResponse.json({
    indicator: {
      id: def.id,
      name: def.name,
      nameKr: def.nameKr,
      category: def.category,
      unit: def.unit,
      precision: def.precision,
      description: def.description ?? null,
      thresholds: def.thresholds,
      releaseTimeET: def.releaseTimeET ?? null,
    },
    history: transformed,
  })
}
