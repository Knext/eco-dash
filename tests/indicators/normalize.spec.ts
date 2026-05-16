import { describe, it, expect } from 'vitest'
import {
  yoy,
  mom,
  momAnnualized,
  rollingMean,
  streakBelow,
  sustainedBelow,
  sustainedBelowCalendar,
  pctBelow200dma,
  lastValue,
} from '@/lib/indicators/normalize'
import type { Point } from '@/lib/indicators/normalize'

function makeMonthlyPoints(values: number[], startYear = 2024): Point[] {
  return values.map((v, i) => {
    const year = startYear + Math.floor(i / 12)
    const month = (i % 12) + 1
    return { asOf: `${year}-${String(month).padStart(2, '0')}-01`, value: v }
  })
}

function makeDailyPoints(values: number[], startDate = '2024-01-01'): Point[] {
  const start = new Date(startDate).getTime()
  return values.map((v, i) => ({
    asOf: new Date(start + i * 86400_000).toISOString().slice(0, 10),
    value: v,
  }))
}

describe('normalize.yoy (calendar-based)', () => {
  it('returns empty for short series', () => {
    expect(yoy(makeMonthlyPoints([100, 101]))).toEqual([])
  })

  it('computes percent change vs ~1 year ago', () => {
    const pts = makeMonthlyPoints(Array.from({ length: 14 }, (_, i) => 100 + i))
    const r = yoy(pts)
    expect(r.length).toBeGreaterThan(0)
    expect(r[r.length - 1]?.value).toBeCloseTo(11.88, 1)
  })

  it('tolerates 1-month gap (still within ±15 days when matching closest)', () => {
    const pts: Point[] = [
      { asOf: '2024-01-15', value: 100 },
      { asOf: '2025-01-10', value: 110 }, // 5 days before exact 1y target
    ]
    const r = yoy(pts)
    expect(r.length).toBe(1)
    expect(r[0]?.value).toBeCloseTo(10, 5)
  })
})

describe('normalize.mom / momAnnualized', () => {
  it('mom computes 1-step percent change', () => {
    const pts = makeMonthlyPoints([100, 110, 99])
    const r = mom(pts)
    expect(r[0]?.value).toBeCloseTo(10, 5)
    expect(r[1]?.value).toBeCloseTo(-10, 5)
  })

  it('momAnnualized compounds 12x', () => {
    const pts = makeMonthlyPoints([100, 101])
    const r = momAnnualized(pts)
    const expected = (Math.pow(1.01, 12) - 1) * 100
    expect(r[0]?.value).toBeCloseTo(expected, 2)
  })
})

describe('normalize rollingMean / streak / sustained', () => {
  it('rollingMean window=3', () => {
    const pts = makeMonthlyPoints([1, 2, 3, 4, 5])
    const r = rollingMean(pts, 3)
    expect(r.length).toBe(3)
    expect(r[0]?.value).toBeCloseTo(2)
    expect(r[2]?.value).toBeCloseTo(4)
  })

  it('streakBelow counts trailing values below threshold', () => {
    const pts = makeMonthlyPoints([5, 4, -1, -2, -3])
    expect(streakBelow(pts, 0)).toBe(3)
  })

  it('sustainedBelow checks N most recent', () => {
    const pts = makeMonthlyPoints([5, -1, -2, -3])
    expect(sustainedBelow(pts, 0, 3)).toBe(true)
    expect(sustainedBelow(pts, 0, 4)).toBe(false)
  })

  it('sustainedBelowCalendar checks all points within last N days', () => {
    const pts = makeDailyPoints([-1, -2, -3, -1, -2], '2025-01-01')
    expect(sustainedBelowCalendar(pts, 0, 7)).toBe(true)
    const mixed: Point[] = [
      { asOf: '2025-01-01', value: -1 },
      { asOf: '2025-01-02', value: 1 },
      { asOf: '2025-01-03', value: -1 },
    ]
    expect(sustainedBelowCalendar(mixed, 0, 7)).toBe(false)
  })

  it('sustainedBelowCalendar returns false for empty window', () => {
    expect(sustainedBelowCalendar([], 0, 7)).toBe(false)
  })
})

describe('pctBelow200dma', () => {
  it('returns null when insufficient', () => {
    expect(pctBelow200dma(makeDailyPoints([1, 2, 3]))).toBeNull()
  })

  it('computes percent below 200-day SMA', () => {
    const values = Array.from({ length: 201 }, () => 100)
    values[200] = 90
    const pts = makeDailyPoints(values)
    const r = pctBelow200dma(pts)
    expect(r).toBeCloseTo(-10, 1)
  })
})

describe('lastValue', () => {
  it('returns last or null', () => {
    expect(lastValue(makeMonthlyPoints([1, 2, 3]))).toBe(3)
    expect(lastValue([])).toBeNull()
  })
})
