import { describe, it, expect } from 'vitest'
import { sustainedBelowCalendar, yoy } from '@/lib/indicators/normalize'
import type { Point } from '@/lib/indicators/normalize'

function makeDaily(values: number[], startDate: string): Point[] {
  const start = new Date(startDate).getTime()
  return values.map((v, i) => ({
    asOf: new Date(start + i * 86400_000).toISOString().slice(0, 10),
    value: v,
  }))
}

describe('RECESSION_COMPOSITE calendar window (6 months)', () => {
  it('passes when all points in last 180 days are < 0', () => {
    const v: number[] = []
    for (let i = 0; i < 200; i++) v.push(-0.5)
    const points = makeDaily(v, '2025-01-01')
    expect(sustainedBelowCalendar(points, 0, 180)).toBe(true)
  })

  it('fails if any point within last 180 days is >= 0', () => {
    const v = Array.from({ length: 200 }, () => -0.5)
    v[195] = 0.1
    const points = makeDaily(v, '2025-01-01')
    expect(sustainedBelowCalendar(points, 0, 180)).toBe(false)
  })

  it('returns false for insufficient history', () => {
    expect(sustainedBelowCalendar([], 0, 180)).toBe(false)
  })
})

describe('YoY calendar matching (tolerates missing months)', () => {
  it('matches closest point within 15 days of 1y ago', () => {
    const points: Point[] = [
      { asOf: '2024-03-01', value: 100 },
      { asOf: '2024-04-01', value: 101 },
      { asOf: '2025-03-05', value: 110 },
      { asOf: '2025-04-02', value: 112 },
    ]
    const result = yoy(points)
    expect(result.length).toBeGreaterThan(0)
    const apr = result.find((p) => p.asOf === '2025-04-02')
    expect(apr?.value).toBeCloseTo(((112 - 101) / 101) * 100, 2)
  })

  it('skips points without a match within ±15 days', () => {
    const points: Point[] = [
      { asOf: '2024-01-01', value: 100 },
      { asOf: '2025-04-01', value: 120 }, // ~90 days off
    ]
    const result = yoy(points)
    expect(result.length).toBe(0)
  })
})
