import { timingSafeEqual } from 'node:crypto'
import { env } from './env'

export function checkBearer(authHeader: string | null): boolean {
  if (!authHeader) return false
  // Fail-closed when CRON_SECRET is missing (e.g. build-time analysis or a
  // misconfigured deployment), so unauthenticated cron requests are rejected.
  if (!env.CRON_SECRET) return false
  const expected = `Bearer ${env.CRON_SECRET}`
  const a = Buffer.from(authHeader)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function checkOrigin(originHeader: string | null): boolean {
  if (!originHeader) return false
  return originHeader === env.NEXT_PUBLIC_BASE_URL
}
