import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUpcomingReleases } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

const DaysSchema = z.coerce.number().int().min(1).max(90).default(7)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const days = DaysSchema.parse(url.searchParams.get('days') ?? undefined)
  const rows = await getUpcomingReleases(days)
  return NextResponse.json({ releases: rows })
}
