import type { TimeSeriesRow } from '../db/types'

export interface Point {
  asOf: string
  value: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function toPoints(rows: TimeSeriesRow[]): Point[] {
  return rows.map((r) => ({ asOf: r.as_of, value: r.value }))
}

/**
 * Calendar-based YoY: for each point, find the closest prior point within
 * ±15 days of "exactly 1 year ago". Tolerates missing observations.
 */
export function yoy(points: Point[]): Point[] {
  if (points.length < 2) return []
  const sorted = [...points].sort((a, b) => a.asOf.localeCompare(b.asOf))
  const result: Point[] = []
  for (const cur of sorted) {
    const curTime = new Date(cur.asOf).getTime()
    const targetTime = curTime - 365 * DAY_MS
    const tol = 15 * DAY_MS
    let best: Point | null = null
    let bestDiff = Number.POSITIVE_INFINITY
    for (const p of sorted) {
      const t = new Date(p.asOf).getTime()
      if (t > curTime) break
      const diff = Math.abs(t - targetTime)
      if (diff < bestDiff) {
        bestDiff = diff
        best = p
      }
    }
    if (!best || bestDiff > tol || best.value === 0) continue
    result.push({
      asOf: cur.asOf,
      value: ((cur.value - best.value) / Math.abs(best.value)) * 100,
    })
  }
  return result
}

export function mom(points: Point[]): Point[] {
  if (points.length < 2) return []
  const result: Point[] = []
  for (let i = 1; i < points.length; i++) {
    const current = points[i]
    const prev = points[i - 1]
    if (!current || !prev || prev.value === 0) continue
    result.push({
      asOf: current.asOf,
      value: ((current.value - prev.value) / Math.abs(prev.value)) * 100,
    })
  }
  return result
}

export function momAnnualized(points: Point[]): Point[] {
  const monthly = mom(points)
  return monthly.map((p) => ({ asOf: p.asOf, value: (Math.pow(1 + p.value / 100, 12) - 1) * 100 }))
}

export function rollingMean(points: Point[], window: number): Point[] {
  if (points.length < window) return []
  const result: Point[] = []
  for (let i = window - 1; i < points.length; i++) {
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) {
      const p = points[j]
      if (!p) continue
      sum += p.value
    }
    const current = points[i]
    if (!current) continue
    result.push({ asOf: current.asOf, value: sum / window })
  }
  return result
}

export function streakBelow(points: Point[], threshold: number): number {
  let streak = 0
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]
    if (!p) break
    if (p.value < threshold) streak++
    else break
  }
  return streak
}

export function streakAbove(points: Point[], threshold: number): number {
  let streak = 0
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]
    if (!p) break
    if (p.value > threshold) streak++
    else break
  }
  return streak
}

export function sustainedBelow(points: Point[], threshold: number, months: number): boolean {
  if (points.length < months) return false
  return points.slice(-months).every((p) => p.value < threshold)
}

/**
 * Calendar-based sustained check: all points within the last N calendar days
 * must satisfy `value < threshold`. Returns false if no points exist in window.
 */
export function sustainedBelowCalendar(points: Point[], threshold: number, days: number): boolean {
  if (points.length === 0) return false
  const last = points[points.length - 1]
  if (!last) return false
  const cutoffMs = new Date(last.asOf).getTime() - days * DAY_MS
  const window = points.filter((p) => new Date(p.asOf).getTime() >= cutoffMs)
  if (window.length === 0) return false
  return window.every((p) => p.value < threshold)
}

export function pctBelow200dma(points: Point[]): number | null {
  if (points.length < 201) return null
  const last = points[points.length - 1]
  if (!last) return null
  // SMA over previous 200 points (excluding current)
  const window200 = points.slice(-201, -1)
  const sum = window200.reduce((a, p) => a + p.value, 0)
  const ma = sum / window200.length
  if (ma === 0) return null
  return ((last.value - ma) / ma) * 100
}

export function lastValue(points: Point[]): number | null {
  if (points.length === 0) return null
  const last = points[points.length - 1]
  return last ? last.value : null
}
