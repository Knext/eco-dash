import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const KST_TZ = 'Asia/Seoul'
export const ET_TZ = 'America/New_York'

export function nowKstIso(): string {
  return new Date().toISOString()
}

export function toKst(dt: Date | string): Date {
  return toZonedTime(typeof dt === 'string' ? new Date(dt) : dt, KST_TZ)
}

export function toEt(dt: Date | string): Date {
  return toZonedTime(typeof dt === 'string' ? new Date(dt) : dt, ET_TZ)
}

export function formatKst(dt: Date | string, fmt: string = 'yyyy-MM-dd HH:mm'): string {
  return format(toKst(dt), fmt)
}

export function formatEt(dt: Date | string, fmt: string = 'yyyy-MM-dd HH:mm'): string {
  return format(toEt(dt), fmt)
}

export function formatKstEt(dt: Date | string): string {
  return `${formatKst(dt, 'HH:mm')} KST / ${formatEt(dt, 'HH:mm')} ET`
}

export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}
